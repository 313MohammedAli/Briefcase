from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Profile
from common.generation import keyword_gap_analysis
from common.retrieval import _score_from_distances, retrieve_relevant_bullets

from .models import ExperienceBullet, ExperienceEntry


def make_entry(owner, title="Engineer", bullets=(), tags=()):
    entry = ExperienceEntry.objects.create(
        owner=owner, type="job", title=title, organization="Acme", tags=list(tags)
    )
    for i, text in enumerate(bullets):
        ExperienceBullet.objects.create(entry=entry, text=text, order=i)
    return entry


class RetrievalTests(TestCase):
    def setUp(self):
        self.owner = Profile.objects.create(clerk_user_id="user_1", email="a@b.c")

    def test_small_bank_returns_all_bullets_without_retrieval(self):
        make_entry(self.owner, bullets=["Built an API", "Led a team"])
        result = retrieve_relevant_bullets(self.owner, [0.1] * 1536)
        self.assertFalse(result.used_retrieval)
        self.assertEqual(len(result.bullets), 2)

    def test_no_embedding_returns_all_bullets_unscored(self):
        make_entry(self.owner, bullets=["Built an API"])
        result = retrieve_relevant_bullets(self.owner, None)
        self.assertFalse(result.used_retrieval)
        self.assertIsNone(result.match_score)

    def test_score_mapping_clamps_to_0_100(self):
        self.assertEqual(_score_from_distances([0.9]), 0.0)  # similarity 0.1 -> floor
        self.assertEqual(_score_from_distances([0.4]), 100.0)  # similarity 0.6 -> ceiling
        self.assertEqual(_score_from_distances([0.65]), 50.0)  # similarity 0.35 -> midpoint


class KeywordGapTests(TestCase):
    def setUp(self):
        self.owner = Profile.objects.create(clerk_user_id="user_2", email="b@c.d")
        self.entry = make_entry(
            self.owner,
            bullets=["Built Django REST APIs on PostgreSQL"],
            tags=["Python"],
        )

    def test_literal_and_tag_matches_without_embeddings(self):
        bullets = list(ExperienceBullet.objects.filter(entry__owner=self.owner))
        result = keyword_gap_analysis(["Django", "Python", "Kubernetes"], bullets)
        self.assertEqual(result["matched"], ["Django", "Python"])
        self.assertEqual(result["missing"], ["Kubernetes"])

    def test_empty_keywords(self):
        self.assertEqual(keyword_gap_analysis([], []), {"matched": [], "missing": []})


class PerUserScopingTests(TestCase):
    def setUp(self):
        self.alice = Profile.objects.create(clerk_user_id="user_a", email="alice@x.y")
        self.bob = Profile.objects.create(clerk_user_id="user_b", email="bob@x.y")
        self.alice_entry = make_entry(self.alice, title="Alice's job", bullets=["did things"])
        self.client = APIClient()

    def test_user_only_sees_own_entries(self):
        self.client.force_authenticate(user=self.bob)
        response = self.client.get("/api/experience-entries/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_user_cannot_fetch_others_entry(self):
        self.client.force_authenticate(user=self.bob)
        response = self.client.get(f"/api/experience-entries/{self.alice_entry.id}/")
        self.assertEqual(response.status_code, 404)

    def test_create_and_update_entry_with_bullets(self):
        self.client.force_authenticate(user=self.bob)
        response = self.client.post(
            "/api/experience-entries/",
            {
                "type": "project",
                "title": "Side project",
                "tags": ["React"],
                "bullets": [{"text": "Shipped it", "order": 0}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        entry_id = response.json()["id"]

        response = self.client.put(
            f"/api/experience-entries/{entry_id}/",
            {
                "type": "project",
                "title": "Side project v2",
                "tags": [],
                "bullets": [{"text": "Rewrote it", "order": 0}, {"text": "Scaled it", "order": 1}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["title"], "Side project v2")
        self.assertEqual(len(body["bullets"]), 2)
