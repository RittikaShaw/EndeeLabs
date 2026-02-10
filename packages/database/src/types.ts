export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          user_id: string
          name: string
          file_name: string
          file_type: string
          file_size: number
          file_url: string
          file_path: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          chunk_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          file_name: string
          file_type: string
          file_size: number
          file_url: string
          file_path: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          chunk_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          file_name?: string
          file_type?: string
          file_size?: number
          file_url?: string
          file_path?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          chunk_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      document_chunks: {
        Row: {
          id: string
          document_id: string
          chunk_index: number
          content: string
          token_count: number
          embedding_id: string
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          chunk_index: number
          content: string
          token_count: number
          embedding_id: string
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          chunk_index?: number
          content?: string
          token_count?: number
          embedding_id?: string
          created_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string | null
          document_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          document_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          document_ids?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          sources: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          sources?: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant'
          content?: string
          sources?: Json
          created_at?: string
        }
      }
    }
    Functions: {}
    Enums: {}
  }
}
