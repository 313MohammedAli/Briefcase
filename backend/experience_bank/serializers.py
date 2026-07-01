from rest_framework import serializers

from common.embeddings import embed_text

from .models import ExperienceBullet, ExperienceEntry


class ExperienceBulletSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExperienceBullet
        fields = ["id", "text", "order", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class ExperienceEntrySerializer(serializers.ModelSerializer):
    bullets = ExperienceBulletSerializer(many=True, required=False)

    class Meta:
        model = ExperienceEntry
        fields = [
            "id", "type", "title", "organization", "start_date", "end_date",
            "tags", "bullets", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        bullets_data = validated_data.pop("bullets", [])
        entry = ExperienceEntry.objects.create(
            owner=self.context["request"].user, **validated_data
        )
        for i, bullet in enumerate(bullets_data):
            text = bullet["text"]
            ExperienceBullet.objects.create(
                entry=entry, order=bullet.get("order", i), text=text, embedding=embed_text(text)
            )
        return entry

    def update(self, instance, validated_data):
        bullets_data = validated_data.pop("bullets", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if bullets_data is not None:
            instance.bullets.all().delete()
            for i, bullet in enumerate(bullets_data):
                text = bullet["text"]
                ExperienceBullet.objects.create(
                    entry=instance, order=bullet.get("order", i), text=text, embedding=embed_text(text)
                )
        return instance
