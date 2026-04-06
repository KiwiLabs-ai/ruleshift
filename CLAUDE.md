# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RuleShift is a regulatory policy monitoring SaaS. It tracks government/regulatory policy sources, generates AI-powered impact briefs (via Anthropic Claude API), and delivers email digests. Built with a Vite/React frontend and Vercel serverless backend, backed by Supabase PostgreSQL.

## Commands

```bash
npm run dev          # Start Vite dev server (port 8080)
npm run build        # Production build (also runs TypeScript check)
npm run build:dev    # Development build
npm run lint         # ESLint
npm run test         # Vitest single run
npm run test:watch   # Vitest watch mode
```

Run a single test file: `npx vitest run src/path/to/file.test.ts`

## Architecture

### Frontend (`src/`)
- **React 18 + TypeScript** with Vite bundler
- **Routing**: React Router v6. Protected routes wrap authenticated pages via `<ProtectedRoute>`. Onboarding uses nested routes under `/onboarding`.
- **State**: React Context for auth (`AuthContext`), TanStack React Query for server state.
- **UI**: shadcn/ui components in `src/components/ui/`, feature components organized by domain (`alerts/`, `dashboard/`, `sources/`, `settings/`, `onboarding/`).
- **Data hooks**: `src/hooks/use-*.ts` encapsulate data fetching logic per feature area.
- **API calls**: All backend requests go through `src/lib/api.ts` (`apiCall()`) which attaches Supabase auth tokens and calls `/api/<endpoint>`.

### Backend (`api/`)
Vercel serverless functions (migrated from Supabase Edge Functions). Each file in `api/` is an endpoint:
- `generate-brief.ts` - AI brief generation (Anthropic Claude)
- `manage-sources.ts` - CRUD for policy sources (tier-limited: 10/25/unlimited)
- `manage-team.ts` - Team member management
- `send-digests.ts` - Email delivery via Resend (cron: hourly)
- `monitor-sources.ts` - Policy source polling (cron: every 6 hours)
- `stripe-webhook.ts` - Billing events
- `create-checkout.ts`, `check-subscription.ts`, `customer-portal.ts` - Stripe billing
- `export-audit-log.ts`, `export-brief-pdf.ts` - Export features
- Shared rate limiter in `api/_shared/rate-limit.ts`

Cron schedules are defined in `vercel.json`.

### Database (`supabase/`)
- Supabase PostgreSQL with migrations in `supabase/migrations/`
- Auto-generated types in `src/integrations/supabase/types.ts`
- Client singleton in `src/integrations/supabase/client.ts`
- Key tables: `organizations`, `profiles`, `policy_sources`, `organization_sources`, `alerts`, `briefs`, `subscriptions`, `team_members`, `audit_log`

### Legacy Code
`supabase/functions/` contains old Supabase Edge Functions (Deno). Active backend is in `api/` (Vercel). The edge functions are kept but no longer deployed.

## Key Patterns

- **Path alias**: `@/*` maps to `src/*`
- **TypeScript**: Strict mode is OFF (`strict: false`, `strictNullChecks: false`, `noImplicitAny: false`)
- **Auth flow**: Supabase Auth with email/password. JWT tokens passed as Bearer headers to API routes. API routes verify tokens via `supabase.auth.getUser()`.
- **Billing tiers**: Three Stripe tiers (Basic/Professional/Enterprise) with source limits. Tier config in `src/lib/stripe-tiers.ts`.
- **Environment**: Frontend vars use `VITE_` prefix. Server-side secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`) are set in Vercel.
