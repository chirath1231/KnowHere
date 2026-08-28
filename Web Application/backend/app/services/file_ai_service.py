import io
import csv
import os
import math
import base64
import tempfile
from typing import Optional

import cv2
import ffmpeg
from google import genai
from google.genai import types as gemini_types
from openai import OpenAI
from pypdf import PdfReader
from docx import Document
from openpyxl import load_workbook

GEMINI_API_KEY = "REDACTED_GEMINI_API_KEY"
OPENAI_API_KEY = "REDACTED_OPENAI_API_KEY"

gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

TEXT_EXTENSIONS = {
    "txt", "md", "py", "js", "jsx", "ts", "tsx", "json", "html", "css",
    "java", "c", "cpp", "cs", "php", "rb", "go", "rs", "xml", "yml", "yaml",
    "sql", "sh", "env"
}

IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif", "bmp"}
VIDEO_EXTENSIONS = {"mp4", "mov", "avi", "mkv", "webm", "m4v"}


def get_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def is_image_file(filename: str, content_type: Optional[str] = None) -> bool:
    ext = get_extension(filename)
    if content_type and content_type.startswith("image/"):
        return True
    return ext in IMAGE_EXTENSIONS


def is_video_file(filename: str, content_type: Optional[str] = None) -> bool:
    ext = get_extension(filename)
    if content_type and content_type.startswith("video/"):
        return True
    return ext in VIDEO_EXTENSIONS


def is_text_file(filename: str, content_type: Optional[str] = None) -> bool:
    ext = get_extension(filename)
    if content_type:
        if content_type.startswith("text/"):
            return True
        if content_type in {
            "application/json",
            "application/javascript",
            "application/xml",
        }:
            return True
    return ext in TEXT_EXTENSIONS


def truncate_text(text: str, max_chars: int = 15000) -> str:
    text = (text or "").strip()
    return text[:max_chars]


def extract_text_from_plain(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore")


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    parts = []
    for page in reader.pages:
        try:
            parts.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(parts)


def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def extract_text_from_csv(file_bytes: bytes) -> str:
    decoded = file_bytes.decode("utf-8", errors="ignore")
    reader = csv.reader(io.StringIO(decoded))
    rows = []
    for i, row in enumerate(reader):
        rows.append(", ".join(row))
        if i >= 99:
            break
    return "\n".join(rows)


def extract_text_from_xlsx(file_bytes: bytes) -> str:
    wb = load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    chunks = []

    for sheet in wb.worksheets:
        chunks.append(f"[Sheet: {sheet.title}]")
        row_count = 0
        for row in sheet.iter_rows(values_only=True):
            vals = [str(v) for v in row if v is not None and str(v).strip() != ""]
            if vals:
                chunks.append(" | ".join(vals))
                row_count += 1
            if row_count >= 100:
                break

    return "\n".join(chunks)


def extract_relevant_text(filename: str, file_bytes: bytes, content_type: Optional[str] = None) -> str:
    ext = get_extension(filename)

    try:
        if is_text_file(filename, content_type):
            return truncate_text(extract_text_from_plain(file_bytes))
        if ext == "pdf":
            return truncate_text(extract_text_from_pdf(file_bytes))
        if ext == "docx":
            return truncate_text(extract_text_from_docx(file_bytes))
        if ext == "csv":
            return truncate_text(extract_text_from_csv(file_bytes))
        if ext == "xlsx":
            return truncate_text(extract_text_from_xlsx(file_bytes))
    except Exception:
        return ""

    return ""


def generate_text_overview(filename: str, content_type: Optional[str], extracted_text: str) -> str:
    if not gemini_client:
        return "AI overview unavailable because Gemini API key is not configured."

    prompt = f"""
You are analyzing a file uploaded to a cloud storage system.

File name: {filename}
Content type: {content_type or "unknown"}

Task:
Write a short AI overview of this file.

Rules:
- Maximum 120 words
- Be concrete and useful
- Explain what the file appears to contain
- Explain the likely purpose
- If it is source code, explain what the code does
- If it is a document, summarize the main topic
- No bullet points

Extracted content:
{extracted_text}
"""

    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    text = getattr(response, "text", None)
    return text.strip() if text and text.strip() else "AI overview could not be generated."


def generate_image_overview(filename: str, content_type: Optional[str], file_bytes: bytes) -> str:
    if not gemini_client:
        return "AI overview unavailable because Gemini API key is not configured."

    ext = get_extension(filename)
    mime_type = content_type or f"image/{ext or 'png'}"

    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            "Analyze this uploaded image and write a short AI overview. Explain what is visible, the likely purpose, and any important UI, diagram, or document-like content. Maximum 100 words. No bullet points.",
            gemini_types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
        ],
    )

    text = getattr(response, "text", None)
    return text.strip() if text and text.strip() else "AI overview could not be generated."


def extract_audio_from_video_bytes(file_bytes: bytes, suffix: str = ".mp4") -> str:
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
    if not openai_client:
        return ""

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
        return []

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if frame_count <= 0:
        cap.release()
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
    return encoded_frames


def generate_video_overview(filename: str, content_type: Optional[str], file_bytes: bytes) -> str:
    if not openai_client:
        return "AI overview unavailable because OpenAI API key is not configured."

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
                "Analyze this uploaded video and write a short AI overview. "
                "Use the transcript and sampled frames. Explain what the video appears to show, "
                "its likely purpose, and the main topics. Maximum 120 words. No bullet points.\n\n"
                f"File name: {filename}\n"
                f"Content type: {content_type or 'unknown'}\n\n"
                f"Transcript:\n{truncate_text(transcript_text, 12000) if transcript_text else 'No transcript available.'}"
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

        return "AI overview could not be generated for the video."
    except Exception as e:
        return f"AI overview generation failed for video: {str(e)}"
    finally:
        for path in [temp_video_path, temp_audio_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass


def generate_fallback_overview(filename: str, content_type: Optional[str]) -> str:
    if not gemini_client:
        return "AI overview unavailable because Gemini API key is not configured."

    prompt = f"""
Write a short AI overview for a file using only its name and content type.

File name: {filename}
Content type: {content_type or "unknown"}

Maximum 60 words. No bullet points.
"""

    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    text = getattr(response, "text", None)
    return text.strip() if text and text.strip() else "AI overview could not be generated."


def build_ai_overview(filename: str, content_type: Optional[str], file_bytes: bytes) -> str:
    try:
        if is_video_file(filename, content_type):
            return generate_video_overview(filename, content_type, file_bytes)

        if is_image_file(filename, content_type):
            return generate_image_overview(filename, content_type, file_bytes)

        extracted_text = extract_relevant_text(filename, file_bytes, content_type)
        if extracted_text:
            return generate_text_overview(filename, content_type, extracted_text)

        return generate_fallback_overview(filename, content_type)
    except Exception as e:
        return f"AI overview generation failed: {str(e)}"