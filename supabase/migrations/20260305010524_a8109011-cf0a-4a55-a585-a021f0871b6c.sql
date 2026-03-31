
-- Enable pg_trgm for full-text/fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add tags column to briefs for regulation/industry tagging
ALTER TABLE public.briefs
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Create GIN index on briefs for full-text search
CREATE INDEX IF NOT EXISTS idx_briefs_title_trgm ON public.briefs USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_briefs_content_trgm ON public.briefs USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_briefs_tags ON public.briefs USING gin (tags);

-- Full-text search function for briefs
CREATE OR REPLACE FUNCTION public.search_briefs(
  _org_id uuid,
  _query text,
  _limit int DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  title text,
  summary text,
  content text,
  source_name text,
  created_at timestamptz,
  alert_id uuid,
  organization_id uuid,
  tags text[],
  relevance real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id, b.title, b.summary, b.content, b.source_name,
    b.created_at, b.alert_id, b.organization_id, b.tags,
    GREATEST(
      similarity(b.title, _query),
      similarity(COALESCE(b.content, ''), _query)
    ) AS relevance
  FROM public.briefs b
  WHERE b.organization_id = _org_id
    AND (
      b.title % _query
      OR COALESCE(b.content, '') % _query
      OR b.title ILIKE '%' || _query || '%'
      OR COALESCE(b.content, '') ILIKE '%' || _query || '%'
    )
  ORDER BY relevance DESC
  LIMIT _limit;
$$;
