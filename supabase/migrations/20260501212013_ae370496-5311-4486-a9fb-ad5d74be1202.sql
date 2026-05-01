CREATE TABLE public.scan_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scan_id UUID,
  wine_name TEXT,
  wine_id TEXT,
  reason TEXT NOT NULL DEFAULT 'not_on_list',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scan feedback"
  ON public.scan_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scan feedback"
  ON public.scan_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scan feedback"
  ON public.scan_feedback FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scan feedback"
  ON public.scan_feedback FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_scan_feedback_user_created ON public.scan_feedback(user_id, created_at DESC);
CREATE INDEX idx_scan_feedback_scan ON public.scan_feedback(scan_id);