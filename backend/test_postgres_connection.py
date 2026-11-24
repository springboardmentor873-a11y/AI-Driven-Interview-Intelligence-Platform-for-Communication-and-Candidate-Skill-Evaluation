"""
SmartHire AI - PostgreSQL Connection Diagnostics Script
Usage: python test_postgres_connection.py
Tests database connectivity, prints latency, server version, and table status.
"""

import os
import sys
import time

# Ensure backend root is on Python's path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import text, inspect
from app.core.config import settings
from app.database.database import engine


def test_connection():
    print("=" * 60)
    print("    SmartHire AI - PostgreSQL Database Connection Test    ")
    print("=" * 60)

    target_url = engine.url.render_as_string(hide_password=True)
    print(f"\n[CONFIG] Target Database URL: {target_url}")
    print(f"[CONFIG] Database Name:       {settings.POSTGRES_DB}")
    print(f"[CONFIG] Host Server:         {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}")
    print(f"[CONFIG] Database User:       {settings.POSTGRES_USER}")

    print("\n[INFO] Attempting to connect to database...")
    start_time = time.time()

    try:
        with engine.connect() as conn:
            # 1. Test basic ping
            conn.execute(text("SELECT 1"))
            latency = (time.time() - start_time) * 1000

            print(f"\n[SUCCESS] Connection Established in {latency:.2f} ms!")
            print(f"  -> Dialect:             {engine.dialect.name.upper()}")

            # 2. Get database engine info
            if engine.dialect.name == "postgresql":
                db_info = conn.execute(
                    text("SELECT current_database(), current_user, version();")
                ).fetchone()
                print(f"  -> Connected Database:  {db_info[0]}")
                print(f"  -> Connected User:      {db_info[1]}")
                print(f"  -> Database Engine:     {db_info[2][:80]}...")
            else:
                db_version = conn.execute(text("SELECT sqlite_version();")).scalar()
                print(f"  -> Connected Database:  {engine.url.database}")
                print(f"  -> Database Version:    SQLite {db_version}")

            # 3. Check for Milestone 1 tables
            inspector = inspect(engine)
            existing_tables = inspector.get_table_names()
            expected_tables = ["users", "candidate_profiles", "recruiter_profiles", "resumes"]

            print("\n[TABLES] Inspecting Milestone 1 tables:")
            for tbl in expected_tables:
                if tbl in existing_tables:
                    print(f"  [x] Table '{tbl}' found.")
                else:
                    print(f"  [ ] Table '{tbl}' NOT found (run: alembic upgrade head).")

        print("\n" + "=" * 60)
        print("  DATABASE STATUS: HEALTHY AND READY")
        print("=" * 60)
        return True

    except Exception as exc:
        latency = (time.time() - start_time) * 1000
        print(f"\n[FAILED] Could not connect to PostgreSQL (took {latency:.2f} ms).")
        print(f"\n[ERROR DETAILS]:\n{exc}")

        print("\n" + "-" * 60)
        print("TROUBLESHOOTING CHECKLIST:")
        print("1. Is PostgreSQL installed and running on your machine?")
        print("   -> Check Windows Services: look for 'postgresql-x64-XX' and start it.")
        print(f"2. Does the database '{settings.POSTGRES_DB}' exist?")
        print(f"   -> Run in psql / pgAdmin: CREATE DATABASE {settings.POSTGRES_DB};")
        print("3. Check your backend/.env credentials:")
        print(f"   -> User:     {settings.POSTGRES_USER}")
        print(f"   -> Password: {settings.POSTGRES_PASSWORD}")
        print(f"   -> Host:     {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}")
        print("4. Need an instant cloud PostgreSQL database?")
        print("   -> Create a free database on Neon.tech or Supabase.com and paste")
        print("      its connection string into DATABASE_URL in backend/.env")
        print("-" * 60)
        return False


if __name__ == "__main__":
    test_connection()
