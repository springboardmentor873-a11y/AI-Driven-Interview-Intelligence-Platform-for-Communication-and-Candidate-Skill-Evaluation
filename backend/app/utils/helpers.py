import re
import uuid


def format_file_size(size_bytes: int) -> str:
    """Convert bytes to human-readable string (KB, MB)."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"


def sanitize_filename(filename: str) -> str:
    """Remove unsafe characters from uploaded filenames."""
    # Keep only alphanumeric, hyphens, underscores, dots
    clean_name = re.sub(r"[^\w\.-]", "_", filename)
    return clean_name.strip("._")


def is_valid_uuid(val: str) -> bool:
    """Validate whether a string is a valid UUID."""
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False

