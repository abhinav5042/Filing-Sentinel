"""
Email sending via Resend, used for account verification emails.
"""

import os
import resend

resend.api_key = os.environ.get("RESEND_API_KEY")

BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")


def send_verification_email(to_email, token):
    verify_url = f"{BACKEND_URL}/verify-email?token={token}"
    resend.Emails.send({
        "from": "FilingSentinel <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "Verify your FilingSentinel email",
        "html": (
            f"<p>Welcome to FilingSentinel.</p>"
            f"<p><a href={verify_url}>Click here to verify your email address</a></p>"
            f"<p>If you did not create this account, you can ignore this email.</p>"
        ),
    })
