from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routes.chat_routes import router as chat_router
from app.routes.ai_search_routes import router as ai_search_router
from app.routes.auth_routes import router as auth_router
from app.routes.subscription_routes import router as subscription_router
from app.routes.files import router as files_router
from app.routes.folders import router as folders_router
from app.routes.ai_overview_routes import router as ai_overview_router
from app.routes.file_rag import router as file_rag_router
from app.routes.video_subtitle_routes import router as video_subtitle_router
from app.database import create_indexes
load_dotenv()

app = FastAPI(
    title="KnowHere AI Backend",
    version="1.0.0"
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    create_indexes()
    print("KnowHere backend started")

@app.get("/")
def root():
    return {"message": "KnowHere backend running"}

@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(video_subtitle_router, prefix="/api")
app.include_router(file_rag_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(subscription_router, prefix="/api")
app.include_router(ai_search_router, prefix="/api")
app.include_router(files_router, prefix="/api")
app.include_router(folders_router, prefix="/api")
app.include_router(ai_overview_router, prefix="/api")