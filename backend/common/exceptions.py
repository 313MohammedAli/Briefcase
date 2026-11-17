"""API exception handling: turn upstream AI failures into clean responses.

Without this, an OpenAI outage or an exhausted quota surfaces as a bare 500
and the frontend can only show "Internal Server Error".
"""

import logging

import openai
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None or not isinstance(exc, openai.OpenAIError):
        return response

    logger.warning("OpenAI call failed: %s", exc)
    body = getattr(exc, "body", None)
    code = body.get("code") if isinstance(body, dict) else None
    if isinstance(exc, openai.RateLimitError) and code in (
        "insufficient_quota",
        "credit_balance_exhausted",
    ):
        detail = (
            "AI generation is unavailable: the server's OpenAI quota is used up. "
            "Nothing was changed."
        )
        return Response({"detail": detail}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    if isinstance(exc, (openai.RateLimitError, openai.APITimeoutError, openai.APIConnectionError)):
        detail = "The AI service is busy or unreachable. Try again in a minute."
        return Response({"detail": detail}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response(
        {"detail": "The AI service returned an error. Try again in a minute."},
        status=status.HTTP_502_BAD_GATEWAY,
    )
