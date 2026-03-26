-- Add stable sequential number to strokes for "N번째 고민" mapping
ALTER TABLE public.strokes
  ADD COLUMN IF NOT EXISTS seq BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE;

-- Speed up idempotency lookup in Edge Function
CREATE INDEX IF NOT EXISTS idx_strokes_metadata_idempotencyKey
ON public.strokes ((metadata->>'idempotencyKey'));
