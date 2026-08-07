<!DOCTYPE html>
<html lang="en">

<body>

  <header>
    <h1>Lumina WorkSpace</h1>
    <p>An integrated system for team collaboration and knowledge management.</p>
    <a href="https://acme-project-intelligence.onrender.com/" target="_blank">Access the Application</a>
  </header>

  <section>
    <h2>1. Overview</h2>
    <p>
      The Lumina WorkSpace integrates video conferencing, document management, and an AI-powered
      chat interface into a single, unified environment. Teams may create dedicated Projects to collaborate
      on documents and conduct live meetings. Audio from meetings is transcribed in real time and stored in
      a vector database, enabling the AI assistant to answer questions about past discussions and project materials.
    </p>
  </section>

  <section>
    <h2>2. Technology Stack</h2>
    <ul>
      <li><strong>Frontend:</strong> React, TypeScript, Vite, Tailwind CSS, TanStack Query, LiveKit Components</li>
      <li><strong>Backend:</strong> FastAPI, Python, SQLAlchemy, ARQ, OpenAI SDK, LiveKit Server SDK</li>
      <li><strong>Authentication:</strong> SuperTokens</li>
      <li><strong>Database:</strong> PostgreSQL with pgvector</li>
      <li><strong>Object Storage:</strong> MinIO (S3-compatible)</li>
      <li><strong>Real-time Communication:</strong> LiveKit (WebRTC)</li>
      <li><strong>Cache &amp; Queue:</strong> Redis</li>
      <li><strong>AI &amp; Machine Learning:</strong> OpenAI (GPT-4o, Text Embeddings), HuggingFace TEI (BGE Reranker)</li>
    </ul>
  </section>

  <section>
    <h2>3. Services (Docker Compose)</h2>
    <p>All services are defined in a single <code>docker-compose.yml</code> file:</p>
    <ul>
      <li><strong>frontend</strong> — React + Vite client (Port 3000)</li>
      <li><strong>backend</strong> — FastAPI application (Port 8000)</li>
      <li><strong>postgres</strong> — Relational and vector database (Port 5432)</li>
      <li><strong>redis</strong> — Cache and message broker (Port 6379)</li>
      <li><strong>minio</strong> — File storage (Ports 9000 / 9001)</li>
      <li><strong>livekit</strong> — WebRTC meeting server (Port 7880)</li>
      <li><strong>supertokens</strong> — Authentication server (Port 3567)</li>
      <li><strong>pgadmin</strong> — Database administration UI (Port 5050)</li>
      <li><strong>worker</strong> — Background processing for transcription and document parsing</li>
      <li><strong>reranker</strong> — BAAI/bge-reranker-base via TEI (Port 8001)</li>
    </ul>
  </section>

  <section>
    <h2>4. Key Features</h2>
    <ul>
      <li><strong>Video Conferencing:</strong> High-quality audio and video meetings built on the LiveKit protocol.</li>
      <li><strong>Real-time Transcription:</strong> Meeting audio is transcribed, vectorized, and indexed automatically.</li>
      <li><strong>Document Knowledge Base:</strong> Supports ingestion of PDF, Markdown, and plain text files. Content is extracted and embedded into the project knowledge store.</li>
      <li><strong>RAG Chat Interface:</strong> An AI assistant with full context over all project meetings and documents.</li>
      <li><strong>User Interface:</strong> A dark-themed, glassmorphic design built for clarity and ease of use.</li>
    </ul>
  </section>

  <section>
    <h2>5. Documentation</h2>
    <ul class="doc-links">
      <li><a href="docs/getting_started.md">Getting Started Guide</a></li>
      <li><a href="docs/architecture.md">System Architecture</a></li>
      <li><a href="docs/features.md">Feature Specifications &amp; Implementation Details</a></li>
    </ul>
  </section>

  

</body>
</html>