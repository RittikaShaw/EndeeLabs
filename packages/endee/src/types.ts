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

export interface IndexInfo {
  name: string
  dimensions: number
  vectorCount: number
}
