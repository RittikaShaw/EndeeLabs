export interface ChunkOptions {
  maxTokens: number
  overlapTokens: number
}

export interface Chunk {
  content: string
  tokenCount: number
}

// Simple token estimation (roughly 4 chars per token for English)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function chunkText(text: string, options: ChunkOptions): Chunk[] {
  const { maxTokens, overlapTokens } = options
  const chunks: Chunk[] = []

  // Clean and normalize text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Split by paragraphs first
  const paragraphs = cleanedText.split(/\n\n+/)

  let currentChunk = ''
  let currentTokens = 0

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph)

    // If paragraph alone exceeds max, split it by sentences
    if (paragraphTokens > maxTokens) {
      // Save current chunk if any
      if (currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          tokenCount: currentTokens,
        })
        currentChunk = ''
        currentTokens = 0
      }

      // Split long paragraph by sentences
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence)

        if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
          chunks.push({
            content: currentChunk.trim(),
            tokenCount: currentTokens,
          })

          // Keep overlap
          const words = currentChunk.split(' ')
          const overlapWords = Math.floor(overlapTokens / 1.5)
          currentChunk = words.slice(-overlapWords).join(' ') + ' '
          currentTokens = estimateTokens(currentChunk)
        }

        currentChunk += sentence
        currentTokens += sentenceTokens
      }
    } else if (currentTokens + paragraphTokens > maxTokens) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: currentTokens,
      })

      // Start new chunk with overlap
      const words = currentChunk.split(' ')
      const overlapWords = Math.floor(overlapTokens / 1.5)
      currentChunk = words.slice(-overlapWords).join(' ') + '\n\n' + paragraph
      currentTokens = estimateTokens(currentChunk)
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
      currentTokens += paragraphTokens
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      tokenCount: currentTokens,
    })
  }

  return chunks
}
