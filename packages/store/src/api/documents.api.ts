import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import { getSupabase } from './base'

export interface Document {
  id: string
  name: string
  file_name: string
  file_type: string
  file_size: number
  file_path: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  chunk_count: number | null
  created_at: string
  updated_at: string
}

export interface DocumentResponse {
  id: string
  name: string
  fileName: string
  fileType: string
  fileSize: number
  filePath: string
  fileUrl: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  chunkCount: number
  uploadedAt: string
  updatedAt: string
}

function mapDocument(doc: Document): DocumentResponse {
  const supabase = getSupabase()
  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(doc.file_path)

  return {
    id: doc.id,
    name: doc.name,
    fileName: doc.file_name,
    fileType: doc.file_type,
    fileSize: doc.file_size,
    filePath: doc.file_path,
    fileUrl: urlData.publicUrl,
    status: doc.status,
    chunkCount: doc.chunk_count || 0,
    uploadedAt: doc.created_at,
    updatedAt: doc.updated_at,
  }
}

export const documentsApi = createApi({
  reducerPath: 'documentsApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Document'],
  endpoints: (builder) => ({
    getDocuments: builder.query<DocumentResponse[], void>({
      queryFn: async () => {
        try {
          const supabase = getSupabase()
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) throw error
          return { data: (data || []).map(mapDocument) }
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } }
        }
      },
      providesTags: ['Document'],
    }),

    getDocument: builder.query<DocumentResponse, { id: string }>({
      queryFn: async ({ id }) => {
        try {
          const supabase = getSupabase()
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', id)
            .single()

          if (error) throw error
          return { data: mapDocument(data) }
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } }
        }
      },
      providesTags: (_result, _error, { id }) => [{ type: 'Document', id }],
    }),

    uploadDocument: builder.mutation<DocumentResponse, { file: File }>({
      queryFn: async ({ file }) => {
        try {
          const supabase = getSupabase()

          // Generate unique file path
          const fileExt = file.name.split('.').pop() || 'unknown'
          const filePath = `${crypto.randomUUID()}.${fileExt}`

          // Upload file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file)

          if (uploadError) throw uploadError

          // Create document record
          const { data, error } = await supabase
            .from('documents')
            .insert({
              name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
              file_name: file.name,
              file_type: fileExt,
              file_size: file.size,
              file_path: filePath,
              status: 'pending',
            })
            .select()
            .single()

          if (error) throw error

          // Trigger document processing via API
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
          fetch(`${apiUrl}/process/${data.id}`, { method: 'POST' })
            .catch(console.error) // Fire and forget

          return { data: mapDocument(data) }
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } }
        }
      },
      invalidatesTags: ['Document'],
    }),

    deleteDocument: builder.mutation<boolean, { id: string }>({
      queryFn: async ({ id }) => {
        try {
          const supabase = getSupabase()

          // Get document to find file path
          const { data: doc, error: fetchError } = await supabase
            .from('documents')
            .select('file_path')
            .eq('id', id)
            .single()

          if (fetchError) throw fetchError

          // Delete from storage
          if (doc?.file_path) {
            await supabase.storage
              .from('documents')
              .remove([doc.file_path])
          }

          // Delete document chunks
          await supabase
            .from('document_chunks')
            .delete()
            .eq('document_id', id)

          // Delete document record
          const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id)

          if (error) throw error
          return { data: true }
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } }
        }
      },
      invalidatesTags: ['Document'],
    }),
  }),
})

export const {
  useGetDocumentsQuery,
  useGetDocumentQuery,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
} = documentsApi
