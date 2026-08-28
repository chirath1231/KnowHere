from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from bson.errors import InvalidId

from app.database import files_collection
from app.models import serialize_doc
from app.dependencies import get_current_user
from app.services.file_ai_service import build_ai_overview
from app.oci_service import oci_storage

router = APIRouter(prefix="/ai-overview", tags=["AI Overview"])


# -----------------------------
# Get all AI overviews
# -----------------------------
@router.get("")
def get_ai_overviews(current_user: dict = Depends(get_current_user)):

    files = list(
        files_collection
        .find({"owner_id": current_user["id"]})
        .sort("uploaded_at", -1)
    )

    result = []

    for file in files:
        item = serialize_doc(file)

        result.append({
            "id": item["id"],
            "name": item["name"],
            "type": item["type"],
            "ai_overview": item.get("ai_overview", ""),
            "uploaded_at": item.get("uploaded_at")
        })

    return result


# -----------------------------
# Update AI overview
# -----------------------------
@router.put("/{file_id}")
def update_ai_overview(
    file_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):

    overview = payload.get("ai_overview", "").strip()

    if not overview:
        raise HTTPException(
            status_code=400,
            detail="AI overview cannot be empty"
        )

    try:
        file_doc = files_collection.find_one({
            "_id": ObjectId(file_id),
            "owner_id": current_user["id"]
        })
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid file ID")

    if not file_doc:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    files_collection.update_one(
        {"_id": ObjectId(file_id)},
        {"$set": {"ai_overview": overview}}
    )

    return {"message": "AI overview updated successfully"}


# -----------------------------
# Regenerate AI overview
# -----------------------------
@router.post("/{file_id}/regenerate")
def regenerate_ai_overview(
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

    # download file from storage
    response = oci_storage.download_file(file_doc["object_name"])

    file_bytes = response.raw.read()

    new_overview = build_ai_overview(
        filename=file_doc["name"],
        content_type=file_doc.get("content_type"),
        file_bytes=file_bytes
    )

    files_collection.update_one(
        {"_id": ObjectId(file_id)},
        {"$set": {"ai_overview": new_overview}}
    )

    return {
        "ai_overview": new_overview
    }