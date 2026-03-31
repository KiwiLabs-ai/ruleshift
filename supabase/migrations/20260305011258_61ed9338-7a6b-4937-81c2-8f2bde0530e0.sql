
-- Create audit_log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org audit log"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = audit_log.organization_id
      AND organizations.created_by = auth.uid()
  ));

CREATE POLICY "Users can insert own org audit log"
  ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = audit_log.organization_id
      AND organizations.created_by = auth.uid()
  ));

CREATE INDEX idx_audit_log_org ON public.audit_log(organization_id, created_at DESC);
