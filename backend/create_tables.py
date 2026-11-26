from app.db.database import Base, engine

# Import models so SQLAlchemy registers them
from app.models.user import User
from app.models.email_otp import EmailOTP

# Create database tables
Base.metadata.create_all(bind=engine)

print("SmartHire AI database tables created successfully!")