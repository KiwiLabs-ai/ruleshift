
-- Create digest_queue table
CREATE TABLE public.digest_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brief_id uuid REFERENCES public.briefs(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  queued_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

-- Index for efficient "unsent items" queries
CREATE INDEX idx_digest_queue_user_unsent ON public.digest_queue (user_id, sent_at);

-- Enable RLS but add no user policies (service_role only)
ALTER TABLE public.digest_queue ENABLE ROW LEVEL SECURITY;
