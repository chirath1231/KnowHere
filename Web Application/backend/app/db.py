from pymongo import MongoClient
from app.config import settings

client = MongoClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]

files_collection = db["files"]
folders_collection = db["folders"]

file_chunks_collection = db["file_chunks"]
file_chat_sessions_collection = db["file_chat_sessions"]