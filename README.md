# RAG App - Document Chat with AI

A full-stack Retrieval-Augmented Generation (RAG) application that lets you upload documents (PDF, DOCX, TXT), process them into vector embeddings, and chat with an AI that answers questions using your documents as context.

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + ShadCN UI
- **State Management**: Redux Toolkit + RTK Query
- **Backend**: Express.js REST API
- **Database**: Supabase (PostgreSQL + Storage)
- **Vector DB**: Endee
- **AI**: Google Gemini (`gemini-embedding-001` for embeddings, `gemini-2.5-flash-lite` for chat)

## Project Structure

```
rag-app/
├── src/                        # React frontend
│   ├── components/
│   │   ├── layout/             # Layout, AppSidebar
│   │   └── ui/                 # ShadCN UI components
│   ├── pages/                  # DocumentsPage, ChatPage
│   ├── hooks/                  # use-toast, use-mobile
│   └── lib/                    # Utilities
├── server/                     # Express API server
│   └── src/
├── packages/
│   ├── store/                  # Redux store + RTK Query APIs
│   ├── database/               # Supabase client & types
│   ├── services/               # Document processing, RAG, embeddings
│   └── endee/                  # Endee vector DB client
└── supabase/
    └── migrations/             # SQL schema migrations
```

## Prerequisites

- **Node.js** >= 20
- **npm** >= 10
- A **Supabase** project (free tier works) - [supabase.com](https://supabase.com)
- An **Endee** vector database instance running locally or remotely
- A **Google Gemini API** key - [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd rag-app
npm install
```

This installs all dependencies across the monorepo (root, server, and all packages via npm workspaces).

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the **SQL Editor** in your Supabase dashboard
3. Run the migration files **in order**:
   - `supabase/migrations/001_initial_schema.sql` - Creates tables (`documents`, `document_chunks`, `chat_sessions`, `chat_messages`) and indexes
   - `supabase/migrations/002_disable_rls_and_fix_schema.sql` - Disables RLS, creates the `documents` storage bucket with public access policies
4. Note your **Project URL**, **Anon Key**, and **Service Role Key** from **Settings > API**

### 3. Set up environment variables

**Root `.env`** - Copy the example and fill in your values:

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
ENDEE_AUTH_TOKEN=your-endee-auth-token

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key
```

**Server `.env`** - Create `server/.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Endee Vector DB
ENDEE_API_URL=http://localhost:8080

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Server Port
PORT=4000
```

### 4. Start Endee vector database

Make sure your Endee instance is running on port 8080 (or update `ENDEE_API_URL` in both `.env` files).

### 5. Run the application

Start both frontend and backend together:

```bash
npm run dev:all
```

Or start them separately in two terminals:

```bash
# Terminal 1 - Frontend (http://localhost:3000)
npm run dev

# Terminal 2 - Backend API (http://localhost:4000)
npm run dev:server
```

## Usage

### Upload Documents

1. Navigate to the **Documents** page from the sidebar
2. Drag & drop or click the upload area to upload PDF, DOCX, or TXT files
3. Wait for processing to complete (status badge changes to "Completed")
4. Click any document to see its details and preview

### Chat with Documents

1. Navigate to the **Chat** page from the sidebar
2. Click **New Chat** to start a session
3. Ask questions about your uploaded documents
4. The AI retrieves relevant chunks and generates answers with source citations
5. Hover over source badges in responses to see the matched content and similarity score

## Architecture

### Document Upload Flow

```
User uploads file
  → Stored in Supabase Storage
  → Document record created (status: pending)
  → POST /process/:documentId triggers processing:
      → Extract text (pdf-parse / mammoth / raw text)
      → Chunk text (~500 tokens, 100 token overlap)
      → Generate embeddings (Gemini gemini-embedding-001, 3072 dimensions)
      → Store vectors in Endee
      → Save chunks to Supabase
  → Status updated to "completed"
```

### Chat Query (RAG) Flow

```
User sends message
  → Generate query embedding (Gemini)
  → Vector similarity search in Endee
  → Fetch matching chunk content from Supabase
  → Build prompt with context + chat history
  → Generate response (Gemini 2.5 Flash Lite)
  → Save message and source references
```

## API Endpoints

| Method | Endpoint              | Description                            |
| ------ | --------------------- | -------------------------------------- |
| GET    | `/health`             | Health check                           |
| POST   | `/process/:documentId`| Process an uploaded document            |
| POST   | `/chat`               | Send a chat message (body: `{ sessionId, content }`) |

## Available Scripts

| Script             | Description                              |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Start Vite dev server (port 3000)        |
| `npm run dev:server`| Start Express server (port 4000)        |
| `npm run dev:all`  | Start both frontend and backend          |
| `npm run build`    | Build frontend for production            |
| `npm run build:server` | Build server for production          |
| `npm run type-check`| Run TypeScript type checking             |
| `npm run lint`     | Run ESLint                               |

## License

MIT
