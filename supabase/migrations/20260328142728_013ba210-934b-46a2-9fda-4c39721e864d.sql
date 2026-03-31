
CREATE TABLE public.brief_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
  action_index integer NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  UNIQUE (brief_id, action_index)
);

ALTER TABLE public.brief_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view brief action items"
  ON public.brief_action_items FOR SELECT TO authenticated
  USING (
    public.is_org_member(
      (SELECT b.organization_id FROM public.briefs b WHERE b.id = brief_action_items.brief_id)
    )
  );

CREATE POLICY "Members can insert brief action items"
  ON public.brief_action_items FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(
      (SELECT b.organization_id FROM public.briefs b WHERE b.id = brief_action_items.brief_id)
    )
  );

CREATE POLICY "Members can update brief action items"
  ON public.brief_action_items FOR UPDATE TO authenticated
  USING (
    public.is_org_member(
      (SELECT b.organization_id FROM public.briefs b WHERE b.id = brief_action_items.brief_id)
    )
  );

CREATE INDEX idx_brief_action_items_brief ON public.brief_action_items (brief_id);
