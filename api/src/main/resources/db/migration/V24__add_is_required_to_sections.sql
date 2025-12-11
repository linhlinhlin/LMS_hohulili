-- Migration V24: Add missing is_required column to sections table (refinement of V23)

ALTER TABLE public.sections
ADD COLUMN is_required BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.sections.is_required IS 'Indicates if this section must be completed to progress';
