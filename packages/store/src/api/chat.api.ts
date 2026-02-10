import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import { getSupabase } from './base'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    documentId: string
    documentTitle: string
    chunkIndex: number
    content: string
    similarity: number
  }>
  createdAt: string
}

export interface ChatSession {
  id: string
  title: string | null
  documentIds: string[]
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

interface DbChatSession {
  id: string
  title: string | null
  document_ids: string[] | null
  created_at: string
  updated_at: string
}

interface DbChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  sources: ChatMessage['sources'] | null
  created_at: string
}

function mapSession(session: DbChatSession, messages: DbChatMessage[] = []): ChatSession {
  return {
    id: session.id,
    title: session.title,
    documentIds: session.document_ids || [],
    messages: messages.map(mapMessage),
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  }
}

function mapMessage(msg: DbChatMessage): ChatMessage {
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    sources: msg.sources || undefined,
    createdAt: msg.created_at,
  }
}

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Chat', 'Message'],
  endpoints: (builder) => ({
    getChats: builder.query<ChatSession[], void>({
      queryFn: async () => {
        try {
          const supabase = getSupabase()
          const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) throw error
          return { data: (data || []).map((s) => mapSession(s)) }
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } }
        }
      },
      providesTags: ['Chat'],
    }),

    getChat: builder.query<ChatSession, { id: string }>({
      queryFn: async ({ id }) => {
        try {
          const supabase = getSupabase()

          // Get session
          const { data: session, error: sessionError } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('id', id)
            .single()

          if (sessionError) throw sessionError

          // Get messages
          const { data: messages, error: messagesError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', id)
            .order('created_at', { ascending: true })

          if (messagesError) throw messagesError

          return { data: mapSession(session, messages || []) }
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } }
        }
      },
      providesTags: (_result, _error, { id }) => [
        { type: 'Chat', id },
        { type: 'Message', id },
      ],
    }),

    createChat: builder.mutation<ChatSession, { documentIds?: string[] }>({
      queryFn: async ({ documentIds }) => {
        try {
          const supabase = getSupabase()
          const { data, error } = await supabase
            .from('chat_sessions')
            .insert({
              title: null,
              document_ids: documentIds || [],
            })
            .select()
            .single()

          if (error) throw error
          return { data: mapSession(data) }
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } }
        }
      },
      invalidatesTags: ['Chat'],
    }),

    sendMessage: builder.mutation<ChatMessage, { sessionId: string; content: string }>({
      queryFn: async ({ sessionId, content }) => {
        try {
          // Call the RAG API endpoint for message processing
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
          const response = await fetch(`${apiUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, content }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(errorText || 'Failed to send message')
          }

          const data = await response.json()
          return {
            data: {
              id: data.id,
              role: data.role,
              content: data.content,
              sources: data.sources,
              createdAt: data.created_at || data.createdAt,
            },
          }
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } }
        }
      },
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: 'Chat', id: sessionId },
        { type: 'Message', id: sessionId },
      ],
    }),

    deleteChat: builder.mutation<boolean, { id: string }>({
      queryFn: async ({ id }) => {
        try {
          const supabase = getSupabase()

          // Delete messages first
          await supabase
            .from('chat_messages')
            .delete()
            .eq('session_id', id)

          // Delete session
          const { error } = await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', id)

          if (error) throw error
          return { data: true }
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } }
        }
      },
      invalidatesTags: ['Chat'],
    }),
  }),
})

export const {
  useGetChatsQuery,
  useGetChatQuery,
  useCreateChatMutation,
  useSendMessageMutation,
  useDeleteChatMutation,
} = chatApi
