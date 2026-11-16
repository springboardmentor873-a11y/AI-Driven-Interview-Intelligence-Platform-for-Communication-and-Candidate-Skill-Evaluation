from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, func
from app.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(BigInteger, primary_key=True, index=True)

    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)

    uploaded_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )