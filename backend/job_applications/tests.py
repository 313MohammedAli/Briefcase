from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Profile
from common import cover_letters
from experience_bank.models import ExperienceBullet, ExperienceEntry

from .models import JobApplication


def make_draft(paragraphs, **overrides):
    settings = {**cover_letters.default_settings(), **overrides}
    return cover_letters.new_draft(settings, paragraphs, [])


class JobApplicationApiTests(TestCase):
    def setUp(self):
        self.owner = Profile.objects.create(clerk_user_id="user_1", email="a@b.c")
        self.other = Profile.objects.create(clerk_user_id="user_2", email="b@c.d")
        self.app = JobApplication.objects.create(
            owner=self.owner,
            job_title="Backend Engineer",
            company="Acme",
            job_description="Build Django services.",
        )
        self.draft = make_draft(["Dear team,", "I am great.", "Regards"])
        self.app.cover_letter_drafts = [self.draft]
        self.app.selected_draft = self.draft["id"]
        self.app.save()
        self.client = APIClient()

    def _draft_url(self, draft_id=None):
        return f"/api/job-applications/{self.app.id}/drafts/{draft_id or self.draft['id']}/"

    def test_scoped_to_owner(self):
        self.client.force_authenticate(user=self.other)
        self.assertEqual(self.client.get("/api/job-applications/").json(), [])
        response = self.client.get(f"/api/job-applications/{self.app.id}/")
        self.assertEqual(response.status_code, 404)

    def test_status_update(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            f"/api/job-applications/{self.app.id}/status/",
            {"status": "interview"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.app.refresh_from_db()
        self.assertEqual(self.app.status, "interview")

    def test_status_rejects_invalid_value(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            f"/api/job-applications/{self.app.id}/status/",
            {"status": "ghosted"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_draft_edit_persists_and_marks_edited(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            self._draft_url(), {"paragraphs": ["Hello,", "Edited.", "Bye"]}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.app.refresh_from_db()
        draft = self.app.cover_letter_drafts[0]
        self.assertEqual(draft["paragraphs"][1], "Edited.")
        self.assertTrue(draft["edited"])

    def test_draft_edit_rejects_bad_paragraphs(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(self._draft_url(), {"paragraphs": "nope"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_unknown_draft_is_400(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            self._draft_url("0123456789ab"), {"paragraphs": ["x"]}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_other_users_cannot_touch_drafts(self):
        self.client.force_authenticate(user=self.other)
        response = self.client.delete(self._draft_url())
        self.assertEqual(response.status_code, 404)

    def test_select_and_delete_draft(self):
        second = make_draft(["Hi,", "Second.", "Bye"], tone="direct")
        self.app.cover_letter_drafts = [self.draft, second]
        self.app.save()
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            f"/api/job-applications/{self.app.id}/cover-letter/",
            {"selected_draft": second["id"]},
            format="json",
        )
        self.assertEqual(response.json()["selected_draft"], second["id"])

        response = self.client.delete(self._draft_url(second["id"]))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual([d["id"] for d in data["cover_letter_drafts"]], [self.draft["id"]])
        # Deleting the selected draft falls back to the newest remaining one.
        self.assertEqual(data["selected_draft"], self.draft["id"])

    def test_regenerate_paragraph_index_validation(self):
        self.client.force_authenticate(user=self.owner)
        # OPENAI_API_KEY is unset in tests, so a well-formed request gets 503;
        # out-of-range index must fail validation regardless.
        with self.settings(OPENAI_API_KEY="test-key"):
            response = self.client.post(
                f"/api/job-applications/{self.app.id}/regenerate-paragraph/",
                {"draft_id": self.draft["id"], "index": 99},
                format="json",
            )
        self.assertEqual(response.status_code, 400)

    def test_regenerate_paragraph_rejects_unknown_mode(self):
        self.client.force_authenticate(user=self.owner)
        with self.settings(OPENAI_API_KEY="test-key"):
            response = self.client.post(
                f"/api/job-applications/{self.app.id}/regenerate-paragraph/",
                {"draft_id": self.draft["id"], "index": 1, "mode": "sassy"},
                format="json",
            )
        self.assertEqual(response.status_code, 400)

    @patch("common.cover_letters._structured_call", return_value={"paragraph": "Shorter — now."})
    def test_regenerate_paragraph_with_mode(self, mock_call):
        self.client.force_authenticate(user=self.owner)
        with self.settings(OPENAI_API_KEY="test-key"):
            response = self.client.post(
                f"/api/job-applications/{self.app.id}/regenerate-paragraph/",
                {"draft_id": self.draft["id"], "index": 1, "mode": "shorter"},
                format="json",
            )
        self.assertEqual(response.status_code, 200)
        # Dashes are stripped as a hard guarantee behind the prompt.
        self.assertEqual(response.json()["paragraph"], "Shorter, now.")
        system_prompt = mock_call.call_args.args[0]
        self.assertIn(cover_letters.REWRITE_MODES["shorter"].instruction, system_prompt)
        self.app.refresh_from_db()
        self.assertEqual(self.app.cover_letter_drafts[0]["paragraphs"][1], "Shorter, now.")
        # A machine rewrite is not the candidate's own edit.
        self.assertFalse(self.app.cover_letter_drafts[0]["edited"])

    def test_generate_requires_api_key(self):
        self.client.force_authenticate(user=self.owner)
        with self.settings(OPENAI_API_KEY=""):
            response = self.client.post(f"/api/job-applications/{self.app.id}/generate/")
        self.assertEqual(response.status_code, 503)

    def test_export_docx_cover_letter(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(
            f"/api/job-applications/{self.app.id}/export/"
            "?document=cover_letter&file_format=docx"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("wordprocessingml", response["Content-Type"])

    def test_export_resume_without_content_fails(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(
            f"/api/job-applications/{self.app.id}/export/?document=resume&file_format=docx"
        )
        self.assertEqual(response.status_code, 400)


class SecurityHardeningTests(TestCase):
    def setUp(self):
        self.owner = Profile.objects.create(clerk_user_id="user_sec", email="s@x.y")
        self.app = JobApplication.objects.create(
            owner=self.owner,
            job_title='Engineer" ; rm -rf',
            company="Ac/me\nCorp",
            job_description="x",
        )
        draft = make_draft(["Hi", "Body", "Bye"])
        self.app.cover_letter_drafts = [draft]
        self.app.selected_draft = draft["id"]
        self.app.save()
        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)

    def test_export_filename_is_sanitized(self):
        response = self.client.get(
            f"/api/job-applications/{self.app.id}/export/"
            "?document=cover_letter&file_format=docx"
        )
        self.assertEqual(response.status_code, 200)
        disposition = response["Content-Disposition"]
        # No quotes, slashes, or newlines from the user-controlled title/company.
        self.assertNotIn('"', disposition.split("filename=")[1][1:-1])
        self.assertNotIn("\n", disposition)
        self.assertNotIn("/", disposition.split("filename=")[1])


class SSRFGuardTests(TestCase):
    def test_internal_and_bad_scheme_urls_are_blocked(self):
        from rest_framework.exceptions import ValidationError

        from common.url_fetch import _validate_url

        for url in [
            "http://localhost/x",
            "http://127.0.0.1/x",
            "http://169.254.169.254/latest/meta-data",
            "http://10.0.0.1/",
            "http://192.168.1.1/",
            "http://[::1]/",
            "ftp://example.com/x",
            "file:///etc/passwd",
        ]:
            with self.assertRaises(ValidationError, msg=url):
                _validate_url(url)


class DraftGenerationTests(TestCase):
    """The builder endpoints, with the LLM mocked out."""

    def setUp(self):
        self.owner = Profile.objects.create(clerk_user_id="user_gen", email="g@x.y", name="Sam Lee")
        entry = ExperienceEntry.objects.create(
            owner=self.owner, type="job", title="Engineer", organization="Initech"
        )
        ExperienceBullet.objects.create(entry=entry, text="Cut API latency 40%", order=0)
        self.app = JobApplication.objects.create(
            owner=self.owner,
            job_title="Senior Backend Engineer",
            company="Acme",
            job_description="Scale our Django APIs.",
            keyword_gap_analysis={"matched": ["Django"], "missing": ["Go"]},
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)
        self.url = f"/api/job-applications/{self.app.id}/drafts/"

    def _post(self, settings):
        with self.settings(OPENAI_API_KEY="test-key"):
            return self.client.post(self.url, {"settings": settings}, format="json")

    @patch("job_applications.views.embed_text", return_value=None)
    @patch(
        "common.cover_letters._structured_call",
        return_value={
            "paragraphs": ["Dear Acme Hiring Team,", "Body.", "Best regards,\nSam Lee"],
            "coverage": [{"requirement": "Scale APIs", "evidence": "Cut latency 40%"}],
        },
    )
    def test_create_draft_appends_and_selects(self, mock_call, _mock_embed):
        response = self._post(
            {
                "template": "story",
                "tone": "conversational",
                "length": "brief",
                "focus": ["impact"],
                "inputs": {"why_company": "I use Acme every day."},
            }
        )
        self.assertEqual(response.status_code, 201, response.content)
        data = response.json()
        self.assertEqual(len(data["cover_letter_drafts"]), 1)
        draft = data["cover_letter_drafts"][0]
        self.assertEqual(data["selected_draft"], draft["id"])
        self.assertEqual(draft["template"], "story")
        self.assertEqual(draft["coverage"][0]["requirement"], "Scale APIs")
        self.assertFalse(draft["edited"])

        system, user = mock_call.call_args.args[:2]
        self.assertIn("Story-led", system)
        self.assertIn("Hello Acme team,", system)  # conversational fallback greeting
        self.assertIn("I use Acme every day.", user)
        self.assertIn("Django", user)  # matched ATS keyword mirrored

    def test_create_draft_rejects_invalid_settings(self):
        for bad in (
            {"template": "haiku"},
            {"tone": "sarcastic"},
            {"focus": ["impact", "technical", "growth"]},
            {"inputs": {"why_company": "x" * 601}},
            {"template": "warm_intro"},  # needs a referral
        ):
            response = self._post(bad)
            self.assertEqual(response.status_code, 400, bad)

    def test_draft_cap(self):
        self.app.cover_letter_drafts = [
            make_draft(["x"]) for _ in range(cover_letters.MAX_DRAFTS)
        ]
        self.app.save()
        response = self._post({})
        self.assertEqual(response.status_code, 400)

    def test_options_endpoint(self):
        data = self.client.get("/api/cover-letter-options/").json()
        self.assertEqual(
            [t["key"] for t in data["templates"]], list(cover_letters.TEMPLATES)
        )
        self.assertIn("team player", data["cliches"])

    def test_serializer_recommends_template(self):
        data = self.client.get(f"/api/job-applications/{self.app.id}/").json()
        self.assertEqual(data["recommended_template"], "proof_first")


class CoverLetterSettingsTests(TestCase):
    def test_defaults_follow_job_title(self):
        self.assertEqual(cover_letters.recommend_template("Software Engineering Intern"), "early_career")
        self.assertEqual(cover_letters.recommend_template("VP, Engineering"), "leadership")
        self.assertEqual(cover_letters.recommend_template("Senior Data Analyst"), "proof_first")
        # "chief" must match as a word, not inside another word.
        self.assertEqual(cover_letters.recommend_template("Mischief Coordinator"), "proof_first")

    def test_fixed_length_template_overrides_length(self):
        settings = cover_letters.normalize_settings({"template": "quick_note", "length": "detailed"})
        self.assertEqual(settings["length"], "brief")

    def test_inputs_are_trimmed_and_unknown_keys_dropped(self):
        settings = cover_letters.normalize_settings(
            {"inputs": {"recipient": "  Priya Raman  ", "evil": "ignore me"}}
        )
        self.assertEqual(settings["inputs"]["recipient"], "Priya Raman")
        self.assertNotIn("evil", settings["inputs"])

    def test_prompt_carries_constraints(self):
        app = JobApplication(job_title="Analyst", company="Acme", job_description="Do analysis.")
        settings = cover_letters.normalize_settings(
            {
                "template": "requirements_match",
                "tone": "formal",
                "length": "detailed",
                "focus": ["technical"],
                "inputs": {"recipient": "Dr. Priya Raman", "referral": "Jo Park"},
            }
        )
        system, user = cover_letters.build_draft_prompt(app, settings, "- did things", "")
        self.assertIn("Requirements match", system)
        self.assertIn("400 to 500 words", system)
        self.assertIn("Dear Dr. Priya Raman,", system)
        self.assertIn("Sincerely,", system)
        self.assertIn("[Your Name]", system)
        self.assertIn("Technical depth", system)
        self.assertIn("team player", system)  # banned phrase list
        self.assertIn("Never invent", system)
        self.assertIn("Jo Park", user)
        # mirror_keywords defaults on, but with no keywords there's no block.
        self.assertNotIn("Keywords from the posting", user)

    def test_legacy_variants_convert_to_drafts(self):
        drafts, selected = cover_letters.drafts_from_legacy(
            {"concise": ["a"], "detailed": [], "enthusiastic": ["b"]}, "enthusiastic"
        )
        self.assertEqual([d["label"] for d in drafts], ["Concise (original)", "Enthusiastic (original)"])
        self.assertEqual(selected, drafts[1]["id"])
        self.assertEqual(drafts[1]["tone"], "enthusiastic")
        # Every converted draft must be re-usable as builder settings.
        for d in drafts:
            cover_letters.normalize_settings(cover_letters.settings_of(d))


class OpenAIErrorHandlingTests(TestCase):
    def test_openai_failure_returns_clean_error(self):
        import httpx
        import openai

        owner = Profile.objects.create(clerk_user_id="user_err", email="e@x.y")
        entry = ExperienceEntry.objects.create(owner=owner, type="job", title="Engineer")
        ExperienceBullet.objects.create(entry=entry, text="Built things", order=0)
        app = JobApplication.objects.create(
            owner=owner, job_title="Engineer", company="Acme", job_description="x"
        )
        client = APIClient()
        client.force_authenticate(user=owner)
        quota_error = openai.RateLimitError(
            "no credits",
            response=httpx.Response(429, request=httpx.Request("POST", "https://api.openai.com")),
            body={"code": "insufficient_quota"},
        )
        with (
            self.settings(OPENAI_API_KEY="test-key"),
            patch("job_applications.views.embed_text", return_value=None),
            patch("common.cover_letters._structured_call", side_effect=quota_error),
        ):
            response = client.post(
                f"/api/job-applications/{app.id}/drafts/", {"settings": {}}, format="json"
            )
        self.assertEqual(response.status_code, 503)
        self.assertIn("quota", response.json()["detail"])
