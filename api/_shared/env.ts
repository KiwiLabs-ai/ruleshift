const REQUIRED_ENV = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "ANTHROPIC_API_KEY",
  "STRIPE_SECRET_KEY",
  "RESEND_API_KEY",
] as const;

export function validateEnv(required: readonly string[] = REQUIRED_ENV): void {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable not set: ${key}`);
  }
  return value;
}
