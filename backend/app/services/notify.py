import logging
import smtplib
from email.message import EmailMessage

from sqlalchemy.orm import Session

from ..config import settings
from ..models import AuditLog, Notification, User

log = logging.getLogger("smarthire.notify")


def send_email(to: str, subject: str, body: str) -> bool:
    """Sends in a background thread so a slow mail server never blocks a request."""
    import threading

    threading.Thread(target=_send_email, args=(to, subject, body), daemon=True).start()
    return bool(settings.smtp_host)


def _send_email(to: str, subject: str, body: str) -> bool:
    if not settings.smtp_host:
        log.info("Email (SMTP not configured) to=%s subject=%s", to, subject)
        return False
    try:
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = settings.smtp_from, to, subject
        msg.set_content(body + f"\n\n{settings.company_name}\n{settings.app_url}")
        smtp_cls = smtplib.SMTP_SSL if settings.smtp_use_ssl or settings.smtp_port == 465 else smtplib.SMTP
        with smtp_cls(settings.smtp_host, settings.smtp_port, timeout=15) as s:
            if smtp_cls is smtplib.SMTP:
                s.starttls()
            if settings.smtp_user:
                s.login(settings.smtp_user, settings.smtp_password or "")
            s.send_message(msg)
        return True
    except Exception as exc:
        log.warning("Email send failed: %s", exc)
        return False


def notify(db: Session, user: User, title: str, body: str = "", kind: str = "info", link: str | None = None,
           email: bool = False) -> Notification:
    n = Notification(user_id=user.id, title=title, body=body, kind=kind, link=link)
    db.add(n)
    db.commit()
    if email:
        send_email(user.email, title, body + (f"\n\nOpen: {link}" if link else ""))
    return n


def audit(db: Session, user_id: int | None, action: str, detail: str = "") -> None:
    db.add(AuditLog(user_id=user_id, action=action, detail=detail[:2000]))
    db.commit()
