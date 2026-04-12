import { createClient } from "@supabase/supabase-js";

const FALLBACK_PRODUCT_BASIC = "prod_U5aHbRwGTN7xrH";
const FALLBACK_PRODUCT_PROFESSIONAL = "prod_U5aIsM1EfFuyrj";
const FALLBACK_PRODUCT_ENTERPRISE = "prod_U5aIAlewBWuFxK";

const PRODUCT_BASIC = process.env.STRIPE_PRODUCT_BASIC || FALLBACK_PRODUCT_BASIC;
const PRODUCT_PROFESSIONAL = process.env.STRIPE_PRODUCT_PROFESSIONAL || FALLBACK_PRODUCT_PROFESSIONAL;
const PRODUCT_ENTERPRISE = process.env.STRIPE_PRODUCT_ENTERPRISE || FALLBACK_PRODUCT_ENTERPRISE;

export type TierName = "free" | "basic" | "professional" | "enterprise";

const PRODUCT_TO_TIER: Record<string, TierName> = {
  [PRODUCT_BASIC]: "basic",
  [PRODUCT_PROFESSIONAL]: "professional",
  [PRODUCT_ENTERPRISE]: "enterprise",
};

/** Source limits per tier. */
export const SOURCE_LIMITS: Record<TierName, number> = {
  free: 5,
  basic: 10,
  professional: 25,
  enterprise: Infinity,
};

/** Team member limits per tier. */
export const MEMBER_LIMITS: Record<TierName, number> = {
  free: 1,
  basic: 1,
  professional: 5,
  enterprise: Infinity,
};

/** Maximum digest frequency allowed per tier. Ordered: weekly < daily < realtime. */
export const TIER_MAX_FREQUENCY: Record<TierName, string> = {
  free: "weekly",
  basic: "weekly",
  professional: "daily",
  enterprise: "realtime",
};

const FREQUENCY_RANK: Record<string, number> = {
  weekly: 0,
  daily: 1,
  realtime: 2,
};

/** Archive retention in days per tier. Infinity = full archive. */
export const ARCHIVE_RETENTION_DAYS: Record<TierName, number> = {
  free: 30,
  basic: 30,
  professional: Infinity,
  enterprise: Infinity,
};

/** Whether the tier includes brief action items. */
export const HAS_ACTION_ITEMS: Record<TierName, boolean> = {
  free: false,
  basic: false,
  professional: true,
  enterprise: true,
};

/**
 * Look up the org's subscription tier from the Supabase subscriptions table.
 * Returns "free" if no active/trialing subscription exists.
 */
export async function getOrgTier(orgId: string): Promise<TierName> {
  const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await adminClient
    .from("subscriptions")
    .select("status, product_id")
    .eq("organization_id", orgId)
    .single();

  if (error || !data) return "free";
  if (!["active", "trialing"].includes(data.status)) return "free";
  return PRODUCT_TO_TIER[data.product_id ?? ""] ?? "free";
}

/**
 * Clamp a user's preferred digest frequency to their tier's maximum.
 * E.g., a Basic user who set "realtime" gets clamped to "weekly".
 */
export function clampFrequency(preferred: string, tier: TierName): string {
  const maxFreq = TIER_MAX_FREQUENCY[tier];
  const maxRank = FREQUENCY_RANK[maxFreq] ?? 0;
  const prefRank = FREQUENCY_RANK[preferred] ?? 0;
  return prefRank > maxRank ? maxFreq : preferred;
}
