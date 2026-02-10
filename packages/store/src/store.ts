import { configureStore } from '@reduxjs/toolkit'
import { documentsApi } from './api/documents.api'
import { chatApi } from './api/chat.api'

export const store = configureStore({
  reducer: {
    [documentsApi.reducerPath]: documentsApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(documentsApi.middleware)
      .concat(chatApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
