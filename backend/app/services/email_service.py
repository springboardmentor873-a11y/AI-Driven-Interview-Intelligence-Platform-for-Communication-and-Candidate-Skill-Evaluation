from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import settings


mail_config = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)


async def send_otp_email(email: str, otp: str):

    message = MessageSchema(
        subject="SmartHire AI - Email Verification",
        recipients=[email],
        body=f"""
        Hello!

        Welcome to SmartHire AI.

        Your email verification OTP is: {otp}

        This OTP is valid for 5 minutes.

        If you did not request this, please ignore this email.

        Regards,
        SmartHire AI Team
        """,
        subtype=MessageType.plain
    )

    fast_mail = FastMail(mail_config)
    await fast_mail.send_message(message)