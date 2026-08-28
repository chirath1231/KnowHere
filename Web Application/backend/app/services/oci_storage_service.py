import io
import uuid
import mimetypes
import oci

from app.config import settings


class OCIStorageService:
    def __init__(self):
        config = oci.config.from_file(
            file_location="C:/Users/USER/.oci/config",
            profile_name="DEFAULT"
        )

        self.client = oci.object_storage.ObjectStorageClient(config)

        self.namespace = "axz8nar3k6bi"
        self.bucket_name = "Knowhere"

    def upload_file(self, file_bytes: bytes, original_filename: str, content_type=None):
        ext = ""

        if "." in original_filename:
            ext = "." + original_filename.split(".")[-1]

        object_name = f"{uuid.uuid4()}{ext}"

        guessed_type = content_type or mimetypes.guess_type(original_filename)[0] or "application/octet-stream"

        self.client.put_object(
            namespace_name=self.namespace,
            bucket_name=self.bucket_name,
            object_name=object_name,
            put_object_body=io.BytesIO(file_bytes),
            content_type=guessed_type
        )

        return {
            "object_name": object_name,
            "bucket_name": self.bucket_name,
            "namespace": self.namespace,
            "content_type": guessed_type
        }

    def download_file(self, object_name: str, bucket_name: str | None = None) -> bytes:
        target_bucket = bucket_name or self.bucket_name

        response = self.client.get_object(
            namespace_name=self.namespace,
            bucket_name=target_bucket,
            object_name=object_name
        )

        return response.data.content


oci_storage = OCIStorageService()