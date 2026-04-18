-- Fix RLS bootstrap bug on organization_members.
--
-- The existing "Admins can insert members" policy requires is_org_admin(organization_id),
-- but a brand-new organization has no admins yet, so its creator cannot insert themselves
-- as the first owner. This caused silent failures in CompanyStep.tsx during sign-up and
-- cascaded into "new row violates row-level security policy for table organization_sources"
-- errors when the user later tried to save monitored sources.
--
-- This migration adds a permissive INSERT policy that lets a user insert themselves as
-- a member of an organization they created, and backfills any orphaned orgs.

CREATE POLICY "Org creator can self-insert owner membership"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = organization_id
        AND created_by = auth.uid()
    )
  );

-- Backfill: for any organization whose creator has no membership row, insert one as owner.
INSERT INTO public.organization_members (organization_id, user_id, role, accepted_at)
SELECT o.id, o.created_by, 'owner', now()
FROM public.organizations o
WHERE o.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = o.id
      AND m.user_id = o.created_by
  );
