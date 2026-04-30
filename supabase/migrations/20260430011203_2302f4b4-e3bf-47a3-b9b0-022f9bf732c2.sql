-- Scan history: parent table
CREATE TABLE public.scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  photo_path TEXT,
  location_label TEXT,
  buying_for TEXT,
  wine_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scans"
  ON public.scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scans"
  ON public.scans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scans"
  ON public.scans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scans"
  ON public.scans FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_scans_user_created ON public.scans (user_id, created_at DESC);

CREATE TRIGGER update_scans_updated_at
  BEFORE UPDATE ON public.scans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-scan detected wines (snapshot at scan time)
CREATE TABLE public.scan_wines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  wine_payload JSONB NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_wines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scan wines"
  ON public.scan_wines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scan wines"
  ON public.scan_wines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scan wines"
  ON public.scan_wines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scan wines"
  ON public.scan_wines FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_scan_wines_scan ON public.scan_wines (scan_id, position);

-- Track when the user last manually fine-tuned their palate
ALTER TABLE public.taste_profiles
  ADD COLUMN IF NOT EXISTS last_refined_at TIMESTAMP WITH TIME ZONE;

-- Storage bucket for shelf photos (private, owner-scoped)
INSERT INTO storage.buckets (id, name, public)
VALUES ('scan-photos', 'scan-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can view their own scan photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'scan-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own scan photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'scan-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own scan photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'scan-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own scan photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'scan-photos' AND auth.uid()::text = (storage.foldername(name))[1]);