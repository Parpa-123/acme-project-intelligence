# Project Intelligence Platform

A comprehensive full-stack application that integrates video conferencing, document management, AI-driven contextual chat, and global knowledge graphs. Built for seamless team collaboration and intelligent meeting spaces.

## Overview

The platform allows users to create **Projects**, where teams can collaborate on documents, host live **Meeting Spaces**, and interact with a project-aware AI. During meetings, real-time audio transcripts are processed, enriched into a knowledge graph, and indexed via vector embeddings, allowing the AI to answer complex queries regarding past meetings, team decisions, and uploaded documents.

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, TanStack Query, LiveKit Components
- **Backend**: FastAPI, Python, SQLAlchemy, ARQ (Async Redis Queue), OpenAI SDK, LiveKit Server SDK
- **Authentication**: SuperTokens
- **Database**: PostgreSQL with `pgvector` (for vector embeddings)
- **Object Storage**: MinIO (S3-compatible)
- **WebRTC**: LiveKit (Real-time Video & Audio)
- **Message Broker & Caching**: Redis
- **AI/ML**: OpenAI (GPT-4o, Text Embeddings), HuggingFace TEI (BGE Reranker)

## Services (Docker Compose)

The entire infrastructure runs on a single `docker-compose.yml` defining the following containers:
- `frontend` (React + Vite, Port: 3000)
- `backend` (FastAPI, Port: 8000)
- `postgres` (pgvector for embeddings, Port: 5432)
- `redis` (Cache & ARQ broker, Port: 6379)
- `minio` (File & Document storage, Ports: 9000 API / 9001 Web UI)
- `livekit` (WebRTC meeting server, Port: 7880)
- `supertokens` (Auth Core server, Port: 3567)
- `pgadmin` (DB Management, Port: 5050)
- `worker` (ARQ background tasks for transcript/document processing)
- `reranker` (TEI Reranker BAAI/bge-reranker-base, Port: 8001)

## Key Features

- **Live Video Meetings**: High-quality video/audio rooms powered by LiveKit.
- **Real-time Transcription & Intelligence**: Meeting audio is transcribed, enriched, and stored in a vector database for semantic search.
- **Project Knowledge Base**: Upload files and documents (PDF, Markdown, text). Background workers extract and embed text into the project's contextual knowledge base.
- **AI Chat & Retrieval-Augmented Generation (RAG)**: Chat with an AI assistant that has deep context about all project meetings and documents.
- **Sleek UI/UX**: A dark-themed, glassmorphic UI designed for an elegant, modern web experience.

## Documentation

See the `docs/` folder for more detailed instructions:
- [Getting Started](docs/getting_started.md)
- [Architecture](docs/architecture.md)
- [Features & Implementation](docs/features.md)
