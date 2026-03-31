ALTER TABLE public.briefs
  ADD COLUMN actioned_at timestamptz DEFAULT NULL,
  ADD COLUMN actioned_by uuid DEFAULT NULL REFERENCES auth.users(id);