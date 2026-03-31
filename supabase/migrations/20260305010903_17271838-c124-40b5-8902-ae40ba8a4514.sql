
-- Add check_frequency and last_changed_at columns to organization_sources
ALTER TABLE public.organization_sources
  ADD COLUMN IF NOT EXISTS check_frequency text NOT NULL DEFAULT '6h',
  ADD COLUMN IF NOT EXISTS last_changed_at timestamptz;

-- Add UPDATE policy for organization_sources (currently missing)
CREATE POLICY "Users can update org sources"
  ON public.organization_sources
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = organization_sources.organization_id
      AND organizations.created_by = auth.uid()
  ));
