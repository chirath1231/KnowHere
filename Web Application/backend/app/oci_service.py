import io
import uuid
import mimetypes
import oci

from app.config import settings


class OCIStorageService:
    def __init__(self):
        config = oci.config.from_file(
            file_location=settings.OCI_CONFIG_FILE,
            profile_name=settings.OCI_CONFIG_PROFILE
        )
        self.client = oci.object_storage.ObjectStorageClient(config)

        # If namespace is not set in .env, fetch it automatically
        self.namespace = settings.OCI_NAMESPACE or self.client.get_namespace().data
        self.bucket_name = settings.OCI_BUCKET_NAME

    def upload_file(self, file_bytes: bytes, original_filename: str, content_type: str | None = None):
        ext = ""
        if "." in original_filename:
            ext = "." + original_filename.split(".")[-1]

        object_name = f"{uuid.uuid4()}{ext}"

        guessed_content_type = content_type or mimetypes.guess_type(original_filename)[0] or "application/octet-stream"

        self.client.put_object(
            namespace_name=self.namespace,
            bucket_name=self.bucket_name,
            object_name=object_name,
            put_object_body=io.BytesIO(file_bytes),
            content_type=guessed_content_type
        )

        return {
            "object_name": object_name,
            "bucket_name": self.bucket_name,
            "namespace": self.namespace,
            "content_type": guessed_content_type
        }

    def download_file(self, object_name: str):
        response = self.client.get_object(
            namespace_name=self.namespace,
            bucket_name=self.bucket_name,
            object_name=object_name
        )
        return response

    def delete_file(self, object_name: str):
        self.client.delete_object(
            namespace_name=self.namespace,
            bucket_name=self.bucket_name,
            object_name=object_name
        )


oci_storage = OCIStorageService()