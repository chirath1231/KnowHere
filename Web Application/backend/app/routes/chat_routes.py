from fastapi import APIRouter
from pydantic import BaseModel
from app.services.file_agent import run_agent

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    history: list = []


@router.post("/chat")
def chat(req: ChatRequest):

    reply = run_agent(req.message, req.history)

    return {"reply": reply}