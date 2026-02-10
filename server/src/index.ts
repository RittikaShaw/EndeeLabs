import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import { DocumentService, RagService } from '@rag/services'

const app = express()
const port = process.env.PORT || 4000

// Middleware
app.use(cors())
app.use(express.json())

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const documentService = new DocumentService(supabase)
const ragService = new RagService(supabase)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Process document endpoint
app.post('/process/:documentId', async (req, res) => {
  const { documentId } = req.params

  try {
    console.log(`Processing document: ${documentId}`)
    await documentService.processDocument(documentId)
    res.json({ success: true, message: 'Document processed successfully' })
  } catch (error) {
    console.error('Error processing document:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Chat endpoint (RAG)
app.post('/chat', async (req, res) => {
  const { sessionId, content } = req.body

  if (!sessionId || !content) {
    res.status(400).json({ error: 'Missing sessionId or content' })
    return
  }

  try {
    console.log(`Chat message for session: ${sessionId}`)

    // Save user message
    const { data: userMessage, error: userError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content,
      })
      .select()
      .single()

    if (userError) throw userError

    // Generate RAG response
    const response = await ragService.query({ sessionId, message: content })

    // Save assistant message
    const { data: assistantMessage, error: assistantError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: response.content,
        sources: response.sources,
      })
      .select()
      .single()

    if (assistantError) throw assistantError

    // Update session title if it's the first message
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('title')
      .eq('id', sessionId)
      .single()

    if (!session?.title) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '')
      await supabase
        .from('chat_sessions')
        .update({ title })
        .eq('id', sessionId)
    }

    res.json(assistantMessage)
  } catch (error) {
    console.error('Error in chat:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
