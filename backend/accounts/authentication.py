import jwt
from django.conf import settings
from rest_framework import authentication, exceptions

from .models import Profile

_jwks_client = None


def _get_jwks_client():
    global _jwks_client
    if _jwks_client is None:
        if not settings.CLERK_JWKS_URL:
            raise exceptions.AuthenticationFailed("CLERK_JWKS_URL is not configured")
        _jwks_client = jwt.PyJWKClient(settings.CLERK_JWKS_URL)
    return _jwks_client


class ClerkJWTAuthentication(authentication.BaseAuthentication):
    """Verifies a Clerk-issued session JWT sent as `Authorization: Bearer <token>`.

    On first sight of a given Clerk user id, lazily creates a local
    Profile so ExperienceEntry/JobApplication rows have something to
    key off of.
    """

    keyword = "Bearer"

    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).decode("utf-8")
        if not auth_header or not auth_header.startswith(f"{self.keyword} "):
            return None

        token = auth_header[len(self.keyword) + 1:]

        try:
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                issuer=settings.CLERK_ISSUER or None,
                options={"verify_aud": False},
            )
        except jwt.PyJWTError as exc:
            raise exceptions.AuthenticationFailed(f"Invalid Clerk token: {exc}")

        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise exceptions.AuthenticationFailed("Clerk token missing `sub` claim")

        email = payload.get("email", "")
        name = payload.get("name", "")

        profile, _ = Profile.objects.get_or_create(
            clerk_user_id=clerk_user_id,
            defaults={"email": email, "name": name},
        )
        # Keep the local copy in sync with Clerk; the name claim only exists
        # once the session token is customized to include it, so pick it up
        # whenever it appears or changes.
        changed = []
        if email and profile.email != email:
            profile.email = email
            changed.append("email")
        if name and profile.name != name:
            profile.name = name
            changed.append("name")
        if changed:
            profile.save(update_fields=changed)

        return (profile, None)
