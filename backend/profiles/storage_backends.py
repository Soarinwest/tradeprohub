# backend/profiles/storage_backends.py

from storages.backends.s3boto3 import S3Boto3Storage

class ProfileMediaStorage(S3Boto3Storage):
    location = 'profile_photos'     # folder in your bucket
    default_acl = 'public-read'
    file_overwrite = False