import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitJson } from "./_shared/rate-limit.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function setCors(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
}

const TIER_MEMBER_LIMITS: Record<string, number> = {
  "prod_U5aHbRwGTN7xrH": 1,
  "prod_U5aIsM1EfFuyrj": 5,
  "prod_U5aIAlewBWuFxK": 9999,
};
const DEFAULT_MEMBER_LIMIT = 1;

async function getMemberLimit(orgId: string): Promise<number> {
  const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await adminClient
    .from("subscriptions")
    .select("status, product_id")
    .eq("organization_id", orgId)
    .single();
  if (error || !data) return DEFAULT_MEMBER_LIMIT;
  if (!["active", "trialing"].includes(data.status)) return DEFAULT_MEMBER_LIMIT;
  return TIER_MEMBER_LIMITS[data.product_id ?? ""] ?? DEFAULT_MEMBER_LIMIT;
}

async function getOrgIdFromToken(token: string): Promise<string | null> {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .single();
  if (profileError || !profile?.organization_id) return null;
  return profile.organization_id;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { action, ...body } = req.body;

    switch (action) {
      case "check_invite": {
        const { invite_code } = body;
        if (!invite_code) return res.status(400).json({ error: "invite_code is required" });

        const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: invite, error } = await adminClient
          .from("team_invites")
          .select("id, organization_id, email, role, created_at, expires_at")
          .eq("code", invite_code)
          .single();

        if (error || !invite) {
          return res.status(404).json({ error: "Invite not found or has expired" });
        }

        const now = new Date();
        if (invite.expires_at && new Date(invite.expires_at) < now) {
          return res.status(410).json({ error: "Invite has expired" });
        }

        return res.status(200).json({
          invite: {
            code: invite_code,
            organization_id: invite.organization_id,
            email: invite.email,
            role: invite.role,
            created_at: invite.created_at,
          },
        });
      }

      case "accept_invite": {
        const { invite_code } = body;
        if (!invite_code) return res.status(400).json({ error: "invite_code is required" });

        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (userError || !userData?.user) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        const userId = userData.user.id;
        const userEmail = userData.user.email;

        const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: invite, error: invErr } = await adminClient
          .from("team_invites")
          .select("id, organization_id, email, role, expires_at")
          .eq("code", invite_code)
          .single();

        if (invErr || !invite) {
          return res.status(404).json({ error: "Invite not found or has expired" });
        }

        const now = new Date();
        if (invite.expires_at && new Date(invite.expires_at) < now) {
          return res.status(410).json({ error: "Invite has expired" });
        }

        if (userEmail?.toLowerCase() !== invite.email.toLowerCase()) {
          return res.status(403).json({ error: "This invite was sent to a different email address" });
        }

        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("user_id", userId)
          .single();

        if (existingProfile?.organization_id) {
          return res.status(400).json({ error: "User already belongs to an organization. Please leave your current organization first." });
        }

        const { error: updateErr } = await supabase
          .from("profiles")
          .update({ organization_id: invite.organization_id, role: invite.role })
          .eq("user_id", userId);
        if (updateErr) throw updateErr;

        const { error: delErr } = await adminClient
          .from("team_invites")
          .delete()
          .eq("code", invite_code);
        if (delErr) throw delErr;

        await adminClient.from("activity_events").insert({
          organization_id: invite.organization_id,
          event_type: "member_joined",
          description: `${userEmail} accepted team invitation and joined as ${invite.role}`,
        });

        await adminClient.from("audit_log").insert({
          organization_id: invite.organization_id,
          user_id: userId,
          action: "member_joined",
          user_email: userEmail ?? null,
          resource_type: "team_member",
          resource_name: userEmail || null,
          details: `User accepted invitation and joined as ${invite.role}`,
        }).then(() => {});

        return res.status(200).json({
          success: true,
          organization_id: invite.organization_id,
          role: invite.role,
        });
      }

      case "invite": {
        const { email, role } = body;
        if (!email || !role) {
          return res.status(400).json({ error: "email and role are required" });
        }

        const orgId = await getOrgIdFromToken(token);
        if (!orgId) {
          return res.status(403).json({ error: "No organization found. Please complete onboarding." });
        }

        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        const { data: userData } = await supabase.auth.getUser(token);
        const requesterId = userData?.user?.id;
        const requesterEmail = userData?.user?.email;

        const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: requesterProfile } = await adminClient
          .from("profiles")
          .select("role")
          .eq("user_id", requesterId)
          .single();

        if (requesterProfile?.role !== "owner" && requesterProfile?.role !== "admin") {
          return res.status(403).json({ error: "Only owners and admins can invite team members" });
        }

        const { count, error: countErr } = await adminClient
          .from("profiles")
          .select("user_id", { count: "exact", head: true })
          .eq("organization_id", orgId);
        if (countErr) throw countErr;

        const memberLimit = await getMemberLimit(orgId);
        if ((count ?? 0) + 1 > memberLimit) {
          return res.status(403).json({
            error: `Member limit reached. Your current plan allows up to ${memberLimit} team members.`,
          });
        }

        const inviteCode = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { error: insertErr } = await adminClient.from("team_invites").insert({
          organization_id: orgId,
          email: email.toLowerCase(),
          code: inviteCode,
          role,
          expires_at: expiresAt.toISOString(),
        });
        if (insertErr) throw insertErr;

        await adminClient.from("activity_events").insert({
          organization_id: orgId,
          event_type: "member_invited",
          description: `Invited ${email} as ${role}`,
        });

        await adminClient.from("audit_log").insert({
          organization_id: orgId,
          user_id: requesterId,
          action: "member_invited",
          user_email: requesterEmail ?? null,
          resource_type: "team_member",
          resource_name: email,
          details: `Invited as ${role}`,
        }).then(() => {});

        return res.status(200).json({
          success: true,
          invite_code: inviteCode,
          expires_at: expiresAt.toISOString(),
        });
      }

      case "list_members": {
        const orgId = await getOrgIdFromToken(token);
        if (!orgId) {
          return res.status(403).json({ error: "No organization found. Please complete onboarding." });
        }

        const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: members, error } = await adminClient
          .from("profiles")
          .select("user_id, email:auth.users(email), role, created_at")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        const memberList = (members ?? []).map((m: any) => ({
          user_id: m.user_id,
          email: m.email?.[0]?.email || "unknown",
          role: m.role || "member",
          joined_at: m.created_at,
        }));

        const { data: invites } = await adminClient
          .from("team_invites")
          .select("email, role, created_at, expires_at")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false });

        const pendingInvites = (invites ?? []).map((inv: any) => ({
          email: inv.email,
          role: inv.role,
          invited_at: inv.created_at,
          expires_at: inv.expires_at,
          status: "pending",
        }));

        return res.status(200).json({
          members: memberList,
          pending_invites: pendingInvites,
        });
      }

      case "remove_member": {
        const { user_id } = body;
        if (!user_id) return res.status(400).json({ error: "user_id is required" });

        const orgId = await getOrgIdFromToken(token);
        if (!orgId) {
          return res.status(403).json({ error: "No organization found. Please complete onboarding." });
        }

        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        const { data: userData } = await supabase.auth.getUser(token);
        const requesterId = userData?.user?.id;
        const requesterEmail = userData?.user?.email;

        if (requesterId === user_id) {
          return res.status(400).json({ error: "You cannot remove yourself from the team" });
        }

        const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: requesterProfile } = await adminClient
          .from("profiles")
          .select("role")
          .eq("user_id", requesterId)
          .single();

        if (requesterProfile?.role !== "owner" && requesterProfile?.role !== "admin") {
          return res.status(403).json({ error: "Only owners and admins can remove team members" });
        }

        const { data: targetProfile } = await adminClient
          .from("profiles")
          .select("email:auth.users(email), role")
          .eq("user_id", user_id)
          .single();

        if (!targetProfile) {
          return res.status(404).json({ error: "User not found" });
        }

        const targetEmail = targetProfile.email?.[0]?.email || "unknown";

        const { error } = await adminClient
          .from("profiles")
          .update({ organization_id: null, role: null })
          .eq("user_id", user_id)
          .eq("organization_id", orgId);
        if (error) throw error;

        await adminClient.from("activity_events").insert({
          organization_id: orgId,
          event_type: "member_removed",
          description: `Removed ${targetEmail} from team`,
        });

        await adminClient.from("audit_log").insert({
          organization_id: orgId,
          user_id: requesterId,
          action: "member_removed",
          user_email: requesterEmail ?? null,
          resource_type: "team_member",
          resource_name: targetEmail,
          details: `Removed from organization`,
        }).then(() => {});

        return res.status(200).json({ success: true });
      }

      case "update_role": {
        const { user_id, role } = body;
        if (!user_id || !role) {
          return res.status(400).json({ error: "user_id and role are required" });
        }

        const orgId = await getOrgIdFromToken(token);
        if (!orgId) {
          return res.status(403).json({ error: "No organization found. Please complete onboarding." });
        }

        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        const { data: userData } = await supabase.auth.getUser(token);
        const requesterId = userData?.user?.id;
        const requesterEmail = userData?.user?.email;

        const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: requesterProfile } = await adminClient
          .from("profiles")
          .select("role")
          .eq("user_id", requesterId)
          .single();

        if (requesterProfile?.role !== "owner") {
          return res.status(403).json({ error: "Only owners can change team member roles" });
        }

        const { data: targetProfile } = await adminClient
          .from("profiles")
          .select("email:auth.users(email)")
          .eq("user_id", user_id)
          .single();

        if (!targetProfile) {
          return res.status(404).json({ error: "User not found" });
        }

        const targetEmail = targetProfile.email?.[0]?.email || "unknown";

        const { error } = await adminClient
          .from("profiles")
          .update({ role })
          .eq("user_id", user_id)
          .eq("organization_id", orgId);
        if (error) throw error;

        await adminClient.from("activity_events").insert({
          organization_id: orgId,
          event_type: "member_role_updated",
          description: `Updated ${targetEmail} role to ${role}`,
        });

        await adminClient.from("audit_log").insert({
          organization_id: orgId,
          user_id: requesterId,
          action: "member_role_updated",
          user_email: requesterEmail ?? null,
          resource_type: "team_member",
          resource_name: targetEmail,
          details: `Role changed to ${role}`,
        }).then(() => {});

        return res.status(200).json({ success: true, role });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error("manage-team error:", err);
    return res.status(500).json({ error: (err as Error).message ?? "Internal error" });
  }
}
