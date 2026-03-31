from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Literal
from app.services.file_agent import run_agent
from app.dependencies import get_current_user

router = APIRouter(tags=["AI Chat"])
# ===============================
# Models
# ===============================

class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[HistoryMessage] = []


class ChatResponse(BaseModel):
    reply: str


# ===============================
# Chat Endpoint
# ===============================

@router.post("/chat")

def chat(
    req: ChatRequest,
    user=Depends(get_current_user)
):
    """
    AI Chat endpoint

    - Requires authentication
    - Sends user message + history to AI agent
    - Agent can create files, images, PDFs, etc
    """

    try:

        reply = run_agent(
            message=req.message,
            history=req.history,
            user=user
        )

        return ChatResponse(reply=reply)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI agent error: {str(e)}"
        )