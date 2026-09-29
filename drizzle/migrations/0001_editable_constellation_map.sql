ALTER TABLE public.case_contexts ADD COLUMN position_x double precision, ADD COLUMN position_y double precision;
CREATE TABLE public.case_map_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  from_context_id uuid NOT NULL REFERENCES public.case_contexts(id) ON DELETE CASCADE,
  to_context_id uuid NOT NULL REFERENCES public.case_contexts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT distinct_contexts CHECK (from_context_id <> to_context_id),
  CONSTRAINT unique_context_pair UNIQUE (case_id, from_context_id, to_context_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_map_edges TO authenticated;
GRANT ALL ON public.case_map_edges TO service_role;
ALTER TABLE public.case_map_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals manage own map edges" ON public.case_map_edges FOR ALL TO authenticated USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_map_edges.case_id AND c.owner_id = auth.uid())) WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_map_edges.case_id AND c.owner_id = auth.uid()) AND EXISTS (SELECT 1 FROM public.case_contexts a JOIN public.case_contexts b ON b.id = case_map_edges.to_context_id WHERE a.id = case_map_edges.from_context_id AND a.case_id = case_map_edges.case_id AND b.case_id = case_map_edges.case_id AND a.owner_id = auth.uid() AND b.owner_id = auth.uid()));
CREATE INDEX case_map_edges_case_id_idx ON public.case_map_edges(case_id);
CREATE OR REPLACE FUNCTION public.validate_case_map_edge() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.case_contexts a JOIN public.case_contexts b ON b.id = NEW.to_context_id WHERE a.id = NEW.from_context_id AND a.case_id = NEW.case_id AND b.case_id = NEW.case_id AND a.owner_id = NEW.owner_id AND b.owner_id = NEW.owner_id) THEN RAISE EXCEPTION 'Map nodes must belong to the same case and owner'; END IF; RETURN NEW; END $$;
CREATE TRIGGER validate_case_map_edge_before_write BEFORE INSERT OR UPDATE ON public.case_map_edges FOR EACH ROW EXECUTE FUNCTION public.validate_case_map_edge();