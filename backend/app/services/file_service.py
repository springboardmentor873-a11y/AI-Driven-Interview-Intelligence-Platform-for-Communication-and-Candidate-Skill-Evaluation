import os
import uuid
import aiofiles
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, HTTPException, status

from app.core.config import settings


class FileService:
    @staticmethod
    def validate_file(file: UploadFile) -> Tuple[str, str]:
        """Validate file extension and MIME type."""
        filename = file.filename or ""
        file_ext = Path(filename).suffix.lower()

        allowed_exts = settings.ALLOWED_EXTENSIONS
        if file_ext not in allowed_exts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file format '{file_ext}'. Allowed formats: {', '.join(allowed_exts)}",
            )

        content_type = file.content_type or "application/octet-stream"
        return filename, file_ext

    @staticmethod
    async def save_resume_file(file: UploadFile) -> Tuple[str, str, int, str]:
        """
        Saves uploaded resume safely with a unique filename.
        Returns: (original_filename, stored_filename, file_size_in_bytes, file_path)
        """
        original_filename, file_ext = FileService.validate_file(file)

        # Unique filename on disk to avoid conflicts and collisions
        stored_filename = f"{uuid.uuid4().hex}{file_ext}"
        destination_path = Path(settings.UPLOAD_DIR) / stored_filename

        max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        file_size = 0

        # Read and write chunks to disk while verifying size limit
        async with aiofiles.open(destination_path, "wb") as out_file:
            while content := await file.read(1024 * 64):  # 64 KB chunks
                file_size += len(content)
                if file_size > max_size_bytes:
                    # Remove partially written file if size exceeds threshold
                    await out_file.close()
                    if destination_path.exists():
                        destination_path.unlink()
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.",
                    )
                await out_file.write(content)

        return original_filename, stored_filename, file_size, str(destination_path)

    @staticmethod
    def delete_file(file_path: str) -> bool:
        """Safely remove a file from local disk."""
        try:
            path = Path(file_path)
            if path.exists() and path.is_file():
                path.unlink()
                return True
        except Exception:
            pass
        return False

