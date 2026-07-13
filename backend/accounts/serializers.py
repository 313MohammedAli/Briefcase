from rest_framework import serializers

from .models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            "name", "email", "personal_statement",
            "resume_filename", "resume_uploaded_at",
        ]
        # Identity comes from Clerk; only the personal statement is editable here.
        read_only_fields = ["name", "email", "resume_filename", "resume_uploaded_at"]
