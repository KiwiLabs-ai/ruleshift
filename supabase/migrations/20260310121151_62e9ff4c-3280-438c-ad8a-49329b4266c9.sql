
-- Organization members table for team invitations
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid DEFAULT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz DEFAULT NULL,
  UNIQUE(organization_id, email)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Org owners can view members
CREATE POLICY "Org owners can view members"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = organization_members.organization_id
        AND organizations.created_by = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Org owners can insert (invite) members
CREATE POLICY "Org owners can insert members"
  ON public.organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = organization_members.organization_id
        AND organizations.created_by = auth.uid()
    )
  );

-- Org owners can update members
CREATE POLICY "Org owners can update members"
  ON public.organization_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = organization_members.organization_id
        AND organizations.created_by = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Org owners can delete members
CREATE POLICY "Org owners can delete members"
  ON public.organization_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = organization_members.organization_id
        AND organizations.created_by = auth.uid()
    )
  );
