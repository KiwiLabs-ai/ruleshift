
-- 1. Drop existing organization_members table and its policies
DROP POLICY IF EXISTS "Org owners can delete members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners can insert members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners can view members" ON public.organization_members;
DROP TABLE IF EXISTS public.organization_members;

-- 2. Create new organization_members table
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  invited_email text,
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz
);

CREATE UNIQUE INDEX org_members_org_user_unique ON public.organization_members (organization_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX org_members_org_email_unique ON public.organization_members (organization_id, invited_email) WHERE invited_email IS NOT NULL;

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 3. Create is_org_member function
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  )
$$;

-- Helper: check if user is owner/admin
CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
      AND role IN ('owner','admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
      AND role = 'owner'
  )
$$;

-- 4. RLS policies on organization_members
CREATE POLICY "Members can view same org members"
  ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Admins can insert members"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Admins can update members"
  ON public.organization_members FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE POLICY "Owners can delete members"
  ON public.organization_members FOR DELETE TO authenticated
  USING (public.is_org_owner(organization_id));

-- 5. Seed owners from existing organizations
INSERT INTO public.organization_members (organization_id, user_id, role, accepted_at)
SELECT id, created_by, 'owner', now()
FROM public.organizations;

-- 6. Update RLS policies on alerts
DROP POLICY IF EXISTS "Users can view own org alerts" ON public.alerts;
CREATE POLICY "Users can view own org alerts"
  ON public.alerts FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Users can update own org alerts" ON public.alerts;
CREATE POLICY "Users can update own org alerts"
  ON public.alerts FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id));

-- 7. Update RLS policies on briefs
DROP POLICY IF EXISTS "Users can view own org briefs" ON public.briefs;
CREATE POLICY "Users can view own org briefs"
  ON public.briefs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

-- 8. Update RLS policies on activity_events
DROP POLICY IF EXISTS "Users can view own org activity" ON public.activity_events;
CREATE POLICY "Users can view own org activity"
  ON public.activity_events FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

-- 9. Update RLS policies on audit_log
DROP POLICY IF EXISTS "Users can view own org audit log" ON public.audit_log;
CREATE POLICY "Users can view own org audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Users can insert own org audit log" ON public.audit_log;
CREATE POLICY "Users can insert own org audit log"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

-- 10. Update RLS policies on organization_sources
DROP POLICY IF EXISTS "Users can view org sources" ON public.organization_sources;
CREATE POLICY "Users can view org sources"
  ON public.organization_sources FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Users can insert org sources" ON public.organization_sources;
CREATE POLICY "Users can insert org sources"
  ON public.organization_sources FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Users can update org sources" ON public.organization_sources;
CREATE POLICY "Users can update org sources"
  ON public.organization_sources FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Users can delete org sources" ON public.organization_sources;
CREATE POLICY "Users can delete org sources"
  ON public.organization_sources FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

-- 11. Update RLS policies on subscriptions
DROP POLICY IF EXISTS "Users can view own org subscription" ON public.subscriptions;
CREATE POLICY "Users can view own org subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
