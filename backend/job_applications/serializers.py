from rest_framework import serializers

from .models import JobApplication


class JobApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplication
        fields = [
            "id", "job_title", "company", "job_description",
            "generated_cover_letters", "selected_variant", "tailored_resume",
            "match_score", "keyword_gap_analysis", "status",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "generated_cover_letters", "tailored_resume", "match_score",
            "keyword_gap_analysis", "created_at", "updated_at",
        ]


class JobApplicationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplication
        fields = ["status"]
