from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "knowhere"

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    OPENAI_API_KEY: str
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str | None = None
    OCI_BUCKET_NAME: str
    OCI_NAMESPACE: str
    OCI_CONFIG_FILE: str
    OCI_CONFIG_PROFILE: str = "DEFAULT"

    CHROMA_API_KEY: str
    CHROMA_TENANT: str
    CHROMA_DATABASE: str
    CHROMA_COLLECTION: str = "file_chunks"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()