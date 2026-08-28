# KnowHere

KnowHere is an AI-powered cloud storage platform. Users upload files to Oracle Cloud Infrastructure (OCI) Object Storage and get AI features on top of that storage: natural-language file search, per-file AI summaries, a chat/RAG assistant that can answer questions about file contents (documents, images, video), an autonomous file agent that can create/search/generate content, and automatic video subtitle generation.

The repository is a monorepo containing a working web application plus placeholders for future mobile and desktop clients.

## Repository structure

```
KnowHere/
├── Web Application/          # The actual product today
│   ├── backend/               # FastAPI + MongoDB API
│   └── frontend/              # Next.js 14 web client
├── Mobile Application/        # Empty — reserved for a future mobile client
├── Dekstop application/       # Empty — reserved for a future desktop client
├── genai.ipynb                # Prototyping notebook for the AI file agent
│                               # (file creation, PDF/image generation, web search)
├── about_sri_lanka.txt        # Sample source files used to test AI file
├── sri_lanka.pdf / .png       #   features (RAG chat, summaries, image analysis)
└── harvard_architecture.pdf / .png
```

## Features

**Storage & organization**
- Upload, preview, download, and delete files, backed by OCI Object Storage
- Folders for organizing files
- Trash view in the frontend

**AI features**
- **AI Search** — natural-language search across a user's files; an LLM ranks files by relevance to the query instead of plain keyword matching
- **AI Overview** — an auto-generated summary/description stored per file, regenerable on demand
- **File RAG chat** — chat with a specific file: text documents are chunked and embedded (`sentence-transformers`) for retrieval, images and videos are answered directly via vision models (OpenAI / Gemini), with per-file chat session history
- **AI File Agent** — a tool-calling assistant that can create text/PDF files, generate images, run web searches, and trigger video subtitle generation
- **Video subtitles** — extracts audio, transcribes it, and burns/generates subtitles for uploaded videos

**Accounts**
- JWT-based registration/login
- Subscription plans (storage tiers / feature gating)

## Tech stack

**Frontend** — Next.js 14, React 18, TypeScript, Tailwind CSS, Axios, cookie-based auth via middleware route protection

**Backend** — FastAPI, MongoDB (PyMongo), JWT auth (`python-jose`, `passlib`), Pydantic settings

**AI / ML** — OpenAI (`gpt-4o-mini` for chat/vision/transcription), Google Gemini, `sentence-transformers` for embeddings, OpenCV / `ffmpeg-python` for video frame & audio extraction, `pypdf` / `python-docx` / `openpyxl` for document parsing, DuckDuckGo search for web lookups

**Storage** — Oracle Cloud Infrastructure (OCI) Object Storage

## Getting started

### Backend

```bash
cd "Web Application/backend"
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

> `requirements.txt` only lists the core FastAPI stack. The AI/document/video features also require: `pydantic-settings`, `pymongo`, `python-dotenv`, `openai`, `google-genai`, `sentence-transformers`, `numpy`, `opencv-python`, `ffmpeg-python`, `pypdf`, `python-docx`, `openpyxl`, `oci`, `duckduckgo-search`, `requests`. Install these as needed, or freeze a complete `requirements.txt` from a working environment.

Copy `.env.example` to `.env` and fill in real values:

```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=knowhere
SECRET_KEY=<random secret>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
OCI_CONFIG_PROFILE=DEFAULT
OCI_BUCKET_NAME=<your bucket>
OCI_NAMESPACE=<your namespace>
GEMINI_API_KEY=<your gemini key>
OCI_CONFIG_FILE=/path/to/.oci/config
OPENAI_API_KEY=<your openai key>
```

Run the API:

```bash
python run.py
# or
uvicorn app.main:app --reload
```

The API serves on `http://localhost:8000`, with all feature routers mounted under `/api`.

### Frontend

```bash
cd "Web Application/frontend"
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend expects the backend at the URL configured in `lib/api.ts` / `.env.local`.

## API overview

All routes are mounted under `/api`.

| Router | Prefix | Purpose |
|---|---|---|
| `auth_routes` | `/auth` | Register, login (JWT) |
| `files` | `/files` | Upload, list, preview, download, delete files |
| `folders` | `/folders` | Create and list folders |
| `ai_search_routes` | `/ai-search` | Natural-language file search |
| `ai_overview_routes` | `/ai-overview` | Get/update/regenerate per-file AI summaries |
| `file_rag` | `/file-rag` | Analyse and chat with a file (RAG for text, vision for images/video) |
| `chat_routes` | `/chat` | AI file agent (tool-calling: create files, images, web search, subtitles) |
| `video_subtitle_routes` | `/videos` | Generate and attach subtitles to a video file |
| `subscription_routes` | `/subscriptions` | List subscription plans |

## Roadmap

- `Mobile Application/` and `Dekstop application/` are currently empty and reserved for future native clients built against the existing backend API.
- `genai.ipynb` contains the original prototype of the AI file agent (Gradio UI) that the backend's `file_agent.py` service evolved from.
