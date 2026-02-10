import { Endee, Precision } from 'endee'

export interface Vector {
  id: string
  values: number[]
  metadata?: Record<string, unknown>
}

export interface SearchResult {
  id: string
  score: number
  metadata?: Record<string, unknown>
}

export interface SearchOptions {
  vector: number[]
  topK: number
  filter?: Record<string, unknown>
}

const ENDEE_URL = process.env.ENDEE_API_URL || 'http://localhost:8080'
const ENDEE_TOKEN = process.env.ENDEE_AUTH_TOKEN || ''

export class EndeeClient {
  private client: Endee

  constructor(baseUrl?: string) {
    this.client = new Endee(ENDEE_TOKEN)
    this.client.setBaseUrl(`${baseUrl || ENDEE_URL}/api/v1`)
  }

  async ensureIndex(name: string, dimensions: number): Promise<void> {
    try {
      await this.client.getIndex(name)
    } catch {
      await this.client.createIndex({
        name,
        dimension: dimensions,
        spaceType: 'cosine',
        precision: Precision.FLOAT32,
      })
    }
  }

  async upsertVector(indexName: string, vector: Vector): Promise<void> {
    const index = await this.client.getIndex(indexName)
    await index.upsert([
      {
        id: vector.id,
        vector: vector.values,
        meta: vector.metadata || {},
      },
    ])
  }

  async upsertVectors(indexName: string, vectors: Vector[]): Promise<void> {
    const index = await this.client.getIndex(indexName)
    const batchSize = 100
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize)
      await index.upsert(
        batch.map((v) => ({
          id: v.id,
          vector: v.values,
          meta: v.metadata || {},
        }))
      )
    }
  }

  async search(indexName: string, options: SearchOptions): Promise<SearchResult[]> {
    const index = await this.client.getIndex(indexName)
    const results = await index.query({
      vector: options.vector,
      topK: options.topK,
      filter: options.filter,
    })

    return (results || []).map((r: any) => ({
      id: r.id,
      score: r.similarity ?? r.score ?? 0,
      metadata: r.meta || r.metadata || {},
    }))
  }

  async deleteVector(indexName: string, vectorId: string): Promise<void> {
    const index = await this.client.getIndex(indexName)
    await index.delete([vectorId])
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.listIndexes()
      return true
    } catch {
      return false
    }
  }
}
