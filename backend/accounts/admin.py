from django.contrib import admin

from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("email", "clerk_user_id", "created_at")
    search_fields = ("email", "clerk_user_id")
