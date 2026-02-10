import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export function initializeSupabase(url: string, anonKey: string): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anonKey)
  }
  return supabaseInstance
}

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    throw new Error('Supabase not initialized. Call initializeSupabase first.')
  }
  return supabaseInstance
}

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Document', 'Chat', 'Message'],
  endpoints: () => ({}),
})
