import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { checkRateLimit, rateLimitJson } from "./_shared/rate-limit.js";

// ---------------------------------------------------------------------------
// CORS + config
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.APP_URL || "https://ruleshift.ai",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function setCors(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
}

// ---------------------------------------------------------------------------
// Tier limits
// ---------------------------------------------------------------------------

import { getOrgTier, MEMBER_LIMITS } from "./_shared/tier.js";

async function getMemberLimit(_adminClient: SupabaseClient, orgId: string): Promise<number> {
  const tier = await getOrgTier(orgId);
  return MEMBER_LIMITS[tier];
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

interface AuthContext {
  userId: string;
  userEmail: string | null;
  orgId: string | null;
  /** Role of the caller inside their org, if they have one. */
  role: string | null;
}

async function loadAuthContext(
  token: string,
  adminClient: SupabaseClient
): Promise<AuthContext | null> {
  const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData?.user) return null;

  const userId = userData.user.id;
  const userEmail = userData.user.email ?? null;

  const { data: profile } = await adminClient
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();

  const orgId = profile?.organization_id ?? null;

  let role: string | null = null;
  if (orgId) {
    const { data: membership } = await adminClient
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .not("accepted_at", "is", null)
      .maybeSingle();
    role = membership?.role ?? null;
  }

  return { userId, userEmail, orgId, role };
}

function requireAdmin(ctx: AuthContext): string | null {
  if (!ctx.orgId) return "No organization found";
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return "Only admins and owners can manage the team";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Invite email (best-effort)
// ---------------------------------------------------------------------------

async function sendInviteEmail(params: {
  email: string;
  role: string;
  organizationName: string;
  inviterName: string | null;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[manage-team] RESEND_API_KEY missing — skipping invite email");
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = process.env.APP_URL || "https://ruleshift.ai";
    const acceptUrl = `${appUrl}/accept-invite?email=${encodeURIComponent(params.email)}`;
    const inviter = params.inviterName ? `${params.inviterName} has` : "You've been";

    await resend.emails.send({
      from: "RuleShift <invites@ruleshift.app>",
      to: params.email,
      subject: `You've been invited to ${params.organizationName} on RuleShift`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
          <h1 style="font-size: 22px; margin: 0 0 12px 0;">You're invited to RuleShift</h1>
          <p style="font-size: 15px; line-height: 1.5; color: #374151;">
            ${inviter} invited you to join
            <strong>${escapeHtml(params.organizationName)}</strong> as a <strong>${escapeHtml(params.role)}</strong>.
          </p>
          <p style="margin: 24px 0;">
            <a href="${acceptUrl}" style="display: inline-block; background: #1a1f3a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Accept invitation
            </a>
          </p>
          <p style="font-size: 13px; color: #6b7280;">
            If the button doesn't work, copy and paste this URL into your browser:<br>
            <span style="color: #4b5563;">${acceptUrl}</span>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[manage-team] sendInviteEmail failed:", err);
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#039;";
      default: return m;
    }
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.replace("Bearer ", "");

    const adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const ctx = await loadAuthContext(token, adminClient);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const { action, ...body } = req.body ?? {};

    // Rate limit per user regardless of action (30/hour).
    const rl = await checkRateLimit(ctx.userId, "manage-team", 30, 3600);
    if (!rl.allowed) {
      const rlInfo = rateLimitJson(rl.reset_at);
      return res.setHeader("Retry-After", rlInfo.retryAfter).status(429).json(rlInfo.body);
    }

    switch (action) {
      // ---------------------------------------------------------------------
      // check_invite — AcceptInvite.tsx calls this after the user logs in
      // to discover any pending invitation for their email.
      // ---------------------------------------------------------------------
      case "check_invite": {
        if (!ctx.userEmail) {
          return res.status(200).json({ found: false });
        }

        const { data: invite, error: inviteErr } = await adminClient
          .from("organization_members")
          .select("id, organization_id, role, organizations!inner(name)")
          .ilike("invited_email", ctx.userEmail)
          .is("user_id", null)
          .is("accepted_at", null)
          .order("invited_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (inviteErr) {
          console.error("[manage-team] check_invite query failed:", inviteErr);
          return res.status(500).json({ error: "Failed to look up invitation" });
        }

        if (!invite) return res.status(200).json({ found: false });

        const orgName =
          (invite.organizations as any)?.name ?? "your new organization";

        return res.status(200).json({
          found: true,
          invite: {
            id: invite.id,
            organization_id: invite.organization_id,
            organization_name: orgName,
            role: invite.role,
          },
        });
      }

      // ---------------------------------------------------------------------
      // accept_invite — user clicks "Accept" in the UI. Marks the row as
      // accepted, points their profile at the new org, and marks onboarding
      // complete so they land on the dashboard.
      // ---------------------------------------------------------------------
      case "accept_invite": {
        const { invite_id } = body;
        if (!invite_id || typeof invite_id !== "string") {
          return res.status(400).json({ error: "invite_id is required" });
        }
        if (!ctx.userEmail) {
          return res.status(400).json({ error: "User has no email" });
        }

        const { data: invite, error: inviteErr } = await adminClient
          .from("organization_members")
          .select("id, organization_id, role, invited_email, user_id, accepted_at")
          .eq("id", invite_id)
          .maybeSingle();

        if (inviteErr || !invite) {
          return res.status(404).json({ error: "Invitation not found" });
        }
        if (invite.accepted_at || invite.user_id) {
          return res.status(409).json({ error: "Invitation already accepted" });
        }

        // Case-insensitive email match so "Alec@X.com" invites can be
        // accepted by a user signed up with "alec@x.com".
        if (
          !invite.invited_email ||
          invite.invited_email.toLowerCase() !== ctx.userEmail.toLowerCase()
        ) {
          return res.status(403).json({ error: "This invitation is not for you" });
        }

        // Fill in the accepting user. RLS is bypassed via the admin client.
        const { error: acceptErr } = await adminClient
          .from("organization_members")
          .update({
            user_id: ctx.userId,
            accepted_at: new Date().toISOString(),
          })
          .eq("id", invite.id);

        if (acceptErr) {
          console.error("[manage-team] accept update failed:", acceptErr);
          return res.status(500).json({ error: "Failed to accept invitation" });
        }

        // Point the user's profile at the invited org and mark onboarding
        // complete so ProtectedRoute doesn't bounce them through the
        // company/sources/notifications onboarding flow.
        const { error: profileErr } = await adminClient
          .from("profiles")
          .update({
            organization_id: invite.organization_id,
            onboarding_status: "complete",
            onboarding_step: 5,
          })
          .eq("user_id", ctx.userId);

        if (profileErr) {
          console.error("[manage-team] profile update after accept failed:", profileErr);
        }

        const { error: auditErr } = await adminClient.from("audit_log").insert({
          organization_id: invite.organization_id,
          user_id: ctx.userId,
          action: "member_joined",
          user_email: ctx.userEmail,
          resource_type: "team_member",
          resource_id: invite.id,
          resource_name: ctx.userEmail,
          details: `User accepted invitation and joined as ${invite.role}`,
        });
        if (auditErr) {
          console.error("[manage-team] audit_log insert failed (member_joined):", auditErr);
        }

        return res.status(200).json({
          success: true,
          organization_id: invite.organization_id,
          role: invite.role,
        });
      }

      // ---------------------------------------------------------------------
      // list_members — Team tab view
      // ---------------------------------------------------------------------
      case "list_members": {
        if (!ctx.orgId) {
          return res.status(200).json({ members: [], memberLimit: DEFAULT_MEMBER_LIMIT });
        }

        const { data: rows, error: listErr } = await adminClient
          .from("organization_members")
          .select("id, user_id, role, invited_email, invited_at, accepted_at")
          .eq("organization_id", ctx.orgId)
          .order("invited_at", { ascending: true });

        if (listErr) {
          console.error("[manage-team] list_members failed:", listErr);
          return res.status(500).json({ error: "Failed to list members" });
        }

        // Enrich with full_name from profiles for accepted members.
        const userIds = (rows ?? []).map((r) => r.user_id).filter(Boolean) as string[];
        let profileMap = new Map<string, string | null>();
        if (userIds.length > 0) {
          const { data: profiles } = await adminClient
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", userIds);
          profileMap = new Map(
            (profiles ?? []).map((p) => [p.user_id as string, p.full_name as string | null])
          );
        }

        const members = (rows ?? []).map((r) => ({
          id: r.id,
          user_id: r.user_id,
          role: r.role,
          invited_email: r.invited_email,
          invited_at: r.invited_at,
          accepted_at: r.accepted_at,
          full_name: r.user_id ? profileMap.get(r.user_id) ?? null : null,
        }));

        const memberLimit = await getMemberLimit(adminClient, ctx.orgId);
        return res.status(200).json({ members, memberLimit });
      }

      // ---------------------------------------------------------------------
      // invite — Team tab: admin adds a new member by email
      // ---------------------------------------------------------------------
      case "invite": {
        const forbidden = requireAdmin(ctx);
        if (forbidden) return res.status(403).json({ error: forbidden });

        const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const role = typeof body.role === "string" ? body.role : "member";

        if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
          return res.status(400).json({ error: "Valid email is required" });
        }
        if (role !== "member" && role !== "admin") {
          return res.status(400).json({ error: "Role must be 'member' or 'admin'" });
        }
        if (!ctx.orgId) {
          return res.status(400).json({ error: "No organization context" });
        }

        // Enforce member limit (accepted + pending).
        const memberLimit = await getMemberLimit(adminClient, ctx.orgId);
        const { count: existingCount } = await adminClient
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", ctx.orgId);
        if ((existingCount ?? 0) >= memberLimit) {
          return res.status(403).json({
            error: `Team member limit reached (${memberLimit}). Upgrade to add more.`,
          });
        }

        // Reject duplicate invites / already-member.
        const { data: existing } = await adminClient
          .from("organization_members")
          .select("id, accepted_at")
          .eq("organization_id", ctx.orgId)
          .ilike("invited_email", rawEmail)
          .maybeSingle();
        if (existing) {
          return res.status(409).json({
            error: existing.accepted_at ? "User is already a team member" : "Invitation already sent",
          });
        }

        const { data: inserted, error: insertErr } = await adminClient
          .from("organization_members")
          .insert({
            organization_id: ctx.orgId,
            invited_email: rawEmail,
            role,
            invited_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertErr || !inserted?.id) {
          console.error("[manage-team] invite insert failed:", insertErr);
          return res.status(500).json({ error: "Failed to create invitation" });
        }

        // Race-condition guard: recount after insert; if we overshot, roll
        // back. Two parallel invites could both pass the limit check.
        const { count: finalCount } = await adminClient
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", ctx.orgId);
        if ((finalCount ?? 0) > memberLimit) {
          await adminClient.from("organization_members").delete().eq("id", inserted.id);
          return res.status(403).json({
            error: `Team member limit reached (${memberLimit}). Upgrade to add more.`,
          });
        }

        // Look up the inviter's name + org name for the email.
        const { data: inviterProfile } = await adminClient
          .from("profiles")
          .select("full_name")
          .eq("user_id", ctx.userId)
          .maybeSingle();
        const { data: org } = await adminClient
          .from("organizations")
          .select("name")
          .eq("id", ctx.orgId)
          .maybeSingle();

        // Fire-and-awaited email — the email failure should NOT hide the
        // invite creation success, but we await so Vercel doesn't kill the
        // in-flight fetch.
        await sendInviteEmail({
          email: rawEmail,
          role,
          organizationName: org?.name ?? "your team",
          inviterName: inviterProfile?.full_name ?? null,
        });

        const { error: auditErr } = await adminClient.from("audit_log").insert({
          organization_id: ctx.orgId,
          user_id: ctx.userId,
          action: "member_invited",
          user_email: ctx.userEmail,
          resource_type: "team_member",
          resource_id: inserted.id,
          resource_name: rawEmail,
          details: `Invited as ${role}`,
        });
        if (auditErr) {
          console.error("[manage-team] audit_log insert failed (member_invited):", auditErr);
        }

        return res.status(200).json({ success: true, member_id: inserted.id });
      }

      // ---------------------------------------------------------------------
      // remove_member
      // ---------------------------------------------------------------------
      case "remove_member": {
        const forbidden = requireAdmin(ctx);
        if (forbidden) return res.status(403).json({ error: forbidden });

        const { member_id } = body;
        if (!member_id || typeof member_id !== "string") {
          return res.status(400).json({ error: "member_id is required" });
        }
        if (!ctx.orgId) {
          return res.status(400).json({ error: "No organization context" });
        }

        // Verify the row belongs to the caller's org before deleting.
        const { data: target } = await adminClient
          .from("organization_members")
          .select("id, organization_id, role, user_id, invited_email")
          .eq("id", member_id)
          .maybeSingle();

        if (!target || target.organization_id !== ctx.orgId) {
          return res.status(404).json({ error: "Member not found" });
        }

        // Don't let an owner remove themselves if they're the last owner —
        // the org would be stranded.
        if (target.user_id === ctx.userId && target.role === "owner") {
          const { count: ownerCount } = await adminClient
            .from("organization_members")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", ctx.orgId)
            .eq("role", "owner");
          if ((ownerCount ?? 0) <= 1) {
            return res.status(400).json({
              error: "You cannot remove the last owner. Transfer ownership first.",
            });
          }
        }

        const { error: deleteErr } = await adminClient
          .from("organization_members")
          .delete()
          .eq("id", member_id);
        if (deleteErr) {
          console.error("[manage-team] remove_member delete failed:", deleteErr);
          return res.status(500).json({ error: "Failed to remove member" });
        }

        const { error: auditErr } = await adminClient.from("audit_log").insert({
          organization_id: ctx.orgId,
          user_id: ctx.userId,
          action: "member_removed",
          user_email: ctx.userEmail,
          resource_type: "team_member",
          resource_id: member_id,
          resource_name: target.invited_email,
          details: `Removed from organization`,
        });
        if (auditErr) {
          console.error("[manage-team] audit_log insert failed (member_removed):", auditErr);
        }

        return res.status(200).json({ success: true });
      }

      // ---------------------------------------------------------------------
      // update_role
      // ---------------------------------------------------------------------
      case "update_role": {
        const forbidden = requireAdmin(ctx);
        if (forbidden) return res.status(403).json({ error: forbidden });

        const { member_id, role } = body;
        if (!member_id || typeof member_id !== "string") {
          return res.status(400).json({ error: "member_id is required" });
        }
        if (role !== "member" && role !== "admin" && role !== "owner") {
          return res.status(400).json({ error: "Role must be 'member', 'admin', or 'owner'" });
        }
        if (!ctx.orgId) {
          return res.status(400).json({ error: "No organization context" });
        }

        const { data: target } = await adminClient
          .from("organization_members")
          .select("id, organization_id, invited_email")
          .eq("id", member_id)
          .maybeSingle();
        if (!target || target.organization_id !== ctx.orgId) {
          return res.status(404).json({ error: "Member not found" });
        }

        const { error: updateErr } = await adminClient
          .from("organization_members")
          .update({ role })
          .eq("id", member_id);
        if (updateErr) {
          console.error("[manage-team] update_role failed:", updateErr);
          return res.status(500).json({ error: "Failed to update role" });
        }

        const { error: auditErr } = await adminClient.from("audit_log").insert({
          organization_id: ctx.orgId,
          user_id: ctx.userId,
          action: "member_role_updated",
          user_email: ctx.userEmail,
          resource_type: "team_member",
          resource_id: member_id,
          resource_name: target.invited_email,
          details: `Role changed to ${role}`,
        });
        if (auditErr) {
          console.error("[manage-team] audit_log insert failed (member_role_updated):", auditErr);
        }

        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error("[manage-team] unhandled error:", err);
    return res.status(500).json({ error: (err as Error).message ?? "Internal error" });
  }
}
