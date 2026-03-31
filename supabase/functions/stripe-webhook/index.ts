import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req: Request) => {
  const signature = req.headers.get("Stripe-Signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    console.error("[STRIPE-WEBHOOK] Missing signature or webhook secret");
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error(`[STRIPE-WEBHOOK] Signature verification failed: ${err.message}`);
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  console.log(`[STRIPE-WEBHOOK] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[STRIPE-WEBHOOK] Processing checkout.session.completed for session ${session.id}`);

        if (!session.subscription || !session.customer_email) {
          console.log("[STRIPE-WEBHOOK] No subscription or customer_email on session, skipping");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

        // Find the user by email -> profile -> organization
        const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
        const user = userData?.users?.find((u) => u.email === session.customer_email);

        if (!user) {
          console.error(`[STRIPE-WEBHOOK] No user found for email ${session.customer_email}`);
          break;
        }

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        if (!profile?.organization_id) {
          console.error(`[STRIPE-WEBHOOK] No organization found for user ${user.id}`);
          break;
        }

        const subItem = subscription.items.data[0];
        const upsertData = {
          organization_id: profile.organization_id,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          price_id: subItem?.price?.id ?? null,
          product_id: (subItem?.price?.product as string) ?? null,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        };

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .upsert(upsertData, { onConflict: "organization_id" });

        if (error) {
          console.error(`[STRIPE-WEBHOOK] Error upserting subscription: ${JSON.stringify(error)}`);
        } else {
          console.log(`[STRIPE-WEBHOOK] Successfully upserted subscription for org ${profile.organization_id}`);

          // Log activity event
          const planName = subItem?.price?.product
            ? (typeof subItem.price.product === "string" ? subItem.price.product : (subItem.price.product as any).name || "Unknown")
            : "Unknown";
          await supabaseAdmin.from("activity_events").insert({
            organization_id: profile.organization_id,
            event_type: "subscription_started",
            description: `Subscription activated on ${planName} plan`,
          });

          // Mark onboarding complete now that payment is confirmed
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({ onboarding_step: 5, onboarding_status: "complete" })
            .eq("user_id", user.id);

          if (profileError) {
            console.error(`[STRIPE-WEBHOOK] Error updating profile onboarding: ${JSON.stringify(profileError)}`);
          } else {
            console.log(`[STRIPE-WEBHOOK] Marked onboarding complete for user ${user.id}`);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[STRIPE-WEBHOOK] Processing customer.subscription.updated for ${subscription.id}`);

        const subItem = subscription.items.data[0];
        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: subscription.status,
            price_id: subItem?.price?.id ?? null,
            product_id: (subItem?.price?.product as string) ?? null,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error(`[STRIPE-WEBHOOK] Error updating subscription: ${JSON.stringify(error)}`);
        } else {
          console.log(`[STRIPE-WEBHOOK] Successfully updated subscription ${subscription.id}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[STRIPE-WEBHOOK] Processing customer.subscription.deleted for ${subscription.id}`);

        // Look up org before updating
        const { data: subRow } = await supabaseAdmin
          .from("subscriptions")
          .select("organization_id")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error(`[STRIPE-WEBHOOK] Error canceling subscription: ${JSON.stringify(error)}`);
        } else {
          console.log(`[STRIPE-WEBHOOK] Successfully canceled subscription ${subscription.id}`);
          if (subRow?.organization_id) {
            await supabaseAdmin.from("activity_events").insert({
              organization_id: subRow.organization_id,
              event_type: "subscription_cancelled",
              description: "Subscription cancelled",
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        console.log(`[STRIPE-WEBHOOK] Processing invoice.payment_failed for subscription ${subId}`);

        if (subId) {
          // Look up org before updating
          const { data: subRow } = await supabaseAdmin
            .from("subscriptions")
            .select("organization_id")
            .eq("stripe_subscription_id", subId)
            .single();

          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subId);

          if (error) {
            console.error(`[STRIPE-WEBHOOK] Error setting past_due: ${JSON.stringify(error)}`);
          } else {
            console.log(`[STRIPE-WEBHOOK] Successfully set subscription ${subId} to past_due`);
            if (subRow?.organization_id) {
              await supabaseAdmin.from("activity_events").insert({
                organization_id: subRow.organization_id,
                event_type: "payment_failed",
                description: "Payment failed — please update billing info",
              });
            }
          }
        }
        break;
      }

      default:
        console.log(`[STRIPE-WEBHOOK] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[STRIPE-WEBHOOK] Error processing event ${event.type}: ${err.message}`);
  }

  // Always return 200 to avoid Stripe retries
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
