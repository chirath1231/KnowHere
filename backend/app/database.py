from pymongo import MongoClient, ASCENDING
from app.config import settings

client = MongoClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]

# Collections
users_collection = db["users"]
files_collection = db["files"]
folders_collection = db["folders"]
subscription_plans_collection = db["subscription_plans"]


def create_indexes():
    # Users
    users_collection.create_index("email", unique=True)

    # Files
    files_collection.create_index([("owner_id", ASCENDING)])
    files_collection.create_index([("owner_id", ASCENDING), ("folder_id", ASCENDING)])

    # Folders
    folders_collection.create_index([("owner_id", ASCENDING)])

    # Subscription plans
    subscription_plans_collection.create_index("name", unique=True)