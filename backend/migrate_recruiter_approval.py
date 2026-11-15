
from sqlalchemy import text
from app.database.database import engine

migration_sql = """
ALTER TABLE recruiter_profiles
ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
ADD COLUMN approved_by INTEGER REFERENCES users(id),
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
"""

with engine.begin() as connection:
    connection.execute(text(migration_sql))

print("Recruiter approval columns added successfully!")
