import logging

from django.conf import settings
from openai import OpenAI

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def embed_text(text: str) -> list[float] | None:
    """Embeds a single string via OPENAI_EMBEDDING_MODEL.

    Returns None (and logs a warning) if no API key is configured, so
    local scaffolding/tests work without OpenAI access.
    """
    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set; skipping embedding generation")
        return None

    response = _get_client().embeddings.create(
        model=settings.OPENAI_EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding


def embed_texts(texts: list[str]) -> list[list[float]] | None:
    """Embeds a batch of strings in one API call. Same no-key fallback as embed_text."""
    if not texts:
        return []
    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set; skipping embedding generation")
        return None

    response = _get_client().embeddings.create(
        model=settings.OPENAI_EMBEDDING_MODEL,
        input=texts,
    )
    return [item.embedding for item in response.data]
