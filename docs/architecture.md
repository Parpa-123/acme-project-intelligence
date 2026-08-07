# System Architecture

The application is built on a modern containerized microservices architecture to ensure scalability, modularity, and high availability.

## Component Diagram

- **Frontend Client (Vite + React)**: Communicates via REST APIs to the backend and WebSockets/WebRTC to LiveKit.
- **Backend API (FastAPI)**: Serves REST endpoints, validates auth tokens, processes immediate requests, and enqueues heavy tasks to ARQ.
- **Background Worker (ARQ)**: Consumes tasks from Redis to process long-running jobs (e.g., parsing PDFs, generating vector embeddings via OpenAI, inserting data to pgvector).
- **PostgreSQL Database**: Primary data store for Users, Projects, Meetings, and Documents. Employs `pgvector` extension to store and query dense vector embeddings.
- **MinIO**: Acts as an S3-compatible object store. Stores raw user uploads (PDFs, docs) and potentially meeting recordings.
- **LiveKit Server**: Manages WebRTC connections, routing audio and video streams between meeting participants.
- **Redis**: Functions as the task queue broker for ARQ workers and provides high-speed caching capabilities.
- **SuperTokens Core**: Independent authentication service handling user signups, logins, and session management.
- **TEI Reranker**: HuggingFace Text-Embeddings-Inference container running `BAAI/bge-reranker-base`. Used to re-rank semantic search results from pgvector for improved AI retrieval accuracy.

## Data Flow: RAG (Retrieval-Augmented Generation)

When a user asks the AI a question in the **Project Intelligence** tab:
1. The backend receives the natural language query.
2. The query is converted into a vector embedding using OpenAI's embedding API.
3. The backend executes a vector similarity search (`<->` operator in `pgvector`) against the `documents` and `meeting_transcripts` tables.
4. The top $N$ closest matches are fetched.
5. These candidate chunks are sent to the **TEI Reranker** container to re-score and re-order them based on deep contextual relevance to the query.
6. The top $K$ reranked chunks are injected into the context window of an OpenAI LLM (e.g., `gpt-4o`).
7. The LLM generates a comprehensive, contextually accurate answer and streams it back to the client.

## Real-time Meetings

- When a meeting is started, FastAPI creates a room via the `LiveKit Server SDK` and provisions an access token for the user.
- The React frontend uses `@livekit/components-react` to join the room via WebRTC.
- Audio and video are routed through the LiveKit server, ensuring low-latency communication even for large groups.
