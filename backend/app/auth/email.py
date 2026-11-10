import logging
from typing import Protocol

logger = logging.getLogger(__name__)


class EmailSender(Protocol):
    async def send_password_reset(self, to_email: str, reset_url: str) -> None: ...


class UnconfiguredEmailSender:
    """Default sender: no email provider is configured, so nothing is delivered.

    It says so loudly instead of pretending, and it never logs the reset link or token.
    Replace it (app.state.email_sender) with a real provider such as SendGrid or SES.
    """

    async def send_password_reset(self, to_email: str, reset_url: str) -> None:
        logger.warning("Password reset requested but no email provider is configured; not sent.")
