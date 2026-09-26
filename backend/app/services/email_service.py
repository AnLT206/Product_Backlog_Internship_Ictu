import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    @staticmethod
    def send_email(to_email: str, subject: str, body: str) -> bool:
        settings = get_settings()
        required_settings = {
            "SMTP_HOST": settings.smtp_host,
            "SMTP_USERNAME": settings.smtp_username,
            "SMTP_PASSWORD": settings.smtp_password,
            "SMTP_FROM_EMAIL": settings.smtp_from_email,
        }
        missing_settings = [name for name, value in required_settings.items() if not value]
        if missing_settings:
            logger.warning(
                "SMTP email is not configured; missing: %s",
                ", ".join(missing_settings),
            )
            return False

        message = EmailMessage()
        message["To"] = to_email
        message["Subject"] = subject
        message["From"] = formataddr((settings.smtp_from_name, settings.smtp_from_email))
        message.set_content(body)

        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
                if settings.smtp_use_tls:
                    smtp.starttls()
                smtp.login(settings.smtp_username, settings.smtp_password)
                smtp.send_message(message)
        except (OSError, smtplib.SMTPException, ValueError):
            logger.exception("Failed to send SMTP email to %s", to_email)
            return False

        return True
