from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from bson.errors import InvalidId

from app.auth import get_current_user
from app.db import files_collection
from app.services.oci_storage_service import oci_storage
from app.services.video_subtitle_service import (
    build_subtitled_video_bytes,
    save_subtitled_video_as_new_file,
)

router = APIRouter(prefix="/videos", tags=["Video Subtitles"])


class AddSubtitleRequest(BaseModel):
    language: str = "Sinhala"
    output_filename: str | None = None


def get_owner_id_from_user(current_user):
    owner_id = (
        current_user.get("id")
        or current_user.get("user_id")
        or current_user.get("_id")
    )

    if not owner_id:
        raise HTTPException(status_code=401, detail="Could not determine current user id")

    return str(owner_id)


def find_user_video_file(file_id: str, owner_id: str):
    try:
        object_id = ObjectId(file_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid file id format")

    file_doc = files_collection.find_one({
        "_id": object_id,
        "owner_id": owner_id,
    })

    if not file_doc:
        file_doc = files_collection.find_one({"_id": object_id})

    if not file_doc:
        raise HTTPException(status_code=404, detail="Video file not found")

    return file_doc


def is_video_file(file_doc: dict) -> bool:
    content_type = (file_doc.get("content_type") or "").lower()
    name = (file_doc.get("name") or "").lower()

    if content_type.startswith("video/"):
        return True

    return name.endswith((".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"))


@router.post("/{file_id}/add-subtitle")
def add_subtitle_to_video(
    file_id: str,
    payload: AddSubtitleRequest,
    current_user=Depends(get_current_user)
):
    owner_id = get_owner_id_from_user(current_user)
    file_doc = find_user_video_file(file_id, owner_id)

    if not is_video_file(file_doc):
        raise HTTPException(status_code=400, detail="Selected file is not a video")

    object_name = file_doc.get("object_name")
    bucket_name = file_doc.get("bucket_name")
    original_filename = file_doc.get("name", "video.mp4")

    if not object_name:
        raise HTTPException(status_code=400, detail="Video object_name is missing")

    original_video_bytes = oci_storage.download_file(
        object_name=object_name,
        bucket_name=bucket_name,
    )

    subtitled_video_bytes, output_filename = build_subtitled_video_bytes(
        original_filename=original_filename,
        original_video_bytes=original_video_bytes,
        target_language_name=payload.language or "Sinhala",
        output_filename=payload.output_filename,
    )

    saved_file_doc = save_subtitled_video_as_new_file(
        source_file_doc=file_doc,
        user=current_user,
        subtitled_video_bytes=subtitled_video_bytes,
        output_filename=output_filename,
    )

    return {
        "message": f"Subtitles added successfully in {payload.language}",
        "file_id": str(saved_file_doc["_id"]),
        "file_name": saved_file_doc["name"],
        "language": payload.language,
    }