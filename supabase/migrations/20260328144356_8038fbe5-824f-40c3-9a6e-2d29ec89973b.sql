
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS resource_type text,
  ADD COLUMN IF NOT EXISTS resource_id uuid,
  ADD COLUMN IF NOT EXISTS resource_name text;

CREATE INDEX IF NOT EXISTS idx_audit_log_org_created
  ON public.audit_log (organization_id, created_at DESC);
