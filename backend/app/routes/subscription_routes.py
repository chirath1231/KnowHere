from fastapi import APIRouter
from app.database import subscription_plans_collection

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


def serialize_subscription(doc):
    return {
        "id": str(doc.get("_id")),
        "name": doc.get("name", ""),
        "price": doc.get("price", 0),
        "storage": doc.get("storage", ""),
        "features": doc.get("features", []) if isinstance(doc.get("features"), list) else [],
        "ai_features": doc.get("ai_features", []) if isinstance(doc.get("ai_features"), list) else [],
    }


@router.get("/")
def get_subscription_plans():
    plans = list(subscription_plans_collection.find().sort("price", 1))
    return [serialize_subscription(plan) for plan in plans]