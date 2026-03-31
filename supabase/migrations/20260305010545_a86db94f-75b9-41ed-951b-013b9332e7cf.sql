
-- Drop dependent indexes first, then move extension
DROP INDEX IF EXISTS idx_briefs_title_trgm;
DROP INDEX IF EXISTS idx_briefs_content_trgm;
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Recreate indexes using extensions schema
CREATE INDEX idx_briefs_title_trgm ON public.briefs USING gin (title extensions.gin_trgm_ops);
CREATE INDEX idx_briefs_content_trgm ON public.briefs USING gin (content extensions.gin_trgm_ops);

-- Recreate search function
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
SET search_path = public, extensions
AS $$
  SELECT
    b.id, b.title, b.summary, b.content, b.source_name,
    b.created_at, b.alert_id, b.organization_id, b.tags,
    GREATEST(
      extensions.similarity(b.title, _query),
      extensions.similarity(COALESCE(b.content, ''), _query)
    ) AS relevance
  FROM public.briefs b
  WHERE b.organization_id = _org_id
    AND (
      b.title ILIKE '%' || _query || '%'
      OR COALESCE(b.content, '') ILIKE '%' || _query || '%'
      OR COALESCE(b.summary, '') ILIKE '%' || _query || '%'
    )
  ORDER BY relevance DESC
  LIMIT _limit;
$$;
