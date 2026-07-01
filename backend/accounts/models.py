import uuid

from django.db import models


class Profile(models.Model):
    """Local record for a Clerk-authenticated user.

    Created/updated lazily the first time a valid Clerk JWT for this
    user is seen (see accounts.authentication.ClerkJWTAuthentication).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clerk_user_id = models.CharField(max_length=255, unique=True)
    email = models.EmailField()
    name = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.email or self.clerk_user_id

    @property
    def is_authenticated(self):
        return True
