import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { checkRateLimit, rateLimitJson } from "./_shared/rate-limit.js";

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded) && forwarded.length > 0) return forwarded[0];
  return req.socket?.remoteAddress || "unknown";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.APP_URL || "https://ruleshift.ai",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function setCors(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
}

// Server-side fallbacks mirror the client-side stripe-tiers.ts values so
// we can validate without forcing new env vars on day one.
const FALLBACK_PRODUCT_BASIC = "prod_U5aHbRwGTN7xrH";
const FALLBACK_PRODUCT_PROFESSIONAL = "prod_U5aIsM1EfFuyrj";
const FALLBACK_PRODUCT_ENTERPRISE = "prod_U5aIAlewBWuFxK";

const ALLOWED_PRODUCT_IDS = new Set([
  process.env.STRIPE_PRODUCT_BASIC || FALLBACK_PRODUCT_BASIC,
  process.env.STRIPE_PRODUCT_PROFESSIONAL || FALLBACK_PRODUCT_PROFESSIONAL,
  process.env.STRIPE_PRODUCT_ENTERPRISE || FALLBACK_PRODUCT_ENTERPRISE,
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const supabaseClient = createClient(
    process.env.SUPABASE_URL ?? "",
    process.env.SUPABASE_ANON_KEY ?? ""
  );

  try {
    const authHeader = req.headers.authorization!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const rlIdentifier = user.id || `ip:${getClientIp(req)}`;
    const rl = await checkRateLimit(rlIdentifier, "create-checkout", 10, 3600);
    if (!rl.allowed) {
      const rlInfo = rateLimitJson(rl.reset_at);
      return res.setHeader("Retry-After", rlInfo.retryAfter).status(429).json(rlInfo.body);
    }

    const { priceId } = req.body;
    if (!priceId || typeof priceId !== "string") {
      return res.status(400).json({ error: "priceId is required" });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2025-08-27.basil" as any,
    });

    // Validate the priceId against our approved products BEFORE creating
    // any Stripe Checkout session. Without this, a user could pass any
    // Stripe price ID from the account (e.g. a hidden $1 test price on
    // the Enterprise product) and pay a fraction of the real amount.
    let price: Stripe.Price;
    try {
      price = await stripe.prices.retrieve(priceId);
    } catch {
      return res.status(400).json({ error: "Invalid plan" });
    }
    const productId = typeof price.product === "string" ? price.product : price.product?.id;
    if (!productId || !ALLOWED_PRODUCT_IDS.has(productId)) {
      console.warn(`[create-checkout] user ${user.id} tried to use non-approved priceId ${priceId} (product ${productId})`);
      return res.status(400).json({ error: "Invalid plan" });
    }

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      // Pass the Supabase user id through Stripe so the webhook can map
      // the session back to the user without a reverse email lookup.
      // This is both faster and immune to email changes between checkout
      // start and webhook delivery.
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 14,
        metadata: { supabase_user_id: user.id },
      },
      metadata: { supabase_user_id: user.id },
      payment_method_collection: "always",
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/onboarding/plan?checkout=canceled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("[create-checkout] error:", error.message);
    return res.status(500).json({ error: "Checkout creation failed" });
  }
}
