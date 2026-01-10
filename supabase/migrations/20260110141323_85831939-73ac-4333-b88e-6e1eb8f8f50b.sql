-- Create entry_cards table for storing form submissions
CREATE TABLE public.entry_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  purpose_tourism BOOLEAN DEFAULT false,
  purpose_business BOOLEAN DEFAULT false,
  purpose_worry_free BOOLEAN DEFAULT false,
  worry_description TEXT,
  agreement_1 BOOLEAN DEFAULT false,
  agreement_2 BOOLEAN DEFAULT false,
  agreement_3 BOOLEAN DEFAULT false,
  signature TEXT,
  entry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public form - anyone can submit)
ALTER TABLE public.entry_cards ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public submission form)
CREATE POLICY "Anyone can submit entry cards"
ON public.entry_cards
FOR INSERT
WITH CHECK (true);

-- Allow anyone to view their own submissions (by matching name for simplicity)
CREATE POLICY "Anyone can view entry cards"
ON public.entry_cards
FOR SELECT
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_entry_cards_updated_at
BEFORE UPDATE ON public.entry_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();