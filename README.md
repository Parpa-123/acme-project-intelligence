<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lumina WorkSpace</title>
  <style>
    body {
      font-family: Georgia, serif;
      color: #1a1a1a;
      background: #ffffff;
      max-width: 860px;
      margin: 60px auto;
      padding: 0 40px;
      line-height: 1.8;
    }

    header {
      text-align: center;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 32px;
      margin-bottom: 48px;
    }

    header h1 {
      font-size: 2rem;
      font-weight: bold;
      letter-spacing: 0.02em;
      margin: 0 0 8px;
    }

    header p {
      font-size: 0.95rem;
      color: #444;
      margin: 0 0 16px;
    }

    header a {
      display: inline-block;
      font-size: 0.9rem;
      color: #1a1a1a;
      text-decoration: none;
      border: 1px solid #1a1a1a;
      padding: 6px 18px;
      letter-spacing: 0.05em;
    }

    header a:hover {
      background: #1a1a1a;
      color: #fff;
    }

    h2 {
      font-size: 1.1rem;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 1px solid #ccc;
      padding-bottom: 6px;
      margin-top: 48px;
      margin-bottom: 16px;
    }

    p {
      margin: 0 0 16px;
      font-size: 0.97rem;
      color: #222;
    }

    ul {
      margin: 0 0 16px;
      padding-left: 24px;
    }

    ul li {
      font-size: 0.97rem;
      color: #222;
      margin-bottom: 6px;
    }

    ul li strong {
      color: #1a1a1a;
    }

    .doc-links {
      list-style: none;
      padding: 0;
    }

    .doc-links li {
      margin-bottom: 6px;
    }

    .doc-links a {
      color: #1a1a1a;
      text-decoration: underline;
      font-size: 0.97rem;
    }

    footer {
      text-align: center;
      border-top: 1px solid #ccc;
      margin-top: 64px;
      padding-top: 20px;
      font-size: 0.85rem;
      color: #666;
    }

    hr {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 40px 0;
    }
  </style>
</head>
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