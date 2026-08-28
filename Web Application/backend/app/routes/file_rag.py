from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from bson.errors import InvalidId

from google import genai
from google.genai import types

from typing import Optional
import tempfile
import os
import math
import base64

import cv2
import ffmpeg

from openai import OpenAI

from app.config import settings
from app.db import files_collection, file_chat_sessions_collection
from app.services.oci_storage_service import oci_storage
from app.services.file_rag_service import (
    extract_text_from_bytes,
    build_file_chunks,
    get_or_create_chat_session,
    answer_from_file,
)
from app.auth import get_current_user

router = APIRouter(prefix="/file-rag", tags=["File RAG"])

gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)


class AnalyseFileRequest(BaseModel):
    file_id: str


class ChatFileRequest(BaseModel):
    file_id: str
    message: str
    session_id: str | None = None


def get_owner_id_from_user(current_user):
    owner_id = (
        current_user.get("id")
        or current_user.get("user_id")
        or current_user.get("_id")
    )

    if not owner_id:
        raise HTTPException(
            status_code=401,
            detail=f"Could not determine current user id. current_user keys: {list(current_user.keys())}"
        )

    return str(owner_id)


def parse_object_id(file_id: str) -> ObjectId:
    try:
        return ObjectId(file_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid file id format")


def find_user_file(file_id: str, owner_id: str):
    object_id = parse_object_id(file_id)

    file_doc = files_collection.find_one({
        "_id": object_id,
        "owner_id": owner_id,
    })

    if not file_doc:
        file_doc = files_collection.find_one({
            "_id": object_id,
        })

    if not file_doc:
        file_doc = files_collection.find_one({
            "_id": file_id,
            "owner_id": owner_id,
        })

    if not file_doc:
        file_doc = files_collection.find_one({
            "_id": file_id,
        })

    return file_doc


def append_message(session_id: str, role: str, content: str):
    file_chat_sessions_collection.update_one(
        {"_id": session_id},
        {
            "$push": {
                "messages": {
                    "role": role,
                    "content": content,
                }
            }
        }
    )


def is_image_file(content_type: str | None, filename: str | None) -> bool:
    content_type = (content_type or "").lower()
    filename = (filename or "").lower()

    if content_type.startswith("image/"):
        return True

    return filename.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"))


def is_video_file(content_type: str | None, filename: str | None) -> bool:
    content_type = (content_type or "").lower()
    filename = (filename or "").lower()

    if content_type.startswith("video/"):
        return True

    return filename.endswith((".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"))


def normalize_image_mime_type(content_type: str | None, filename: str | None) -> str:
    content_type = (content_type or "").lower()
    filename = (filename or "").lower()

    if content_type.startswith("image/"):
        return content_type

    if filename.endswith(".png"):
        return "image/png"
    if filename.endswith(".jpg") or filename.endswith(".jpeg"):
        return "image/jpeg"
    if filename.endswith(".webp"):
        return "image/webp"
    if filename.endswith(".gif"):
        return "image/gif"
    if filename.endswith(".bmp"):
        return "image/bmp"

    return "image/jpeg"


def get_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def truncate_text(text: str, max_length: int = 12000) -> str:
    text = (text or "").strip()
    if len(text) <= max_length:
        return text
    return text[:max_length] + "..."


def answer_image_with_gemini(
    file_bytes: bytes,
    file_name: str,
    content_type: str,
    question: str,
    ai_overview: str = "",
):
    mime_type = normalize_image_mime_type(content_type, file_name)

    prompt = f"""
You are an AI assistant that answers questions about an uploaded image.

AI overview:
{ai_overview if ai_overview else "No AI overview available."}

User question:
{question}

Instructions:
- Use the image as the main source of truth.
- Use the AI overview only as supporting context.
- If the answer is not visible in the image, say that clearly.
- Give a clear and helpful answer.
"""

    response = gemini_client.models.generate_content(
        model=getattr(settings, "GEMINI_VISION_MODEL", "gemini-2.5-flash"),
        contents=[
            prompt,
            types.Part.from_bytes(
                data=file_bytes,
                mime_type=mime_type,
            ),
        ],
    )

    return response.text if response.text else "No answer generated for this image."


def extract_audio_from_video_bytes(file_bytes: bytes, suffix: str = ".mp4"):
    temp_video = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_video.write(file_bytes)
    temp_video.flush()
    temp_video.close()

    temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    temp_audio.close()

    (
        ffmpeg
        .input(temp_video.name)
        .output(temp_audio.name, ac=1, ar=16000, format="mp3")
        .overwrite_output()
        .run(quiet=True)
    )

    return temp_video.name, temp_audio.name


def transcribe_video_audio_with_openai(audio_path: str) -> str:
    with open(audio_path, "rb") as audio_file:
        transcript = openai_client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_file,
        )

    text = getattr(transcript, "text", None)
    return (text or "").strip()


def extract_video_frames(file_bytes: bytes, suffix: str = ".mp4", max_frames: int = 4) -> list[str]:
    temp_video = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_video.write(file_bytes)
    temp_video.flush()
    temp_video.close()

    cap = cv2.VideoCapture(temp_video.name)
    if not cap.isOpened():
        try:
            os.remove(temp_video.name)
        except Exception:
            pass
        return []

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if frame_count <= 0:
        cap.release()
        try:
            os.remove(temp_video.name)
        except Exception:
            pass
        return []

    positions = []
    for i in range(max_frames):
        pos = math.floor((i + 1) * frame_count / (max_frames + 1))
        positions.append(pos)

    encoded_frames = []

    for pos in positions:
        cap.set(cv2.CAP_PROP_POS_FRAMES, pos)
        ok, frame = cap.read()
        if not ok:
            continue

        ok, buf = cv2.imencode(".jpg", frame)
        if not ok:
            continue

        encoded_frames.append(base64.b64encode(buf.tobytes()).decode("utf-8"))

    cap.release()

    try:
        os.remove(temp_video.name)
    except Exception:
        pass

    return encoded_frames


def answer_video_with_openai(
    filename: str,
    content_type: Optional[str],
    file_bytes: bytes,
    question: str,
    ai_overview: str = "",
) -> str:
    ext = get_extension(filename)
    video_suffix = f".{ext}" if ext else ".mp4"

    temp_video_path = None
    temp_audio_path = None

    try:
        temp_video_path, temp_audio_path = extract_audio_from_video_bytes(file_bytes, suffix=video_suffix)
        transcript_text = transcribe_video_audio_with_openai(temp_audio_path)
        frames_b64 = extract_video_frames(file_bytes, suffix=video_suffix, max_frames=4)

        content = [{
            "type": "input_text",
            "text": (
                "Answer the user's question about this uploaded video. "
                "Use the sampled frames as visual evidence and the transcript as audio evidence. "
                "Use the AI overview only as supporting context.\n\n"
                f"File name: {filename}\n"
                f"Content type: {content_type or 'unknown'}\n\n"
                f"AI overview:\n{ai_overview if ai_overview else 'No AI overview available.'}\n\n"
                f"Transcript:\n{truncate_text(transcript_text, 12000) if transcript_text else 'No transcript available.'}\n\n"
                f"User question:\n{question}\n\n"
                "Instructions:\n"
                "- Base the answer on the video frames and transcript.\n"
                "- If the answer is uncertain, say so clearly.\n"
                "- Give a helpful direct answer.\n"
            )
        }]

        for frame_b64 in frames_b64:
            content.append({
                "type": "input_image",
                "image_url": f"data:image/jpeg;base64,{frame_b64}",
            })

        response = openai_client.responses.create(
            model="gpt-4.1-mini",
            input=[{
                "role": "user",
                "content": content
            }]
        )

        text = getattr(response, "output_text", None)
        if text and text.strip():
            return text.strip()

        return "No answer could be generated for this video."
    finally:
        for path in [temp_video_path, temp_audio_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass


def analyse_logic(payload: AnalyseFileRequest, current_user):
    owner_id = get_owner_id_from_user(current_user)

    file_doc = find_user_file(payload.file_id, owner_id)

    if not file_doc:
        raise HTTPException(
            status_code=404,
            detail=f"File not found for file_id={payload.file_id} owner_id={owner_id}"
        )

    object_name = file_doc.get("object_name")
    bucket_name = file_doc.get("bucket_name")
    file_name = file_doc.get("name", "file")
    content_type = file_doc.get("content_type", "")
    ai_overview = file_doc.get("aiOverview") or file_doc.get("ai_overview") or ""

    if not object_name:
        raise HTTPException(status_code=400, detail="File object_name is missing")

    file_bytes = oci_storage.download_file(
        object_name=object_name,
        bucket_name=bucket_name,
    )

    session = get_or_create_chat_session(
        file_id=payload.file_id,
        owner_id=owner_id,
        title=f"Chat about {file_name}",
    )

    if is_image_file(content_type, file_name):
        return {
            "message": "Image file ready for AI analysis",
            "session_id": session["_id"],
            "chunk_count": 0,
            "file_name": file_name,
            "mode": "image",
            "ai_overview": ai_overview,
        }

    if is_video_file(content_type, file_name):
        return {
            "message": "Video file ready for AI analysis",
            "session_id": session["_id"],
            "chunk_count": 0,
            "file_name": file_name,
            "mode": "video",
            "ai_overview": ai_overview,
        }

    text = extract_text_from_bytes(file_bytes, file_name, content_type)

    if not text.strip():
        raise HTTPException(status_code=400, detail="This file has no readable text")

    chunk_count = build_file_chunks(
        file_id=payload.file_id,
        owner_id=owner_id,
        filename=file_name,
        file_text=text,
    )

    return {
        "message": "File analysed successfully",
        "session_id": session["_id"],
        "chunk_count": chunk_count,
        "file_name": file_name,
        "mode": "text",
    }


@router.post("/analyse")
def analyse_file(payload: AnalyseFileRequest, current_user=Depends(get_current_user)):
    return analyse_logic(payload, current_user)


@router.post("/analyze")
def analyze_file(payload: AnalyseFileRequest, current_user=Depends(get_current_user)):
    return analyse_logic(payload, current_user)


@router.post("/chat")
def chat_with_file(payload: ChatFileRequest, current_user=Depends(get_current_user)):
    owner_id = get_owner_id_from_user(current_user)

    file_doc = find_user_file(payload.file_id, owner_id)

    if not file_doc:
        raise HTTPException(
            status_code=404,
            detail=f"File not found for file_id={payload.file_id} owner_id={owner_id}"
        )

    if payload.session_id:
        session = file_chat_sessions_collection.find_one({
            "_id": payload.session_id,
            "file_id": payload.file_id,
            "owner_id": owner_id,
        })
    else:
        session = get_or_create_chat_session(
            file_id=payload.file_id,
            owner_id=owner_id,
            title=f"Chat about {file_doc.get('name', 'file')}",
        )

    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    object_name = file_doc.get("object_name")
    bucket_name = file_doc.get("bucket_name")
    file_name = file_doc.get("name", "file")
    content_type = file_doc.get("content_type", "")
    ai_overview = file_doc.get("aiOverview") or file_doc.get("ai_overview") or ""

    if not object_name:
        raise HTTPException(status_code=400, detail="File object_name is missing")

    if is_image_file(content_type, file_name):
        file_bytes = oci_storage.download_file(
            object_name=object_name,
            bucket_name=bucket_name,
        )

        answer = answer_image_with_gemini(
            file_bytes=file_bytes,
            file_name=file_name,
            content_type=content_type,
            question=payload.message,
            ai_overview=ai_overview,
        )

        append_message(session["_id"], "user", payload.message)
        append_message(session["_id"], "assistant", answer)

        updated_session = file_chat_sessions_collection.find_one({
            "_id": session["_id"]
        })

        return {
            "session_id": session["_id"],
            "answer": answer,
            "sources": [
                {
                    "type": "image",
                    "file_name": file_name,
                    "ai_overview": ai_overview,
                }
            ],
            "messages": updated_session.get("messages", []) if updated_session else [],
        }

    if is_video_file(content_type, file_name):
        file_bytes = oci_storage.download_file(
            object_name=object_name,
            bucket_name=bucket_name,
        )

        answer = answer_video_with_openai(
            filename=file_name,
            content_type=content_type,
            file_bytes=file_bytes,
            question=payload.message,
            ai_overview=ai_overview,
        )

        append_message(session["_id"], "user", payload.message)
        append_message(session["_id"], "assistant", answer)

        updated_session = file_chat_sessions_collection.find_one({
            "_id": session["_id"]
        })

        return {
            "session_id": session["_id"],
            "answer": answer,
            "sources": [
                {
                    "type": "video",
                    "file_name": file_name,
                    "ai_overview": ai_overview,
                }
            ],
            "messages": updated_session.get("messages", []) if updated_session else [],
        }

    result = answer_from_file(
        file_id=payload.file_id,
        owner_id=owner_id,
        session_id=session["_id"],
        question=payload.message,
    )

    updated_session = file_chat_sessions_collection.find_one({
        "_id": session["_id"]
    })

    return {
        "session_id": session["_id"],
        "answer": result["answer"],
        "sources": result["sources"],
        "messages": updated_session.get("messages", []) if updated_session else [],
    }


@router.get("/sessions/{file_id}")
def get_file_session(file_id: str, current_user=Depends(get_current_user)):
    owner_id = get_owner_id_from_user(current_user)

    session = file_chat_sessions_collection.find_one(
        {
            "file_id": file_id,
            "owner_id": owner_id,
        },
        sort=[("created_at", -1)],
    )

    if not session:
        return {
            "session_id": None,
            "messages": [],
        }

    return {
        "session_id": session["_id"],
        "messages": session.get("messages", []),
    }