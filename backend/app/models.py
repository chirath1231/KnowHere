from bson import ObjectId
from datetime import datetime


def serialize_doc(doc):
    if not doc:
        return None

    return {
        "id": str(doc["_id"]),
        "name": doc.get("name"),
        "type": doc.get("type"),
        "object_name": doc.get("object_name"),
        "bucket_name": doc.get("bucket_name"),
        "namespace": doc.get("namespace"),
        "content_type": doc.get("content_type"),
        "size": doc.get("size", 0),
        "folder_id": doc.get("folder_id"),
        "owner_id": doc.get("owner_id"),
        "ai_overview": doc.get("ai_overview", ""),
        "uploaded_at": doc.get("uploaded_at").isoformat() if isinstance(doc.get("uploaded_at"), datetime) else doc.get("uploaded_at"),
    }


def file_helper(file_doc):
    return {
        "id": str(file_doc["_id"]),
        "name": file_doc["name"],
        "owner": file_doc["owner"],
        "size": file_doc["size"],
        "folder_id": file_doc.get("folder_id"),
        "object_name": file_doc["object_name"],
        "bucket_name": file_doc["bucket_name"],
        "url": file_doc.get("url"),
        "uploaded_at": file_doc["uploaded_at"].isoformat()
    }

def user_helper(user) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "is_active": user.get("is_active", True),
    }

def subscription_plan_helper(plan) -> dict:
    return {
        "id": str(plan["_id"]),
        "name": plan["name"],
        "price": plan["price"],
        "features": plan["features"],
        "storage": plan["storage"],
        "ai_features": plan["ai_features"],
    }

