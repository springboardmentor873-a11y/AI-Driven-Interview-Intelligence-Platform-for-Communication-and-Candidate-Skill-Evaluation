import secrets
import hashlib
from datetime import datetime, timedelta, timezone


def generate_otp():
    return f"{secrets.randbelow(1000000):06d}"


def hash_otp(otp: str):
    return hashlib.sha256(otp.encode()).hexdigest()


def verify_otp(otp: str, stored_hash: str):
    return secrets.compare_digest(hash_otp(otp), stored_hash)


def otp_expiry():
    return datetime.now(timezone.utc) + timedelta(minutes=5)