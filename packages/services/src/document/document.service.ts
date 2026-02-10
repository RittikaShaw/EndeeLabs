import type { SupabaseClient } from '@supabase/supabase-js'
import { EndeeClient } from '@rag/endee'
import { EmbeddingService } from '../embedding/embedding.service'
import { extractText } from './extractor'
import { chunkText } from './chunker'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

export class DocumentService {
  private supabase: AnySupabaseClient
  private endee: EndeeClient
  private embeddingService: EmbeddingService

  constructor(supabase: AnySupabaseClient) {
    this.supabase = supabase
    this.endee = new EndeeClient()
    this.embeddingService = new EmbeddingService()
  }

  async processDocument(documentId: string): Promise<void> {
    console.log(`Processing document: ${documentId}`)

    // Update status to processing
    await this.updateStatus(documentId, 'processing')

    try {
      // Get document info
      const { data: document, error } = await this.supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (error || !document) {
        throw new Error('Document not found')
      }

      // Download file from storage
      const { data: fileData, error: downloadError } = await this.supabase.storage
        .from('documents')
        .download(document.file_path)

      if (downloadError || !fileData) {
        throw new Error('Failed to download file')
      }

      // Extract text from file
      const buffer = Buffer.from(await fileData.arrayBuffer())
      const text = await extractText(buffer, document.file_type)

      console.log(`Extracted ${text.length} characters from document`)

      // Chunk the text
      const chunks = chunkText(text, {
        maxTokens: 500,
        overlapTokens: 100,
      })

      console.log(`Created ${chunks.length} chunks`)

      // Generate embeddings for all chunks
      const embeddings = await this.embeddingService.generateBatch(
        chunks.map((c) => c.content)
      )

      console.log(`Generated ${embeddings.length} embeddings`)

      // Ensure index exists in Endee
      // gemini-embedding-001 returns 3072-dimensional vectors
      await this.endee.ensureIndex('documents', 3072)

      // Store embeddings in Endee and chunks in Supabase
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const embedding = embeddings[i]
        const embeddingId = `${documentId}-${i}`

        // Store in Endee
        await this.endee.upsertVector('documents', {
          id: embeddingId,
          values: embedding,
          metadata: {
            documentId,
            chunkIndex: i,
          },
        })

        // Store chunk in Supabase
        await this.supabase.from('document_chunks').insert({
          document_id: documentId,
          chunk_index: i,
          content: chunk.content,
          token_count: chunk.tokenCount,
          embedding_id: embeddingId,
        })
      }

      // Update document status and chunk count
      await this.supabase
        .from('documents')
        .update({
          status: 'completed',
          chunk_count: chunks.length,
        })
        .eq('id', documentId)

      console.log(`Document ${documentId} processed successfully`)
    } catch (error) {
      console.error('Error processing document:', error)
      await this.updateStatus(documentId, 'failed')
      throw error
    }
  }

  private async updateStatus(
    documentId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    await this.supabase
      .from('documents')
      .update({ status })
      .eq('id', documentId)
  }
}
