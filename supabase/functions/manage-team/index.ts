import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MEMBER_LIMITS: Record<string, number> = {
  "prod_U5aHbRwGTN7xrH": 1,    // Basic
  "prod_U5aIsM1EfFuyrj": 5,    // Professional
  "prod_U5aIAlewBWuFxK": 9999, // Enterprise (unlimited)
};
const DEFAULT_MEMBER_LIMIT = 1;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = user.id;
    const userEmail = user.email!;

    // Get the user's organization
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", userId)
      .single();

    const body = await req.json();
    const { action } = body;

    // Actions that don't require an existing org membership
    if (action === "check_invite") {
      const { data: invite, error } = await adminClient
        .from("organization_members")
        .select("id, organization_id, invited_email, role")
        .eq("invited_email", userEmail.toLowerCase())
        .is("user_id", null)
        .is("accepted_at", null)
        .maybeSingle();

      if (error) throw error;
      if (!invite) return json({ found: false });

      const { data: org } = await adminClient
        .from("organizations")
        .select("name")
        .eq("id", invite.organization_id)
        .single();

      return json({
        found: true,
        invite: {
          id: invite.id,
          organization_id: invite.organization_id,
          organization_name: org?.name ?? "Unknown",
          role: invite.role,
        },
      });
    }

    if (action === "accept_invite") {
      const { invite_id } = body;
      if (!invite_id) return json({ error: "invite_id is required" }, 400);

      const { data: invite, error: invErr } = await adminClient
        .from("organization_members")
        .select("id, organization_id, invited_email")
        .eq("id", invite_id)
        .is("user_id", null)
        .is("accepted_at", null)
        .single();

      if (invErr || !invite) {
        return json({ error: "Invite not found or already accepted" }, 404);
      }

      if (invite.invited_email?.toLowerCase() !== userEmail.toLowerCase()) {
        return json({ error: "This invite is for a different email address" }, 403);
      }

      const { error: updateErr } = await adminClient
        .from("organization_members")
        .update({ user_id: userId, accepted_at: new Date().toISOString() })
        .eq("id", invite_id);
      if (updateErr) throw updateErr;

      const { error: profileErr } = await adminClient
        .from("profiles")
        .update({
          organization_id: invite.organization_id,
          onboarding_status: "complete",
          onboarding_step: 5,
        })
        .eq("user_id", userId);
      if (profileErr) throw profileErr;

      const { data: org } = await adminClient
        .from("organizations")
        .select("name")
        .eq("id", invite.organization_id)
        .single();

      // Log activity
      const memberName = user?.user_metadata?.full_name || userEmail;
      await adminClient.from("activity_events").insert({
        organization_id: invite.organization_id,
        event_type: "member_joined",
        description: `${memberName} joined the team`,
      });

      return json({
        success: true,
        organization_id: invite.organization_id,
        organization_name: org?.name ?? "Unknown",
      });
    }

    // All remaining actions require an org
    if (profileError || !profile?.organization_id) {
      return json({ error: "No organization found. Please complete onboarding." }, 403);
    }
    const orgId = profile.organization_id;

    // Rate limit: 30 per org per hour
    const rl = await checkRateLimit(orgId, "manage-team", 30, 3600);
    if (!rl.allowed) return rateLimitResponse(rl.reset_at, corsHeaders);

    // Helper: get caller's membership
    const { data: callerMembership } = await adminClient
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .not("accepted_at", "is", null)
      .single();

    if (!callerMembership) {
      return json({ error: "You are not an active member of this organization" }, 403);
    }

    const callerRole = callerMembership.role;
    const isOwner = callerRole === "owner";
    const isAdminOrOwner = callerRole === "owner" || callerRole === "admin";

    switch (action) {
      case "invite": {
        if (!isAdminOrOwner) {
          return json({ error: "Only owners and admins can invite members" }, 403);
        }

        const { email, role = "member" } = body;
        if (!email || typeof email !== "string") {
          return json({ error: "email is required" }, 400);
        }
        if (!["member", "admin"].includes(role)) {
          return json({ error: "role must be 'member' or 'admin'" }, 400);
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check for duplicate invite or existing member
        const { data: existing } = await adminClient
          .from("organization_members")
          .select("id, user_id, accepted_at")
          .eq("organization_id", orgId)
          .eq("invited_email", normalizedEmail)
          .maybeSingle();

        if (existing) {
          return json({
            error: existing.accepted_at
              ? "This user is already a member of your organization"
              : "An invitation has already been sent to this email",
          }, 409);
        }

        // Also check if someone with this email is already a member via user_id
        const { data: existingByUser } = await adminClient.auth.admin.listUsers();
        const matchedUser = existingByUser?.users?.find(
          (u: any) => u.email?.toLowerCase() === normalizedEmail
        );
        if (matchedUser) {
          const { data: memberByUid } = await adminClient
            .from("organization_members")
            .select("id")
            .eq("organization_id", orgId)
            .eq("user_id", matchedUser.id)
            .maybeSingle();
          if (memberByUid) {
            return json({ error: "This user is already a member of your organization" }, 409);
          }
        }

        // Check member count against plan limit
        const memberLimit = await getMemberLimit(adminClient, orgId);
        const { count, error: countErr } = await adminClient
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId);
        if (countErr) throw countErr;

        if ((count ?? 0) >= memberLimit) {
          return json({
            error: `Your plan allows up to ${memberLimit} team member(s). Please upgrade to add more.`,
          }, 403);
        }

        // Insert pending invite
        const { error: insertErr } = await adminClient
          .from("organization_members")
          .insert({
            organization_id: orgId,
            invited_email: normalizedEmail,
            role,
          });
        if (insertErr) throw insertErr;

        await adminClient.from("activity_events").insert({
          organization_id: orgId,
          event_type: "member_invited",
          description: `Invited ${normalizedEmail} as ${role}`,
        });

        await adminClient.from("audit_log").insert({
          organization_id: orgId,
          user_id: userId,
          action: "member_invited",
          user_email: userEmail,
          resource_type: "member",
          resource_name: normalizedEmail,
          details: `Invited ${normalizedEmail} as ${role}`,
        }).then(() => {});

        return json({ success: true, invited_email: normalizedEmail });
      }

      case "list_members": {
        const { data: members, error } = await adminClient
          .from("organization_members")
          .select("id, user_id, role, invited_email, invited_at, accepted_at")
          .eq("organization_id", orgId)
          .order("invited_at", { ascending: true });
        if (error) throw error;

        // Fetch profile names for accepted members
        const acceptedUserIds = (members ?? [])
          .filter((m: any) => m.user_id)
          .map((m: any) => m.user_id);

        let profileMap: Record<string, string> = {};
        if (acceptedUserIds.length > 0) {
          const { data: profiles } = await adminClient
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", acceptedUserIds);
          for (const p of profiles ?? []) {
            profileMap[p.user_id] = p.full_name ?? "";
          }
        }

        const enriched = (members ?? []).map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          invited_email: m.invited_email,
          invited_at: m.invited_at,
          accepted_at: m.accepted_at,
          full_name: m.user_id ? (profileMap[m.user_id] ?? null) : null,
        }));

        const memberLimit = await getMemberLimit(adminClient, orgId);

        return json({ members: enriched, memberLimit });
      }

      case "remove_member": {
        if (!isAdminOrOwner) {
          return json({ error: "Only owners and admins can remove members" }, 403);
        }

        const { member_id } = body;
        if (!member_id) return json({ error: "member_id is required" }, 400);

        // Get the target member
        const { data: target, error: targetErr } = await adminClient
          .from("organization_members")
          .select("id, role, user_id")
          .eq("id", member_id)
          .eq("organization_id", orgId)
          .single();

        if (targetErr || !target) {
          return json({ error: "Member not found" }, 404);
        }

        // Prevent removing the last owner
        if (target.role === "owner") {
          const { count } = await adminClient
            .from("organization_members")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .eq("role", "owner")
            .not("accepted_at", "is", null);
          if ((count ?? 0) <= 1) {
            return json({ error: "Cannot remove the last owner of the organization" }, 400);
          }
        }

        // Admins cannot remove owners
        if (callerRole === "admin" && target.role === "owner") {
          return json({ error: "Admins cannot remove owners" }, 403);
        }

        const { error: delErr } = await adminClient
          .from("organization_members")
          .delete()
          .eq("id", member_id)
          .eq("organization_id", orgId);
        if (delErr) throw delErr;

        // Log activity
        const removedEmail = target.user_id
          ? ((await adminClient.auth.admin.getUserById(target.user_id))?.data?.user?.email || "Unknown")
          : "Unknown";
        await adminClient.from("activity_events").insert({
          organization_id: orgId,
          event_type: "member_removed",
          description: `Removed ${removedEmail} from team`,
        });

        await adminClient.from("audit_log").insert({
          organization_id: orgId,
          user_id: userId,
          action: "member_removed",
          user_email: userEmail,
          resource_type: "member",
          resource_name: removedEmail,
          details: `Removed ${removedEmail} from team`,
        }).then(() => {});

        // Clear the removed user's org reference if they were accepted
        if (target.user_id) {
          await adminClient
            .from("profiles")
            .update({ organization_id: null })
            .eq("user_id", target.user_id);
        }

        return json({ success: true });
      }

      case "update_role": {
        if (!isOwner) {
          return json({ error: "Only owners can change member roles" }, 403);
        }

        const { member_id, role } = body;
        if (!member_id || !role) {
          return json({ error: "member_id and role are required" }, 400);
        }
        if (!["owner", "admin", "member"].includes(role)) {
          return json({ error: "role must be 'owner', 'admin', or 'member'" }, 400);
        }

        const { data: target, error: targetErr } = await adminClient
          .from("organization_members")
          .select("id, role")
          .eq("id", member_id)
          .eq("organization_id", orgId)
          .single();

        if (targetErr || !target) {
          return json({ error: "Member not found" }, 404);
        }

        // Prevent demoting the last owner
        if (target.role === "owner" && role !== "owner") {
          const { count } = await adminClient
            .from("organization_members")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .eq("role", "owner")
            .not("accepted_at", "is", null);
          if ((count ?? 0) <= 1) {
            return json({ error: "Cannot demote the last owner" }, 400);
          }
        }

        const { error: updateErr } = await adminClient
          .from("organization_members")
          .update({ role })
          .eq("id", member_id)
          .eq("organization_id", orgId);
        if (updateErr) throw updateErr;

        // Log activity
        const targetUser = target.user_id
          ? ((await adminClient.auth.admin.getUserById(target.user_id))?.data?.user?.email || "Unknown")
          : "Unknown";
        await adminClient.from("activity_events").insert({
          organization_id: orgId,
          event_type: "role_changed",
          description: `Changed ${targetUser} role to ${role}`,
        });

        return json({ success: true });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("manage-team error:", err);
    return json({ error: (err as Error).message ?? "Internal error" }, 500);
  }
});

async function getMemberLimit(
  adminClient: ReturnType<typeof createClient>,
  orgId: string
): Promise<number> {
  const { data, error } = await adminClient
    .from("subscriptions")
    .select("status, product_id")
    .eq("organization_id", orgId)
    .single();

  if (error || !data) return DEFAULT_MEMBER_LIMIT;
  if (!["active", "trialing"].includes(data.status)) return DEFAULT_MEMBER_LIMIT;
  return MEMBER_LIMITS[data.product_id ?? ""] ?? DEFAULT_MEMBER_LIMIT;
}
