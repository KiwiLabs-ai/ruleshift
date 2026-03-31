
-- Alerts table
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_name text NOT NULL,
  severity text NOT NULL DEFAULT 'informational',
  brief_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org alerts"
  ON public.alerts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = alerts.organization_id
      AND organizations.created_by = auth.uid()
  ));

CREATE POLICY "Users can update own org alerts"
  ON public.alerts FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = alerts.organization_id
      AND organizations.created_by = auth.uid()
  ));

-- Briefs table
CREATE TABLE public.briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  title text NOT NULL,
  source_name text NOT NULL,
  summary text,
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org briefs"
  ON public.briefs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = briefs.organization_id
      AND organizations.created_by = auth.uid()
  ));

-- Activity events table
CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org activity"
  ON public.activity_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = activity_events.organization_id
      AND organizations.created_by = auth.uid()
  ));

-- Add last_checked and status to organization_sources
ALTER TABLE public.organization_sources
  ADD COLUMN last_checked_at timestamptz DEFAULT now(),
  ADD COLUMN status text NOT NULL DEFAULT 'active';

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
