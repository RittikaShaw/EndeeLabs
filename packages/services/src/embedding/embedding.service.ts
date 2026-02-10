import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const EMBEDDING_MODEL = 'gemini-embedding-001'
const BATCH_SIZE = 100

export class EmbeddingService {
  private model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL })

  async generate(text: string): Promise<number[]> {
    const result = await this.model.embedContent(text)
    return result.embedding.values
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = []

    // Process in batches to avoid rate limits
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE)

      // Gemini doesn't have native batch embedding, so we process sequentially
      for (const text of batch) {
        const result = await this.model.embedContent(text)
        embeddings.push(result.embedding.values)
      }
    }

    return embeddings
  }
}
