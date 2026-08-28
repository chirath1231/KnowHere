import io
import uuid
from datetime import datetime
from typing import List

import numpy as np
from openai import OpenAI
from pypdf import PdfReader
from docx import Document
from sentence_transformers import SentenceTransformer

from app.config import settings
from app.db import file_chunks_collection, file_chat_sessions_collection

embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)


def cosine_similarity(a: List[float], b: List[float]) -> float:
    a_np = np.array(a, dtype=np.float32)
    b_np = np.array(b, dtype=np.float32)

    denom = np.linalg.norm(a_np) * np.linalg.norm(b_np)
    if denom == 0:
        return 0.0

    return float(np.dot(a_np, b_np) / denom)


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    text = (text or "").strip()
    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end == len(text):
            break

        start = end - overlap

    return chunks


def extract_text_from_bytes(file_bytes: bytes, filename: str, content_type: str | None = None) -> str:
    filename = (filename or "").lower()
    content_type = (content_type or "").lower()

    if filename.endswith(".pdf") or "pdf" in content_type:
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join([(page.extract_text() or "") for page in reader.pages]).strip()

    if filename.endswith(".docx") or "word" in content_type:
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join([p.text for p in doc.paragraphs]).strip()

    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return file_bytes.decode("latin-1")
        except Exception:
            return ""


def build_file_chunks(file_id: str, owner_id: str, filename: str, file_text: str):
    file_chunks_collection.delete_many({
        "file_id": file_id,
        "owner_id": owner_id,
    })

    chunks = chunk_text(file_text)
    if not chunks:
        raise ValueError("No readable text found in this file.")

    embeddings = embedding_model.encode(chunks, convert_to_numpy=True).tolist()

    docs = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        docs.append({
            "_id": str(uuid.uuid4()),
            "file_id": file_id,
            "owner_id": owner_id,
            "filename": filename,
            "chunk_index": i,
            "text": chunk,
            "embedding": embedding,
            "created_at": datetime.utcnow(),
        })

    if docs:
        file_chunks_collection.insert_many(docs)

    return len(docs)


def get_or_create_chat_session(file_id: str, owner_id: str, title: str):
    existing = file_chat_sessions_collection.find_one(
        {"file_id": file_id, "owner_id": owner_id},
        sort=[("created_at", -1)]
    )

    if existing:
        return existing

    session = {
        "_id": str(uuid.uuid4()),
        "file_id": file_id,
        "owner_id": owner_id,
        "title": title,
        "messages": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    file_chat_sessions_collection.insert_one(session)
    return session


def append_message(session_id: str, role: str, content: str):
    file_chat_sessions_collection.update_one(
        {"_id": session_id},
        {
            "$push": {
                "messages": {
                    "role": role,
                    "content": content,
                    "created_at": datetime.utcnow(),
                }
            },
            "$set": {
                "updated_at": datetime.utcnow()
            }
        }
    )


def retrieve_top_chunks(file_id: str, owner_id: str, question: str, top_k: int = 5):
    docs = list(file_chunks_collection.find({
        "file_id": file_id,
        "owner_id": owner_id,
    }))

    if not docs:
        return []

    query_embedding = embedding_model.encode([question], convert_to_numpy=True)[0].tolist()

    scored = []
    for doc in docs:
        score = cosine_similarity(query_embedding, doc["embedding"])
        scored.append({
            **doc,
            "score": score
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]


def answer_from_file(file_id: str, owner_id: str, session_id: str, question: str):
    top_chunks = retrieve_top_chunks(file_id, owner_id, question, top_k=5)

    context = "\n\n---\n\n".join([
        f"Chunk {item['chunk_index'] + 1}:\n{item['text']}"
        for item in top_chunks
    ])

    system_prompt = (
        "You are a helpful AI file analysis assistant. "
        "Answer only using the provided file content. "
        "If the file does not contain the answer, clearly say that the answer is not in the file.directly tell that and please be kindly answer the question based on the file content. "
    )

    user_prompt = f"""
File content:
{context}

Question:
{question}
"""

    response = openai_client.chat.completions.create(
        model=settings.OPENAI_CHAT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
    )

    answer = response.choices[0].message.content or "No answer generated."

    append_message(session_id, "user", question)
    append_message(session_id, "assistant", answer)

    return {
        "answer": answer,
        "sources": [
            {
                "chunk_index": item["chunk_index"],
                "score": round(item["score"], 4),
                "text": item["text"][:300]
            }
            for item in top_chunks
        ]
    }