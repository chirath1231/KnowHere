from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from openai import OpenAI
import os
import json

from app.database import files_collection
from app.models import serialize_doc
from app.dependencies import get_current_user

router = APIRouter(prefix="/ai-search", tags=["AI Search"])

OPENAI_API_KEY = "REDACTED_OPENAI_API_KEY"
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


class AISearchRequest(BaseModel):
    prompt: str


@router.post("")
def ai_search_files(
    payload: AISearchRequest,
    current_user: dict = Depends(get_current_user)
):
    prompt = payload.prompt.strip()

    if not prompt:
        raise HTTPException(status_code=400, detail="Search prompt is required")

    user_files = list(
        files_collection.find({"owner_id": current_user["id"]}).sort("uploaded_at", -1)
    )

    if not user_files:
        return {"matches": []}

    candidates = []
    for file_doc in user_files:
        item = serialize_doc(file_doc)
        candidates.append({
            "id": item["id"],
            "name": item.get("name", ""),
            "type": item.get("type", ""),
            "ai_overview": item.get("ai_overview", ""),
        })

    if not client:
        # fallback keyword search
        q = prompt.lower()
        fallback = [
            item for item in candidates
            if q in item["name"].lower()
            or q in item["type"].lower()
            or q in item["ai_overview"].lower()
        ]
        return {"matches": fallback[:5]}

    instructions = """
You are an AI file search assistant.

You will receive:
1. a user search request
2. a list of files with name, type, and ai_overview

Your job:
- Find the most relevant files for the request
- Prefer semantic meaning over exact keyword matching
- Return at most 5 files
- Return valid JSON only
- JSON format:
{
  "matches": [
    {
      "id": "file_id",
      "reason": "short reason"
    }
  ]
}
"""

    user_input = f"""
User search:
{prompt}

Files:
{json.dumps(candidates, ensure_ascii=False)}
"""

    try:
        response = client.responses.create(
            model="gpt-5.2",
            instructions=instructions,
            input=user_input,
        )

        text = response.output_text.strip() if response.output_text else ""
        if not text:
            return {"matches": []}

        parsed = json.loads(text)
        match_ids = {m["id"]: m.get("reason", "") for m in parsed.get("matches", [])}

        matched_files = []
        for item in candidates:
            if item["id"] in match_ids:
                matched_files.append({
                    **item,
                    "reason": match_ids[item["id"]],
                })

        return {"matches": matched_files[:5]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI search failed: {str(e)}")