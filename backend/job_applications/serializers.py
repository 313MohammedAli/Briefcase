from rest_framework import serializers

from common.cover_letters import recommend_template

from .models import JobApplication


class JobApplicationSerializer(serializers.ModelSerializer):
    recommended_template = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = [
            "id", "job_title", "company", "job_description",
            "cover_letter_drafts", "selected_draft", "recommended_template",
            "tailored_resume", "match_score", "keyword_gap_analysis", "status",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "cover_letter_drafts", "selected_draft", "tailored_resume",
            "match_score", "keyword_gap_analysis", "created_at", "updated_at",
        ]

    def get_recommended_template(self, obj) -> str:
        return recommend_template(obj.job_title)


class JobApplicationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplication
        fields = ["status"]
