# Features & Implementation

## 1. Project Management
- **Concept**: Users can create overarching projects. Each project encapsulates its own isolated knowledge base, meeting spaces, members, and intelligent chat.
- **Implementation**: SQLModel tables link `Project` entities to `MeetingSpace`, `Document`, and `UserProjectRole` (for RBAC - Admin/Member/Owner).

## 2. Live Meeting Spaces
- **Concept**: Persistent "rooms" where team members can hop in and out. Think of it like Discord voice channels but for professional teams with video.
- **Implementation**: 
  - FastAPI handles room creation and token generation using `livekit-server-sdk`. 
  - LiveKit server (running in Docker) negotiates WebRTC.
  - React frontend uses `livekit-components-react` (`<LiveKitRoom>`, `<VideoConference>`) to render participant grids and handle hardware devices seamlessly.
  - Active spaces can be toggled to "Archived", moving them to a read-only history tab. This is handled by a status flag on the `MeetingSpace` entity in the DB.

## 3. Real-time Transcripts & Knowledge Graph
- **Concept**: Conversations inside meeting rooms are recorded and processed into actionable knowledge.
- **Implementation**:
  - Raw audio chunks are sent to the backend.
  - Transcription is either done via an STT service or processed post-meeting.
  - ARQ background workers chunk the text, vectorize it using OpenAI embeddings, and store the vectors in `pgvector`.
  - A knowledge extraction pipeline identifies action items, decisions, and entities.

## 4. Document Intelligence
- **Concept**: Users can upload standard files (PDF, TXT, MD) into the project's knowledge base. The AI will read and reference these documents when answering questions.
- **Implementation**:
  - The frontend uploads the file using `multipart/form-data`.
  - FastAPI streams the file into the MinIO bucket.
  - An ARQ task is dispatched to process the file in the background.
  - The worker retrieves the file from MinIO, parses the text (using tools like `pdfplumber` or `PyPDF2`), chunks the content, embeds it, and stores the vectors in Postgres.

## 5. Project Intelligence (AI Chat)
- **Concept**: A dedicated tab where users can converse with an AI that knows everything about the project.
- **Implementation**:
  - A multi-stage RAG (Retrieval-Augmented Generation) pipeline.
  - The user's prompt is vectorized.
  - Nearest neighbors are fetched from `pgvector` (spanning both `documents` and `meeting_transcripts`).
  - The retrieved chunks are re-ranked using the locally hosted HuggingFace TEI BGE Reranker (`reranker` container).
  - The final context is injected into a system prompt for an OpenAI LLM.
  - The response is streamed back to the React UI using Server-Sent Events (SSE).

## 6. Glassmorphic UI/UX
- **Concept**: A beautiful, modern, dark-themed user interface.
- **Implementation**:
  - TailwindCSS configured with deep black/charcoal canvas (`bg-[#050505]`).
  - Panels and cards use `backdrop-blur`, subtle borders (`border-white/10`), and semi-transparent backgrounds (`bg-white/5`) to create depth.
  - Custom React components (`Button.tsx`, `FormInput.tsx`, `Dialog.tsx`) standardize the design language across the application.
