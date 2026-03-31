
-- 1. Create page_snapshots table
CREATE TABLE public.page_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_source_id uuid NOT NULL REFERENCES public.organization_sources(id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  text_content text,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient "get latest snapshot" queries
CREATE INDEX idx_page_snapshots_source_fetched ON public.page_snapshots (org_source_id, fetched_at DESC);

-- RLS
ALTER TABLE public.page_snapshots ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users who are members of the org
CREATE POLICY "Members can view snapshots"
  ON public.page_snapshots
  FOR SELECT
  TO authenticated
  USING (
    public.is_org_member(
      (SELECT os.organization_id FROM public.organization_sources os WHERE os.id = org_source_id)
    )
  );

-- INSERT and DELETE: service_role only (no policies for authenticated)
-- By having RLS enabled with no INSERT/DELETE policies for authenticated,
-- only service_role (which bypasses RLS) can insert/delete.

-- 2. Add error tracking columns to organization_sources
ALTER TABLE public.organization_sources
  ADD COLUMN last_error text,
  ADD COLUMN consecutive_errors integer NOT NULL DEFAULT 0;
