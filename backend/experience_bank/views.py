from rest_framework import viewsets

from .models import ExperienceEntry
from .serializers import ExperienceEntrySerializer


class ExperienceEntryViewSet(viewsets.ModelViewSet):
    serializer_class = ExperienceEntrySerializer

    def get_queryset(self):
        return ExperienceEntry.objects.filter(owner=self.request.user).prefetch_related("bullets")
