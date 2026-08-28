import os
import json
import math
import shutil
import tempfile
import subprocess
import time
from datetime import datetime
import base64

import requests
from openai import OpenAI
from duckduckgo_search import DDGS
from bson import ObjectId
from bson.errors import InvalidId

from app.config import settings
from app.services.file_ai_service import build_ai_overview
from app.services.oci_storage_service import oci_storage
from app.database import files_collection

MODEL = "gpt-4o-mini"

client = OpenAI(api_key=settings.OPENAI_API_KEY)

system_message = """
You are the AI File Assistant of KnowHere cloud storage.

You can:
- create text files
- create PDF files
- generate images
- search the web
- add subtitles to an existing video file

When the user asks to create files, call the correct function.
When the user asks to add subtitles to a video, call the subtitle tool and provide:
- the target video file_id
- the subtitle language
- the output filename

If the user does not specify subtitle language, use Sinhala.
If the user does not specify output filename, create a sensible filename like subtitled_<originalname>.mp4.
"""

# -------------------
# TEXT FILE
# -------------------
def create_text_file(filename, content, user):
    file_bytes = content.encode("utf-8")

    upload_result = oci_storage.upload_file(
        file_bytes=file_bytes,
        original_filename=filename,
        content_type="text/plain"
    )

    ai_overview = build_ai_overview(
        filename=filename,
        content_type="text/plain",
        file_bytes=file_bytes
    )

    file_doc = {
        "name": filename,
        "type": filename.split(".")[-1],
        "object_name": upload_result["object_name"],
        "bucket_name": upload_result["bucket_name"],
        "namespace": upload_result["namespace"],
        "content_type": upload_result["content_type"],
        "size": len(file_bytes),
        "folder_id": None,
        "owner_id": str(user["id"]),
        "ai_overview": ai_overview,
        "uploaded_at": datetime.utcnow()
    }

    files_collection.insert_one(file_doc)

    return f"File '{filename}' created, uploaded, and analyzed successfully."


# -------------------
# PDF FILE
# -------------------
def create_pdf(filename, content, user):
    import io
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph(filename, styles['Title']))
    story.append(Spacer(1, 12))
    story.append(Paragraph(content, styles['Normal']))

    doc.build(story)

    buffer.seek(0)
    file_bytes = buffer.read()

    upload_result = oci_storage.upload_file(
        file_bytes=file_bytes,
        original_filename=filename,
        content_type="application/pdf"
    )

    # ✅ Build BEFORE insert, just like create_text_file does
    ai_overview = build_ai_overview(
        filename=filename,
        content_type="application/pdf",  # ✅ Fixed: was "pdf", should be full MIME type
        file_bytes=file_bytes
    )

    file_doc = {
        "name": filename,
        "type": "pdf",
        "object_name": upload_result["object_name"],
        "bucket_name": upload_result["bucket_name"],
        "namespace": upload_result["namespace"],
        "content_type": upload_result["content_type"],
        "size": len(file_bytes),
        "folder_id": None,
        "owner_id": str(user["id"]),
        "ai_overview": ai_overview,  # ✅ Now actually saved to DB
        "uploaded_at": datetime.utcnow()
    }

    files_collection.insert_one(file_doc)

    return f"PDF '{filename}' created and uploaded successfully."

# -------------------
# IMAGE GENERATION
# -------------------
def create_image(filename, content, user, size="1024x1024"):
    valid_sizes = ["1024x1024", "1536x1024", "1024x1536", "auto"]
    if size not in valid_sizes:
        size = "1024x1024"

    max_retries = 3

    for attempt in range(max_retries):
        try:
            image_response = client.images.generate(
                model="gpt-image-1",
                prompt=content,
                size=size,
                n=1
            )

            # gpt-image-1 returns base64, not URL
            image_b64 = image_response.data[0].b64_json
            img_data = base64.b64decode(image_b64)

            upload_result = oci_storage.upload_file(
                file_bytes=img_data,
                original_filename=filename,
                content_type="image/png"
            )

            ai_overview = build_ai_overview(
                filename=filename,
                content_type="image/png",
                file_bytes=img_data
            )

            file_doc = {
                "name": filename,
                "type": filename.split(".")[-1],
                "object_name": upload_result["object_name"],
                "bucket_name": upload_result["bucket_name"],
                "namespace": upload_result["namespace"],
                "content_type": upload_result["content_type"],
                "size": len(img_data),
                "folder_id": None,
                "owner_id": str(user["id"]),
                "ai_overview": ai_overview,
                "uploaded_at": datetime.utcnow()
            }

            files_collection.insert_one(file_doc)

            return f"Image '{filename}' created, uploaded, and analyzed successfully."

        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2)

    return "Image creation failed after 3 attempts."
# -------------------
# WEB SEARCH
# -------------------
def web_search(query):
    results = []

    with DDGS() as ddgs:
        for r in ddgs.text(query, max_results=3):
            results.append(
                {
                    "title": r.get("title"),
                    "link": r.get("href"),
                    "snippet": r.get("body"),
                }
            )

    return results


# -------------------
# VIDEO SUBTITLE HELPERS
# -------------------
def get_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def sec_to_ass_time(seconds: float) -> str:
    if seconds < 0:
        seconds = 0

    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))

    if cs == 100:
        s += 1
        cs = 0
    if s == 60:
        m += 1
        s = 0
    if m == 60:
        h += 1
        m = 0

    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def escape_ass_text(text: str) -> str:
    if not text:
        return ""

    text = str(text)
    text = text.replace("\\", r"\\")
    text = text.replace("{", r"\{")
    text = text.replace("}", r"\}")
    text = text.replace("\n", " ")
    text = text.replace("\r", " ")
    return text.strip()


def translate_text(text: str, target_language: str = "Sinhala") -> str:
    if not text or not text.strip():
        return ""

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "system",
                "content": (
                    f"You are a translator. Translate the user's text into {target_language}. "
                    "Return only the translated text. Do not explain anything."
                ),
            },
            {
                "role": "user",
                "content": text,
            },
        ],
    )

    return (response.output_text or "").strip()


def transcribe_audio_file(audio_path: str) -> str:
    with open(audio_path, "rb") as f_audio:
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-transcribe",
            file=f_audio,
        )

    return (getattr(transcript, "text", None) or "").strip()


def find_video_file_for_user(file_id: str, user: dict):
    owner_id = str(user["id"])

    try:
        object_id = ObjectId(file_id)
    except InvalidId:
        raise ValueError("Invalid file id format.")

    file_doc = files_collection.find_one({
        "_id": object_id,
        "owner_id": owner_id,
    })

    if not file_doc:
        raise ValueError("Video file not found for this user.")

    content_type = (file_doc.get("content_type") or "").lower()
    name = (file_doc.get("name") or "").lower()

    is_video = content_type.startswith("video/") or name.endswith(
        (".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v")
    )

    if not is_video:
        raise ValueError("Selected file is not a video.")

    return file_doc


def build_subtitled_video_bytes(
    original_filename: str,
    original_video_bytes: bytes,
    target_language_name: str = "Sinhala",
    output_filename: str | None = None,
    clip_duration: int = 5,
    min_clip_duration: float = 1.0,
    font_name: str = "Noto Sans",
    font_size: int = 30,
):
    ext = get_extension(original_filename)
    video_suffix = f".{ext}" if ext else ".mp4"

    if not output_filename:
        output_filename = f"subtitled_{original_filename}"

    temp_dir = tempfile.mkdtemp(prefix="video_subtitle_")
    temp_video_path = os.path.join(temp_dir, f"original{video_suffix}")
    ass_path = os.path.join(temp_dir, "subtitles.ass")
    final_output = os.path.join(temp_dir, output_filename)

    try:
        with open(temp_video_path, "wb") as f:
            f.write(original_video_bytes)

        probe_cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            temp_video_path,
        ]
        duration = float(subprocess.check_output(probe_cmd).decode().strip())
        num_clips = math.ceil(duration / clip_duration)

        ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2,0,2,40,40,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

        with open(ass_path, "w", encoding="utf-8") as f:
            f.write(ass_header)

        for i in range(num_clips):
            clip_no = i + 1
            start_time = i * clip_duration
            current_duration = min(clip_duration, duration - start_time)

            if current_duration < min_clip_duration:
                continue

            audio_chunk = os.path.join(temp_dir, f"chunk_{clip_no}.mp3")

            extract_cmd = [
                "ffmpeg", "-y",
                "-ss", str(start_time),
                "-t", str(current_duration),
                "-i", temp_video_path,
                "-vn",
                "-ac", "1",
                "-ar", "16000",
                "-b:a", "64k",
                audio_chunk,
            ]
            subprocess.run(extract_cmd, check=True)

            subtitle_text = ""

            try:
                original_text = transcribe_audio_file(audio_chunk)
                print(f"Chunk {clip_no} original text: {original_text}")

                if original_text:
                    try:
                        subtitle_text = translate_text(original_text, target_language_name)
                        print(f"Chunk {clip_no} translated text: {subtitle_text}")
                    except Exception as e:
                        print(f"Chunk {clip_no} translation failed: {e}")
                        subtitle_text = original_text
                else:
                    print(f"Chunk {clip_no}: no transcript text")
            except Exception as e:
                print(f"Chunk {clip_no} transcription failed: {e}")
                subtitle_text = ""

            if subtitle_text:
                start_ass = sec_to_ass_time(start_time)
                end_ass = sec_to_ass_time(start_time + current_duration)
                safe_text = escape_ass_text(subtitle_text)

                with open(ass_path, "a", encoding="utf-8") as f:
                    f.write(
                        f"Dialogue: 0,{start_ass},{end_ass},Default,,0,0,0,,{safe_text}\n"
                    )

        safe_ass_path = ass_path.replace("\\", "/").replace(":", "\\:")
        vf_filter = f"subtitles='{safe_ass_path}'"

        burn_cmd = [
            "ffmpeg",
            "-y",
            "-i", temp_video_path,
            "-vf", vf_filter,
            "-c:v", "libx264",
            "-c:a", "aac",
            "-movflags", "+faststart",
            final_output,
        ]
        subprocess.run(burn_cmd, check=True)

        with open(final_output, "rb") as f:
            final_video_bytes = f.read()

        return final_video_bytes, output_filename

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def find_video_file_for_user_by_filename(filename: str, user: dict):
    owner_id = str(user["id"])

    file_doc = files_collection.find_one({
        "name": filename,
        "owner_id": owner_id,
    })

    if not file_doc:
        raise ValueError(f"Video file '{filename}' not found for this user.")

    content_type = (file_doc.get("content_type") or "").lower()
    name = (file_doc.get("name") or "").lower()

    is_video = content_type.startswith("video/") or name.endswith(
        (".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v")
    )

    if not is_video:
        raise ValueError(f"'{filename}' is not a video file.")

    return file_doc


def add_subtitle_to_video_file(
    user,
    language: str,
    output_filename: str | None,
    file_id: str | None = None,
    filename: str | None = None,
):
    if not file_id and not filename:
        raise ValueError("Either file_id or filename must be provided.")

    if file_id:
        file_doc = find_video_file_for_user(file_id, user)
    else:
        file_doc = find_video_file_for_user_by_filename(filename, user)

    object_name = file_doc.get("object_name")
    bucket_name = file_doc.get("bucket_name")
    original_filename = file_doc.get("name", "video.mp4")

    if not object_name:
        raise ValueError("Video object_name is missing.")

    if not output_filename or not output_filename.strip():
        output_filename = f"subtitled_{original_filename}"

    if "." not in output_filename:
        output_filename = f"{output_filename}.mp4"

    original_video_bytes = oci_storage.download_file(
        object_name=object_name,
        bucket_name=bucket_name,
    )

    subtitled_video_bytes, final_filename = build_subtitled_video_bytes(
        original_filename=original_filename,
        original_video_bytes=original_video_bytes,
        target_language_name=language or "Sinhala",
        output_filename=output_filename,
    )

    upload_result = oci_storage.upload_file(
        file_bytes=subtitled_video_bytes,
        original_filename=final_filename,
        content_type="video/mp4",
    )

    ai_overview = build_ai_overview(
        filename=final_filename,
        content_type="video/mp4",
        file_bytes=subtitled_video_bytes
    )

    owner_id = str(user["id"])

    file_doc_new = {
        "name": final_filename,
        "type": final_filename.split(".")[-1],
        "object_name": upload_result["object_name"],
        "bucket_name": upload_result["bucket_name"],
        "namespace": upload_result["namespace"],
        "content_type": upload_result["content_type"],
        "size": len(subtitled_video_bytes),
        "folder_id": file_doc.get("folder_id"),
        "owner_id": owner_id,
        "ai_overview": ai_overview,
        "uploaded_at": datetime.utcnow()
    }

    inserted = files_collection.insert_one(file_doc_new)

    return (
        f"Subtitle-added video created successfully. "
        f"Source file: '{original_filename}'. "
        f"New file name: '{final_filename}'. "
        f"New file id: '{inserted.inserted_id}'. "
        f"Language: '{language}'. "
        f"The new video has been uploaded to Oracle Cloud and saved in the file library."
    )

# -------------------
# TOOL DEFINITIONS
# -------------------
filecreate_function = {
    "name": "create_text_file",
    "description": "Create a text file with the content requested by the user.",
    "parameters": {
        "type": "object",
        "properties": {
            "filename": {
                "type": "string",
                "description": "Provide the filename with relevant extension (.html, .txt, etc.) but do not use .pdf here."
            },
            "content": {
                "type": "string",
                "description": "The content to write into the text file"
            }
        },
        "required": ["filename", "content"],
        "additionalProperties": False
    }
}

pdfcreate_function = {
    "name": "create_pdf",
    "description": "Create a PDF file with the content requested by the user.",
    "parameters": {
        "type": "object",
        "properties": {
            "filename": {
                "type": "string",
                "description": "Provide the filename with .pdf"
            },
            "content": {
                "type": "string",
                "description": "The content to write into the PDF file"
            }
        },
        "required": ["filename", "content"],
        "additionalProperties": False
    }
}

imagecreate_function = {
    "name": "create_image",
    "description": "Create an image with the content requested by the user.",
    "parameters": {
        "type": "object",
        "properties": {
            "filename": {
                "type": "string",
                "description": "Filename with relevant image extension e.g. image.png"
            },
            "content": {
                "type": "string",
                "description": "The prompt to generate the image"
            },
            "size": {
                "type": "string",
                "enum": ["1024x1024", "1024x1792", "1792x1024"],
                "description": "Image size"
            }
        },
        "required": ["filename", "content", "size"],
        "additionalProperties": False
    }
}

websearch_function = {
    "name": "web_search",
    "description": "Search the web for current information using DuckDuckGo",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query"
            }
        },
        "required": ["query"]
    }
}

subtitle_video_function = {
    "name": "add_subtitle_to_video_file",
    "description": (
        "Add subtitles to an existing video file owned by the user, save the new subtitled video "
        "to Oracle Cloud, and create a new file record. The user may provide either the file_id "
        "or the filename of the target video."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "file_id": {
                "type": "string",
                "description": "The target video file id to subtitle"
            },
            "filename": {
                "type": "string",
                "description": "The target video filename, e.g. mark.mp4"
            },
            "language": {
                "type": "string",
                "description": "The subtitle language, e.g. Sinhala, English, Tamil"
            },
            "output_filename": {
                "type": "string",
                "description": "The filename for the new subtitled video, e.g. sub.mp4"
            }
        },
        "required": ["language", "output_filename"],
        "additionalProperties": False
    }
}



tools = [
    {"type": "function", "function": filecreate_function},
    {"type": "function", "function": pdfcreate_function},
    {"type": "function", "function": imagecreate_function},
    {"type": "function", "function": websearch_function},
    {"type": "function", "function": subtitle_video_function},
]


# -------------------
# TOOL HANDLER
# -------------------
def handle_tool_call(message, user):
    tool_call = message.tool_calls[0]
    args = json.loads(tool_call.function.arguments)
    name = tool_call.function.name

    if name == "create_text_file":
        result = create_text_file(args["filename"], args["content"], user)

    elif name == "create_pdf":
        result = create_pdf(args["filename"], args["content"], user)

    elif name == "create_image":
        result = create_image(
            args["filename"],
            args["content"],
            user,
            args.get("size", "1024x1024")
        )

    elif name == "web_search":
        result = web_search(args["query"])

    elif name == "add_subtitle_to_video_file":
        result = add_subtitle_to_video_file(
            user=user,
            file_id=args.get("file_id"),
            filename=args.get("filename"),
            language=args.get("language", "Sinhala"),
            output_filename=args.get("output_filename"),
        )

    else:
        result = "Unknown tool"

    return {
        "role": "tool",
        "tool_call_id": tool_call.id,
        "content": json.dumps({"result": result})
    }


# -------------------
# MAIN AGENT
# -------------------
def run_agent(message, history, user):
    messages = [{"role": "system", "content": system_message}]

    for h in history:
        messages.append({
            "role": h.role,
            "content": h.content
        })

    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        tools=tools
    )

    assistant_message = response.choices[0].message

    if response.choices[0].finish_reason == "tool_calls":
        tool_response = handle_tool_call(assistant_message, user)

        messages.append(assistant_message)
        messages.append(tool_response)

        final = client.chat.completions.create(
            model=MODEL,
            messages=messages
        )

        return final.choices[0].message.content

    return assistant_message.content