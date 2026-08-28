import io
import math
import uuid
from datetime import datetime
from typing import List, Dict, Any

import numpy as np
from openai import OpenAI
from pypdf import PdfReader
from docx import Document
from sentence_transformers import SentenceTransformer
from os import getenv

from app.db import file_chunks_collection, chat_sessions_collection

embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
openai_client = OpenAI(api_key="REDACTED_OPENAI_API_KEY")
CHAT_MODEL ="gpt-4o-mini"


def cosine_similarity(a: List[float], b: List[float]) -> float:
    a_np = np.array(a, dtype=np.float32)
    b_np = np.array(b, dtype=np.float32)
    denom = (np.linalg.norm(a_np) * np.linalg.norm(b_np))
    if denom == 0:
        return 0.0
    return float(np.dot(a_np, b_np) / denom)


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 150) -> List[str]:
    text = (text or "").strip()
    if not text:
        return []

    chunks = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == text_len:
            break
        start = end - overlap

    return chunks


def extract_text_from_bytes(file_bytes: bytes, filename: str, content_type: str | None = None) -> str:
    filename = (filename or "").lower()
    content_type = (content_type or "").lower()

    if filename.endswith(".pdf") or "pdf" in content_type:
        reader = PdfReader(io.BytesIO(file_bytes))
        pages = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        return "\n".join(pages).strip()

    if filename.endswith(".docx") or "word" in content_type:
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join([p.text for p in doc.paragraphs]).strip()

    # txt, md, code, json, csv, html, etc.
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return file_bytes.decode("latin-1")
        except Exception:
            return ""


def build_and_store_chunks(file_id: str, owner_id: str, filename: str, file_text: str):
    file_chunks_collection.delete_many({"file_id": file_id, "owner_id": owner_id})

    chunks = chunk_text(file_text)
    