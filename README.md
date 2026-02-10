# RAG App - Document Chat with AI

A full-stack **Retrieval-Augmented Generation (RAG)** application demonstrating how **vector search** powers intelligent document Q&A. Upload documents (PDF, DOCX, TXT), automatically convert them to vector embeddings, and chat with an AI that retrieves relevant context using semantic similarity search.

## What is RAG?

**Retrieval-Augmented Generation** combines the power of:
1. **Vector Search** - Finding semantically similar content using embedding vectors
2. **Large Language Models** - Generating human-like responses

Instead of relying solely on the LLM's training data, RAG retrieves relevant information from your documents and uses it as context, enabling accurate answers grounded in your actual content.

## How Vector Search Works in This App

### Document Ingestion Pipeline

```
+------------------+      +------------------+      +------------------+
|   Upload File    | ---> |   Extract Text   | ---> |  Chunk Text      |
|  (PDF/DOCX/TXT)  |      |  (pdf-parse,     |      |  (~500 tokens,   |
|                  |      |   mammoth)       |      |   100 overlap)   |
+------------------+      +------------------+      +------------------+
                                                            |
                                                            v
+------------------+      +------------------+      +------------------+
|  Store Metadata  | <--- |  Store Vectors   | <--- | Generate Embed   |
|  (Supabase)      |      |  (Endee DB)      |      | (Gemini 3072-d)  |
+------------------+      +------------------+      +------------------+
```

### RAG Query Flow

```
+------------------+      +------------------+      +------------------+
|  User Question   | ---> | Generate Query   | ---> | Vector Search    |
|  "What is X?"    |      | Embedding        |      | (Cosine Sim)     |
+------------------+      +------------------+      +------------------+
                                                            |
                                                            v
+------------------+      +------------------+      +------------------+
|  Return Answer   | <--- |  LLM Generate    | <--- | Retrieve Top-K   |
|  + Sources       |      |  (Gemini Flash)  |      | Matching Chunks  |
+------------------+      +------------------+      +------------------+
```

## Key Features

- **Semantic Search** - Find relevant content based on meaning, not just keywords
- **Multi-format Support** - Upload PDF, DOCX, and TXT files
- **Real-time Processing** - Documents are chunked and embedded automatically
- **Source Citations** - Every AI response shows which document chunks were used
- **Similarity Scores** - View how closely each source matched your query
- **Chat History** - Conversations are preserved with full context
- **Dark/Light Mode** - Modern UI with theme support

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, ShadCN UI |
| **State** | Redux Toolkit + RTK Query |
| **Backend** | Express.js REST API |
| **Database** | Supabase (PostgreSQL + File Storage) |
| **Vector DB** | Endee (cosine similarity search) |
| **AI/ML** | Google Gemini (`gemini-embedding-001` for embeddings, `gemini-2.5-flash-lite` for chat) |

## Project Structure

```
rag-app/
├── src/                        # React frontend
│   ├── components/
│   │   ├── layout/             # Layout, AppSidebar
│   │   └── ui/                 # ShadCN UI components
│   ├── pages/                  # DocumentsPage, ChatPage
│   ├── hooks/                  # Custom React hooks
│   └── lib/                    # Utilities
├── server/                     # Express API server
│   └── src/
├── packages/
│   ├── store/                  # Redux store + RTK Query APIs
│   ├── database/               # Supabase client & types
│   ├── services/               # Document processing, RAG, embeddings
│   └── endee/                  # Endee vector DB client wrapper
├── supabase/
│   └── migrations/             # SQL schema migrations
└── docker-compose.yml          # Endee container config
```

## Prerequisites

- **Node.js** >= 20
- **npm** >= 10
- **Docker** (for running Endee locally)
- A **Supabase** project (free tier works) - [supabase.com](https://supabase.com)
- A **Google Gemini API** key - [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/vishal-coder-jpg/rag-chat-agent.git
cd rag-chat-agent
npm install
```

### 2. Start Endee Vector Database

```bash
docker-compose up -d
```

Verify it's running:
```bash
curl http://localhost:8080/api/v1/index/list
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_disable_rls_and_fix_schema.sql`
3. Copy your credentials from **Settings > API**

### 4. Configure environment variables

**Root `.env`:**
```bash
cp .env.example .env
```

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Server
VITE_API_URL=http://localhost:4000

# Endee Vector DB
ENDEE_API_URL=http://localhost:8080
ENDEE_AUTH_TOKEN=

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key
```

**Server `.env`:**
```bash
cp server/.env.example server/.env
```

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENDEE_API_URL=http://localhost:8080
GEMINI_API_KEY=your-gemini-api-key
PORT=4000
```

### 5. Run the application

```bash
npm run dev:all
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### 1. Upload Documents
- Navigate to **Documents** page
- Drag & drop or click to upload PDF, DOCX, or TXT files
- Wait for processing (status changes to "Completed")

### 2. Chat with Your Documents
- Navigate to **Chat** page
- Click **New Chat**
- Ask questions about your uploaded documents
- View source citations with similarity scores

## Vector Search Implementation

### Embedding Generation
```typescript
// Using Gemini embedding model (3072 dimensions)
const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' })
const result = await model.embedContent(text)
const embedding = result.embedding.values // [0.123, -0.456, ...]
```

### Storing in Endee
```typescript
await endeeClient.upsertVector('documents', {
  id: chunkId,
  values: embedding,        // 3072-dimensional vector
  metadata: { documentId, chunkIndex }
})
```

### Similarity Search
```typescript
const results = await endeeClient.search('documents', {
  vector: queryEmbedding,   // User question as vector
  topK: 5,                  // Return top 5 matches
})
// Returns: [{ id, score: 0.89 }, { id, score: 0.76 }, ...]
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/process/:documentId` | Process document (chunk + embed + store vectors) |
| POST | `/chat` | RAG query (embed question → search → generate response) |

## Database Schema

### Documents
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Display name |
| file_type | TEXT | pdf, docx, txt |
| status | TEXT | pending, processing, completed, failed |
| chunk_count | INT | Number of chunks created |

### Document Chunks
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| document_id | UUID | Foreign key |
| chunk_index | INT | Order within document |
| content | TEXT | Chunk text content |
| embedding_id | TEXT | Reference to vector in Endee |

### Chat Messages
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | Chat session reference |
| role | TEXT | user or assistant |
| content | TEXT | Message content |
| sources | JSONB | Array of source citations with scores |

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend (port 3000) |
| `npm run dev:server` | Start backend (port 4000) |
| `npm run dev:all` | Start both frontend and backend |
| `npm run build` | Build for production |
| `npm run type-check` | TypeScript type checking |
| `npm run lint` | Run ESLint |

## Docker Commands

```bash
docker-compose up -d       # Start Endee
docker-compose down        # Stop Endee
docker-compose logs endee  # View logs
```

## License

MIT
