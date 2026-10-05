from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from io import BytesIO

from app.database import files_collection, folders_collection
from app.models import serialize_doc
from app.oci_service import oci_storage
from app.dependencies import get_current_user
from app.services.file_ai_service import build_ai_overview
from app.services.file_rag_service import delete_file_chunks

router = APIRouter(prefix="/files", tags=["Files"])


def detect_file_type(filename: str, content_type: str | None = None):
    if content_type:
        if content_type.startswith("image/"):
            return "image"
        if content_type.startswith("video/"):
            return "video"
        if content_type.startswith("audio/"):
            return "audio"
        if content_type == "application/pdf":
            return "pdf"
        if content_type.startswith("text/"):
            return "text"

    ext = filename.split(".")[-1].lower() if "." in filename else "file"

    if ext in ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"]:
        return "image"
    if ext in ["mp4", "mov", "avi", "mkv", "webm"]:
        return "video"
    if ext in ["mp3", "wav", "aac", "ogg"]:
        return "audio"
    if ext == "pdf":
        return "pdf"
    if ext in ["txt", "md", "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp",
               "cs", "php", "go", "rb", "html", "css", "json", "xml", "yml",
               "yaml", "sql"]:
        return "text"

    return ext


@router.get("")
def list_files(
    folder_id: str | None = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"owner_id": current_user["id"]}

    if folder_id:
        query["folder_id"] = folder_id
    else:
        query["folder_id"] = None

    files = list(files_collection.find(query).sort("uploaded_at", -1))
    return [serialize_doc(file) for file in files]


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder_id: str | None = Form(default=None),
    current_user: dict = Depends(get_current_user)
):
    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    if folder_id:
        try:
            folder = folders_collection.find_one({
                "_id": ObjectId(folder_id),
                "owner_id": current_user["id"]
            })
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid folder ID")

        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

    uploaded = oci_storage.upload_file(
        file_bytes=file_bytes,
        original_filename=file.filename,
        content_type=file.content_type
    )

    ai_overview = build_ai_overview(
        filename=file.filename,
        content_type=file.content_type,
        file_bytes=file_bytes
    )

    doc = {
        "name": file.filename,
        "type": detect_file_type(file.filename, file.content_type),
        "object_name": uploaded["object_name"],
        "bucket_name": uploaded["bucket_name"],
        "namespace": uploaded["namespace"],
        "content_type": uploaded["content_type"],
        "size": len(file_bytes),
        "folder_id": folder_id if folder_id else None,
        "owner_id": current_user["id"],
        "ai_overview": ai_overview,
        "uploaded_at": datetime.utcnow(),
    }

    result = files_collection.insert_one(doc)
    created = files_collection.find_one({"_id": result.inserted_id})

    return serialize_doc(created)


@router.get("/{file_id}/preview")
def preview_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        file_doc = files_collection.find_one({
            "_id": ObjectId(file_id),
            "owner_id": current_user["id"]
        })
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid file ID")

    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        response = oci_storage.download_file(file_doc["object_name"])
        file_data = response.data.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")

    headers = {
        "Content-Disposition": f'inline; filename="{file_doc["name"]}"'
    }

    return StreamingResponse(
        BytesIO(file_data),
        media_type=file_doc.get("content_type", "application/octet-stream"),
        headers=headers
    )


@router.get("/{file_id}/download")
def download_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        file_doc = files_collection.find_one({
            "_id": ObjectId(file_id),
            "owner_id": current_user["id"]
        })
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid file ID")

    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        response = oci_storage.download_file(file_doc["object_name"])
        file_data = response.data.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

    headers = {
        "Content-Disposition": f'attachment; filename="{file_doc["name"]}"'
    }

    return StreamingResponse(
        BytesIO(file_data),
        media_type=file_doc.get("content_type", "application/octet-stream"),
        headers=headers
    )


@router.delete("/{file_id}")
def delete_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        file_doc = files_collection.find_one({
            "_id": ObjectId(file_id),
            "owner_id": current_user["id"]
        })
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid file ID")

    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    oci_storage.delete_file(file_doc["object_name"])
    files_collection.delete_one({"_id": ObjectId(file_id)})
    delete_file_chunks(file_id, str(current_user["id"]))

    return {"message": "File deleted successfully"}