import type { SupabaseClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { EndeeClient } from '@rag/endee'
import { EmbeddingService } from '../embedding/embedding.service'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const CHAT_MODEL = 'gemini-2.5-flash-lite'
const MAX_CONTEXT_CHUNKS = 10
const SIMILARITY_THRESHOLD = 0.3

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

interface Source {
  documentId: string
  documentTitle: string
  chunkIndex: number
  content: string
  similarity: number
}

interface QueryResult {
  content: string
  sources: Source[]
}

export class RagService {
  private supabase: AnySupabaseClient
  private endee: EndeeClient
  private embeddingService: EmbeddingService
  private model = genAI.getGenerativeModel({ model: CHAT_MODEL })

  constructor(supabase: AnySupabaseClient) {
    this.supabase = supabase
    this.endee = new EndeeClient()
    this.embeddingService = new EmbeddingService()
  }

  async query(params: {
    sessionId: string
    message: string
    documentIds?: string[]
  }): Promise<QueryResult> {
    const { sessionId, message, documentIds } = params

    // Generate embedding for the query
    const queryEmbedding = await this.embeddingService.generate(message)

    // Search for similar vectors in Endee
    console.log('Searching Endee for similar vectors...')
    const searchResults = await this.endee.search('documents', {
      vector: queryEmbedding,
      topK: MAX_CONTEXT_CHUNKS,
      filter: documentIds?.length
        ? { documentId: { $in: documentIds } }
        : undefined,
    })

    console.log(`Endee returned ${searchResults.length} results:`, searchResults.map(r => ({ id: r.id, score: r.score })))

    // Filter by similarity threshold
    const relevantResults = searchResults.filter(
      (r) => r.score >= SIMILARITY_THRESHOLD
    )

    console.log(`After filtering (threshold ${SIMILARITY_THRESHOLD}): ${relevantResults.length} results`)

    // Fetch chunk content from Supabase
    const embeddingIds = relevantResults.map((r) => r.id)

    interface ChunkData {
      id: string
      document_id: string
      chunk_index: number
      content: string
      embedding_id: string
      documents: { name: string } | null
    }

    let chunks: ChunkData[] = []

    if (embeddingIds.length > 0) {
      const { data } = await this.supabase
        .from('document_chunks')
        .select(`
          id,
          document_id,
          chunk_index,
          content,
          embedding_id,
          documents:document_id (name)
        `)
        .in('embedding_id', embeddingIds)

      // Map the result to handle array vs single object from Supabase join
      chunks = (data || []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        document_id: d.document_id as string,
        chunk_index: d.chunk_index as number,
        content: d.content as string,
        embedding_id: d.embedding_id as string,
        documents: Array.isArray(d.documents)
          ? d.documents[0] as { name: string } | null
          : d.documents as { name: string } | null,
      }))
    }

    // Build sources array
    const sources: Source[] = []
    const chunkMap = new Map(chunks.map((c) => [c.embedding_id, c]))

    for (const result of relevantResults) {
      const chunk = chunkMap.get(result.id)
      if (chunk) {
        sources.push({
          documentId: chunk.document_id,
          documentTitle: chunk.documents?.name || 'Unknown',
          chunkIndex: chunk.chunk_index,
          content: chunk.content.slice(0, 200) + '...',
          similarity: result.score,
        })
      }
    }

    // Build context from chunks
    const context = sources
      .map((s, i) => {
        const chunk = chunks.find(c => c.embedding_id === relevantResults[i]?.id)
        return `[Source ${i + 1}] ${s.documentTitle}:\n${chunk?.content || ''}`
      })
      .join('\n\n---\n\n')

    // Get chat history
    const { data: history } = await this.supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10)

    // Build conversation history for Gemini
    const chatHistory = (history || []).map((h: { role: string; content: string }) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }))

    // Create chat with history
    const chat = this.model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    })

    // Build the prompt with context
    const prompt = `${this.getSystemPrompt(context)}

User question: ${message}`

    // Generate response
    const result = await chat.sendMessage(prompt)
    const response = result.response
    const content = response.text() || 'I could not generate a response.'

    return {
      content,
      sources,
    }
  }

  private getSystemPrompt(context: string): string {
    return `You are a helpful assistant that answers questions based on the provided documents.

Use the following context to answer the user's question. If the answer is not in the context, say that you don't have enough information to answer.

When referencing information, mention which source it came from (e.g., "According to Source 1...").

Context:
${context || 'No relevant context found.'}

Guidelines:
- Be concise and accurate
- If you're unsure, say so
- Cite your sources when possible
- Stay on topic and answer the question directly`
  }
}
