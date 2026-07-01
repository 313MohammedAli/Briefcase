from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from experience_bank.views import ExperienceEntryViewSet
from job_applications.views import JobApplicationViewSet

router = DefaultRouter()
router.register("experience-entries", ExperienceEntryViewSet, basename="experience-entry")
router.register("job-applications", JobApplicationViewSet, basename="job-application")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", lambda request: JsonResponse({"status": "ok"})),
    path("api/", include(router.urls)),
]
