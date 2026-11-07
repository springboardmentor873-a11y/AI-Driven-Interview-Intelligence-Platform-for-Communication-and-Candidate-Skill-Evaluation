
from app.database.database import Base, engine

# Register all SQLAlchemy models
from app.models import (
    User,
    CandidateProfile,
    RecruiterProfile,
    Resume,
)

def create_tables():
    Base.metadata.create_all(bind=engine)
    print("SmartHire AI database tables created successfully!")

if __name__ == "__main__":
    create_tables()
