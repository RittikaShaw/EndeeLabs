export { store } from './store'
export type { RootState, AppDispatch } from './store'
export { useAppDispatch, useAppSelector } from './hooks'
export { initializeSupabase, getSupabase } from './api/base'

// API exports
export {
  documentsApi,
  useGetDocumentsQuery,
  useGetDocumentQuery,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
} from './api/documents.api'

export {
  chatApi,
  useGetChatsQuery,
  useGetChatQuery,
  useCreateChatMutation,
  useSendMessageMutation,
  useDeleteChatMutation,
} from './api/chat.api'
