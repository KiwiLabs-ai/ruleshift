-- Improve sources page query performance by indexing the most common lookup pattern.
-- Without this index, every get_watchlist call performs a full table scan on organization_sources.
CREATE INDEX IF NOT EXISTS idx_organization_sources_org_id
  ON public.organization_sources (organization_id);
