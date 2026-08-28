import os
import math
import shutil
import tempfile
import subprocess
from datetime import datetime

from openai import OpenAI

from app.config import settings
from app.db import files_collection
from app.services.oci_storage_service import oci_storage
from app.services.file_ai_service import build_ai_overview

openai_client = OpenAI(api_key="REDACTED_OPENAI_API_KEY")


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

    response = openai_client.responses.create(
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
        transcript = openai_client.audio.transcriptions.create(
            model="gpt-4o-transcribe",
            file=f_audio,
        )

    return (getattr(transcript, "text", None) or "").strip()


def build_subtitled_video_bytes(
    original_filename: str,
    original_video_bytes: bytes,
    target_language_name: str = "Sinhala",
    output_filename: str | None = None,
    clip_duration: int = 5,
    min_clip_duration: float = 1.0,
    font_name: str = "Noto Sans",
    font_size: int = 30,
) -> tuple[bytes, str]:
    """
    Returns:
        (final_video_bytes, output_filename)
    """
    ext = get_extension(original_filename)
    video_suffix = f".{ext}" if ext else ".mp4"

    if not output_filename or not output_filename.strip():
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

        print("Selected subtitle language:", target_language_name)

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
                        print(f"Chunk {clip_no} translated text ({target_language_name}): {subtitle_text}")
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


def save_subtitled_video_as_new_file(
    source_file_doc: dict,
    user: dict,
    subtitled_video_bytes: bytes,
    output_filename: str,
):
    upload_result = oci_storage.upload_file(
        file_bytes=subtitled_video_bytes,
        original_filename=output_filename,
        content_type="video/mp4",
    )

    ai_overview = build_ai_overview(
        filename=output_filename,
        content_type="video/mp4",
        file_bytes=subtitled_video_bytes,
    )

    owner_id = str(
        user.get("id") or user.get("user_id") or user.get("_id")
    )

    file_doc = {
        "name": output_filename,
        "type": output_filename.split(".")[-1],
        "object_name": upload_result["object_name"],
        "bucket_name": upload_result["bucket_name"],
        "namespace": upload_result["namespace"],
        "content_type": upload_result["content_type"],
        "size": len(subtitled_video_bytes),
        "folder_id": source_file_doc.get("folder_id"),
        "owner_id": owner_id,
        "ai_overview": ai_overview,
        "uploaded_at": datetime.utcnow(),
    }

    insert_result = files_collection.insert_one(file_doc)
    file_doc["_id"] = insert_result.inserted_id
    return file_doc