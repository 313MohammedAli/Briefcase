"""Replaces the three fixed cover letter variants with open-ended drafts.

Existing letters are carried over: each non-empty variant becomes a draft
labelled "(original)", and the previously selected variant stays selected.
"""

from django.db import migrations, models


def forwards(apps, schema_editor):
    from common.cover_letters import drafts_from_legacy

    JobApplication = apps.get_model("job_applications", "JobApplication")
    for app in JobApplication.objects.all().iterator():
        drafts, selected = drafts_from_legacy(
            app.generated_cover_letters or {}, app.selected_variant
        )
        if drafts:
            app.cover_letter_drafts = drafts
            app.selected_draft = selected
            app.save(update_fields=["cover_letter_drafts", "selected_draft"])


def backwards(apps, schema_editor):
    from common.cover_letters import LEGACY_VARIANTS

    labels = {spec["label"]: variant for variant, spec in LEGACY_VARIANTS.items()}
    JobApplication = apps.get_model("job_applications", "JobApplication")
    for app in JobApplication.objects.all().iterator():
        letters, selected = {}, ""
        for draft in app.cover_letter_drafts or []:
            variant = labels.get(draft.get("label"))
            if variant:
                letters[variant] = draft.get("paragraphs", [])
                if draft.get("id") == app.selected_draft:
                    selected = variant
        app.generated_cover_letters = letters
        app.selected_variant = selected or ("concise" if letters else "")
        app.save(update_fields=["generated_cover_letters", "selected_variant"])


class Migration(migrations.Migration):
    dependencies = [
        ("job_applications", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="jobapplication",
            name="cover_letter_drafts",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="jobapplication",
            name="selected_draft",
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.RunPython(forwards, backwards),
        migrations.RemoveField(model_name="jobapplication", name="generated_cover_letters"),
        migrations.RemoveField(model_name="jobapplication", name="selected_variant"),
    ]
