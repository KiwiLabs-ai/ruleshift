// Fallback Stripe IDs used when env vars are not set (e.g. in local dev).
// In production these should be supplied via Vite env vars (VITE_STRIPE_*).
const FALLBACK_PRICE_BASIC = "price_1T7P6hDOdwEZVcQrYURqZIBP";
const FALLBACK_PRICE_PROFESSIONAL = "price_1T7P7kDOdwEZVcQrXoPpWJTB";
const FALLBACK_PRICE_ENTERPRISE = "price_1T7P88DOdwEZVcQrgm8GYbw1";
const FALLBACK_PRODUCT_BASIC = "prod_U5aHbRwGTN7xrH";
const FALLBACK_PRODUCT_PROFESSIONAL = "prod_U5aIsM1EfFuyrj";
const FALLBACK_PRODUCT_ENTERPRISE = "prod_U5aIAlewBWuFxK";

export const STRIPE_TIERS = {
  basic: {
    name: "Basic",
    price: "$49",
    priceAmount: 49,
    priceId: import.meta.env.VITE_STRIPE_PRICE_BASIC || FALLBACK_PRICE_BASIC,
    productId: import.meta.env.VITE_STRIPE_PRODUCT_BASIC || FALLBACK_PRODUCT_BASIC,
    description: "For small teams getting started with compliance monitoring.",
    features: [
      "Up to 10 policy sources",
      "Weekly email digest",
      "Email alerts",
      "30-day brief archive",
      "Single user",
    ],
    sourceLimit: 10,
    highlighted: false,
  },
  professional: {
    name: "Professional",
    price: "$99",
    priceAmount: 99,
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL || FALLBACK_PRICE_PROFESSIONAL,
    productId: import.meta.env.VITE_STRIPE_PRODUCT_PROFESSIONAL || FALLBACK_PRODUCT_PROFESSIONAL,
    description: "For growing businesses that need daily coverage.",
    features: [
      "Up to 25 policy sources",
      "Daily digest",
      "Impact briefs with action items",
      "Full brief archive",
      "Up to 5 users",
    ],
    sourceLimit: 25,
    highlighted: true,
  },
  enterprise: {
    name: "Enterprise",
    price: "$199",
    priceAmount: 199,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE || FALLBACK_PRICE_ENTERPRISE,
    productId: import.meta.env.VITE_STRIPE_PRODUCT_ENTERPRISE || FALLBACK_PRODUCT_ENTERPRISE,
    description: "For organizations requiring real-time coverage and analyst review.",
    features: [
      "Unlimited policy sources",
      "Real-time alerts",
      "Analyst-reviewed briefs",
      "Custom SLAs",
      "Unlimited users",
      "Dedicated account manager",
      "API access",
    ],
    sourceLimit: Infinity,
    highlighted: false,
  },
} as const;

export type TierKey = keyof typeof STRIPE_TIERS;
