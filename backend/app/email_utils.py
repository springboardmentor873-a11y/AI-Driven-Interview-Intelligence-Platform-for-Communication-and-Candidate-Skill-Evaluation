
import os
import smtplib

from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()


def send_password_reset_email(receiver_email: str, reset_link: str):

    mail_server = os.getenv("MAIL_SERVER")
    mail_port = int(os.getenv("MAIL_PORT", "587"))
    mail_username = os.getenv("MAIL_USERNAME")
    mail_password = os.getenv("MAIL_PASSWORD")
    mail_from = os.getenv("MAIL_FROM")

    if not all([
        mail_server,
        mail_username,
        mail_password,
        mail_from
    ]):
        raise ValueError("Email configuration is incomplete")

    message = EmailMessage()

    message["Subject"] = "SmartHire AI - Password Reset"
    message["From"] = mail_from
    message["To"] = receiver_email

    message.set_content(
        f"""
Hello,

We received a request to reset your SmartHire AI account password.

Click the link below to reset your password:

{reset_link}

This link is valid for 15 minutes.

If you did not request a password reset, please ignore this email.

Regards,
SmartHire AI Team
"""
    )

    with smtplib.SMTP(mail_server, mail_port) as server:
        server.starttls()
        server.login(mail_username, mail_password)
        server.send_message(message)
