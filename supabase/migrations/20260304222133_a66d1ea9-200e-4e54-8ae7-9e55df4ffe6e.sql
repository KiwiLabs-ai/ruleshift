
-- Add onboarding tracking to profiles
ALTER TABLE public.profiles
  ADD COLUMN onboarding_step INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN onboarding_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN organization_id UUID;

-- Organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  company_size TEXT NOT NULL,
  compliance_concern TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own org" ON public.organizations FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert their own org" ON public.organizations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own org" ON public.organizations FOR UPDATE USING (auth.uid() = created_by);

-- Add FK from profiles to organizations
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Policy sources master table
CREATE TABLE public.policy_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.policy_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read sources" ON public.policy_sources FOR SELECT TO authenticated USING (true);

-- Watchlist templates
CREATE TABLE public.watchlist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  industries TEXT[] NOT NULL DEFAULT '{}',
  source_ids UUID[] NOT NULL DEFAULT '{}',
  source_count INTEGER NOT NULL DEFAULT 0,
  key_sources TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.watchlist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read templates" ON public.watchlist_templates FOR SELECT TO authenticated USING (true);

-- Organization sources (selected monitoring sources)
CREATE TABLE public.organization_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.policy_sources(id) ON DELETE SET NULL,
  custom_url TEXT,
  custom_name TEXT,
  custom_selector TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.organization_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org sources" ON public.organization_sources FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organizations WHERE id = organization_id AND created_by = auth.uid()));
CREATE POLICY "Users can insert org sources" ON public.organization_sources FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations WHERE id = organization_id AND created_by = auth.uid()));
CREATE POLICY "Users can delete org sources" ON public.organization_sources FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.organizations WHERE id = organization_id AND created_by = auth.uid()));

-- Notification preferences
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  slack_enabled BOOLEAN NOT NULL DEFAULT false,
  slack_webhook_url TEXT,
  digest_frequency TEXT NOT NULL DEFAULT 'daily',
  preferred_time TEXT DEFAULT '09:00',
  preferred_day TEXT DEFAULT 'monday',
  severity_threshold TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prefs" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own prefs" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own prefs" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Timestamp triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notification_prefs_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
