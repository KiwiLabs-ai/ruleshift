import { STRIPE_TIERS, type TierKey } from "./stripe-tiers";

export type TierName = "free" | TierKey;

/** Map a Stripe product_id to a tier name. Returns "free" if unknown. */
export function getTierFromProductId(productId: string | null | undefined): TierName {
  if (!productId) return "free";
  for (const [key, tier] of Object.entries(STRIPE_TIERS)) {
    if (tier.productId === productId) return key as TierKey;
  }
  return "free";
}

/** Monitored source limits per tier. Infinity = unlimited. */
export const SOURCE_LIMITS: Record<TierName, number> = {
  free: 5,
  basic: STRIPE_TIERS.basic.sourceLimit,
  professional: STRIPE_TIERS.professional.sourceLimit,
  enterprise: STRIPE_TIERS.enterprise.sourceLimit,
};

/** Digest frequency options available per tier. */
export const TIER_FREQUENCY_OPTIONS: Record<TierName, string[]> = {
  free: ["weekly"],
  basic: ["weekly"],
  professional: ["weekly", "daily"],
  enterprise: ["weekly", "daily", "realtime"],
};

/** Whether the tier has access to full archive (vs 30-day). */
export const HAS_FULL_ARCHIVE: Record<TierName, boolean> = {
  free: false,
  basic: false,
  professional: true,
  enterprise: true,
};

/** Whether the tier includes brief action items. */
export const HAS_ACTION_ITEMS: Record<TierName, boolean> = {
  free: false,
  basic: false,
  professional: true,
  enterprise: true,
};

/** Archive retention in days. Infinity = unlimited. */
export const ARCHIVE_RETENTION_DAYS: Record<TierName, number> = {
  free: 30,
  basic: 30,
  professional: Infinity,
  enterprise: Infinity,
};
