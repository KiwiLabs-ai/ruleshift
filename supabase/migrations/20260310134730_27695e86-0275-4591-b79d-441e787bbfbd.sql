ALTER TABLE public.alerts
ADD COLUMN org_source_id uuid REFERENCES public.organization_sources(id) ON DELETE SET NULL;