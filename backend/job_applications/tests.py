from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Profile

from .models import JobApplication


class JobApplicationApiTests(TestCase):
    def setUp(self):
        self.owner = Profile.objects.create(clerk_user_id="user_1", email="a@b.c")
        self.other = Profile.objects.create(clerk_user_id="user_2", email="b@c.d")
        self.app = JobApplication.objects.create(
            owner=self.owner,
            job_title="Backend Engineer",
            company="Acme",
            job_description="Build Django services.",
            generated_cover_letters={"concise": ["Dear team,", "I am great.", "Regards"]},
            selected_variant="concise",
        )
        self.client = APIClient()

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

    def test_cover_letter_edit_persists(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            f"/api/job-applications/{self.app.id}/cover-letter/",
            {"variant": "concise", "paragraphs": ["Hello,", "Edited.", "Bye"]},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.app.refresh_from_db()
        self.assertEqual(self.app.generated_cover_letters["concise"][1], "Edited.")

    def test_cover_letter_rejects_bad_variant(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            f"/api/job-applications/{self.app.id}/cover-letter/",
            {"variant": "sassy", "paragraphs": ["Hi"]},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_regenerate_paragraph_index_validation(self):
        self.client.force_authenticate(user=self.owner)
        # OPENAI_API_KEY is unset in tests, so a well-formed request gets 503;
        # out-of-range index must fail validation regardless.
        with self.settings(OPENAI_API_KEY="test-key"):
            response = self.client.post(
                f"/api/job-applications/{self.app.id}/regenerate-paragraph/",
                {"variant": "concise", "index": 99},
                format="json",
            )
        self.assertEqual(response.status_code, 400)

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
            generated_cover_letters={"concise": ["Hi", "Body", "Bye"]},
            selected_variant="concise",
        )
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
