-- Create strokes table for storing SVG stroke data
-- This table is used by the Realtime 3D Stroke Visualization System

CREATE TABLE public.strokes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_url TEXT NOT NULL,
  is_processed BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries on is_processed
CREATE INDEX idx_strokes_is_processed ON public.strokes(is_processed);

-- Create index for ordering by created_at
CREATE INDEX idx_strokes_created_at ON public.strokes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.strokes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert strokes (public tablet input)
CREATE POLICY "Anyone can insert strokes"
ON public.strokes
FOR INSERT
WITH CHECK (true);

-- Allow anyone to select strokes (for realtime subscription on large screen)
CREATE POLICY "Anyone can view strokes"
ON public.strokes
FOR SELECT
USING (true);

-- Allow update for is_processed flag (screen marks as processed)
CREATE POLICY "Anyone can update strokes"
ON public.strokes
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.strokes;

-- Comment for documentation
COMMENT ON TABLE public.strokes IS 'Stores SVG stroke data uploaded from tablet clients for realtime 3D visualization';
COMMENT ON COLUMN public.strokes.file_url IS 'Public URL of the SVG file in Supabase Storage';
COMMENT ON COLUMN public.strokes.is_processed IS 'Flag to track if the stroke has been rendered on the large screen';
COMMENT ON COLUMN public.strokes.metadata IS 'Optional metadata like stroke count, dimensions, etc.';
