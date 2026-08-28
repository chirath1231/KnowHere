from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime

from app.database import folders_collection
from app.models import serialize_doc
from app.dependencies import get_current_user

router = APIRouter(prefix="/folders", tags=["Folders"])


@router.get("")
def list_folders(current_user: dict = Depends(get_current_user)):
    folders = list(
        folders_collection.find({"owner_id": current_user["id"]}).sort("created_at", -1)
    )
    return [serialize_doc(folder) for folder in folders]


@router.post("")
def create_folder(payload: dict, current_user: dict = Depends(get_current_user)):
    name = payload.get("name", "").strip()

    if not name:
        raise HTTPException(status_code=400, detail="Folder name is required")

    doc = {
        "name": name,
        "type": "folder",
        "owner_id": current_user["id"],
        "created_at": datetime.utcnow()
    }

    result = folders_collection.insert_one(doc)
    created = folders_collection.find_one({"_id": result.inserted_id})
    return serialize_doc(created)