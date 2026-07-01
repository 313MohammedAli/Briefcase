from django.contrib import admin

from .models import ExperienceBullet, ExperienceEntry


class ExperienceBulletInline(admin.TabularInline):
    model = ExperienceBullet
    extra = 1
    fields = ("text", "order")


@admin.register(ExperienceEntry)
class ExperienceEntryAdmin(admin.ModelAdmin):
    list_display = ("title", "organization", "type", "owner", "start_date", "end_date")
    list_filter = ("type",)
    search_fields = ("title", "organization", "owner__email")
    inlines = [ExperienceBulletInline]
