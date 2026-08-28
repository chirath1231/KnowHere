import oci


class OCIStorageService:
    def __init__(self):
        self.config = oci.config.from_file()
        self.client = oci.object_storage.ObjectStorageClient(self.config)
        self.namespace = self.client.get_namespace().data

    def download_file(self, bucket_name: str, object_name: str) -> bytes:
        response = self.client.get_object(self.namespace, bucket_name, object_name)
        return response.data.content


oci_storage = OCIStorageService()