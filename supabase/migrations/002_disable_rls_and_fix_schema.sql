-- Disable RLS on all tables (no auth in this app)
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;

-- Make user_id optional (no auth)
ALTER TABLE public.documents ALTER COLUMN user_id SET DEFAULT 'anonymous';
ALTER TABLE public.documents ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.chat_sessions ALTER COLUMN user_id SET DEFAULT 'anonymous';
ALTER TABLE public.chat_sessions ALTER COLUMN user_id DROP NOT NULL;

-- Make file_url optional (we use file_path + storage)
ALTER TABLE public.documents ALTER COLUMN file_url DROP NOT NULL;
ALTER TABLE public.documents ALTER COLUMN file_url SET DEFAULT '';

-- Allow public access to storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for public upload/download
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow public downloads" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Allow public deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'documents');
