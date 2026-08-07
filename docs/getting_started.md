# Getting Started

## Prerequisites

Ensure you have the following installed on your machine:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine + Docker Compose V2
- Git

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd Project-1
   ```

2. **Configure Environment Variables:**
   - The backend uses a `.env` file located at `backend/.env`. Ensure you provide necessary API keys (like OpenAI).
   - Example `backend/.env` configuration:
     ```env
     OPENAI_API_KEY=sk-your-openai-api-key
     DATABASE_URL=postgresql+psycopg://appuser:apppassword@postgres:5432/appdb
     REDIS_HOST=redis
     MINIO_URL=http://minio:9000
     SUPERTOKENS_CONNECTION_URI=http://supertokens:3567
     LIVEKIT_API_KEY=devkey
     LIVEKIT_API_SECRET=secret
     LIVEKIT_URL=http://livekit:7880
     TEI_ENDPOINT=http://reranker:8000
     ```
   - The frontend configuration is in `frontend/.env`:
     ```env
     VITE_API_URL=http://localhost:8000
     ```

## Running the Application

This project is fully containerized. You can run all services with a single command from the root directory:

```bash
docker compose up --build -d
```

This will build the frontend and backend images, pull all required external images (Postgres, LiveKit, SuperTokens, MinIO, Redis, TEI Reranker), and start the stack.

### Accessing the Services

- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **pgAdmin (Database UI)**: [http://localhost:5050](http://localhost:5050)
- **MinIO Console**: [http://localhost:9001](http://localhost:9001)

## Stopping the Services

To stop and remove the containers without deleting data:
```bash
docker compose down
```

To stop, remove containers, AND wipe all persistent volume data (Postgres database, MinIO files):
```bash
docker compose down -v
```
