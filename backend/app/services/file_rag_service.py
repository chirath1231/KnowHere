import io
import uuid
from datetime import datetime
from typing import List, TypedDict

import chromadb
from pypdf import PdfReader
from docx import Document
from sentence_transformers import SentenceTransformer
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph

from app.config import settings
from app.db import file_chat_sessions_collection

embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
llm = ChatOpenAI(
    model=settings.OPENAI_CHAT_MODEL,
    api_key=settings.OPENAI_API_KEY,
    temperature=0.2,
)

chroma_client = chromadb.CloudClient(
    api_key=settings.CHROMA_API_KEY,
    tenant=settings.CHROMA_TENANT,
    database=settings.CHROMA_DATABASE,
)

# Embeddings are computed locally with the sentence-transformer above,
# so Chroma is used purely as the vector store (no embedding_function).
chunks_collection = chroma_client.get_or_create_collection(
    name=settings.CHROMA_COLLECTION,
    embedding_function=None,
    metadata={"hnsw:space": "cosine"},
)

# Chroma Cloud caps the number of records per write request.
CHROMA_BATCH_SIZE = 100


def file_filter(file_id: str, owner_id: str) -> dict:
    return {"$and": [{"file_id": file_id}, {"owner_id": owner_id}]}


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
    chunks_collection.delete(where=file_filter(file_id, owner_id))

    chunks = chunk_text(file_text)
    if not chunks:
        raise ValueError("No readable text found in this file.")

    embeddings = embedding_model.encode(chunks, convert_to_numpy=True).tolist()
    created_at = datetime.utcnow().isoformat()

    ids = [f"{file_id}:{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "file_id": file_id,
            "owner_id": owner_id,
            "filename": filename,
            "chunk_index": i,
            "created_at": created_at,
        }
        for i in range(len(chunks))
    ]

    for start in range(0, len(chunks), CHROMA_BATCH_SIZE):
        end = start + CHROMA_BATCH_SIZE
        chunks_collection.add(
            ids=ids[start:end],
            documents=chunks[start:end],
            embeddings=embeddings[start:end],
            metadatas=metadatas[start:end],
        )

    return len(chunks)


def delete_file_chunks(file_id: str, owner_id: str):
    chunks_collection.delete(where=file_filter(file_id, owner_id))


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
    query_embedding = embedding_model.encode([question], convert_to_numpy=True)[0].tolist()

    result = chunks_collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=file_filter(file_id, owner_id),
        include=["documents", "metadatas", "distances"],
    )

    documents = result["documents"][0] if result["documents"] else []
    metadatas = result["metadatas"][0] if result["metadatas"] else []
    distances = result["distances"][0] if result["distances"] else []

    # Cosine distance -> similarity, so higher score = more relevant.
    return [
        {
            "chunk_index": metadata["chunk_index"],
            "text": document,
            "score": 1 - distance,
        }
        for document, metadata, distance in zip(documents, metadatas, distances)
    ]


# -------------------
# LANGGRAPH RAG PIPELINE
# -------------------
SYSTEM_PROMPT = (
    "You are a helpful AI file analysis assistant. "
    "Answer only using the provided file content. "
    "If the file does not contain the answer, clearly say that the answer is not in the file.directly tell that and please be kindly answer the question based on the file content. "
)


class RagState(TypedDict, total=False):
    file_id: str
    owner_id: str
    session_id: str
    question: str
    top_chunks: list
    answer: str


def retrieve_node(state: RagState) -> dict:
    top_chunks = retrieve_top_chunks(
        state["file_id"], state["owner_id"], state["question"], top_k=5
    )
    return {"top_chunks": top_chunks}


def generate_node(state: RagState) -> dict:
    context = "\n\n---\n\n".join([
        f"Chunk {item['chunk_index'] + 1}:\n{item['text']}"
        for item in state["top_chunks"]
    ])

    user_prompt = f"""
File content:
{context}

Question:
{state["question"]}
"""

    response = llm.invoke([
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_prompt),
    ])

    return {"answer": response.text or "No answer generated."}


def save_node(state: RagState) -> dict:
    append_message(state["session_id"], "user", state["question"])
    append_message(state["session_id"], "assistant", state["answer"])
    return {}


def build_rag_graph():
    graph = StateGraph(RagState)

    graph.add_node("retrieve", retrieve_node)
    graph.add_node("generate", generate_node)
    graph.add_node("save", save_node)

    graph.add_edge(START, "retrieve")
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", "save")
    graph.add_edge("save", END)

    return graph.compile()


rag_graph = build_rag_graph()


def answer_from_file(file_id: str, owner_id: str, session_id: str, question: str):
    result = rag_graph.invoke({
        "file_id": file_id,
        "owner_id": owner_id,
        "session_id": session_id,
        "question": question,
    })

    return {
        "answer": result["answer"],
        "sources": [
            {
                "chunk_index": item["chunk_index"],
                "score": round(item["score"], 4),
                "text": item["text"][:300]
            }
            for item in result["top_chunks"]
        ]
    }
