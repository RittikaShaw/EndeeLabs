-- Seed data for development

-- Demo user's documents (you can run this after uploading some test files)
-- INSERT INTO public.documents (user_id, name, file_name, file_type, file_size, file_url, file_path, status, chunk_count)
-- VALUES
--   ('demo-user-id', 'Sample PDF', 'sample.pdf', 'pdf', 1024000, 'https://example.com/sample.pdf', 'documents/sample.pdf', 'completed', 10),
--   ('demo-user-id', 'Sample Doc', 'sample.docx', 'docx', 512000, 'https://example.com/sample.docx', 'documents/sample.docx', 'completed', 5);

-- Demo chat session
-- INSERT INTO public.chat_sessions (user_id, title, document_ids)
-- VALUES ('demo-user-id', 'Sample Chat', '{}');
