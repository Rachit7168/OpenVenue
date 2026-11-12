import json
from pathlib import Path

from django.contrib.auth import get_user_model
from django.test import TestCase

EXAMPLE = Path(__file__).resolve().parents[3] / "examples" / "empty-venue.json"


class ProjectApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="owner", password="test-pass-123")
        self.client.force_login(self.user)
        self.document = json.loads(EXAMPLE.read_text(encoding="utf-8"))
        self.document["project"]["name"] = "Hall"
        self.document["venue"]["floors"][0]["zones"] = [
            {
                "id": "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e41",
                "type": "zone",
                "name": "Food court",
                "boundary": [
                    {"x": 0, "z": 0},
                    {"x": 4, "z": 0},
                    {"x": 4, "z": 4},
                    {"x": 0, "z": 4},
                ],
                "interaction": {"type": "menu", "contentRef": "content/food-court.json"},
            }
        ]

    def create_project(self):
        response = self.client.post(
            "/api/v1/projects/",
            data=json.dumps({"name": "Hall", "document": self.document}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        return response

    def test_rejects_invalid_documents(self):
        response = self.client.post(
            "/api/v1/projects/",
            data=json.dumps({"name": "Hall", "document": {"project": {"name": "Broken"}}}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_save_requires_the_current_etag(self):
        created = self.create_project()
        project_id = created.json()["id"]
        url = f"/api/v1/projects/{project_id}/document/"
        loaded = self.client.get(url)
        self.assertEqual(loaded.status_code, 200)
        etag = loaded.headers["ETag"]

        stale = self.client.put(
            url,
            data=json.dumps(self.document),
            content_type="application/json",
            HTTP_IF_MATCH='"rev-0"',
        )
        self.assertEqual(stale.status_code, 409)

        updated = json.loads(json.dumps(self.document))
        updated["project"]["name"] = "Updated"
        saved = self.client.put(
            url,
            data=json.dumps(updated),
            content_type="application/json",
            HTTP_IF_MATCH=etag,
        )
        self.assertEqual(saved.status_code, 200)
        self.assertNotEqual(saved.headers["ETag"], etag)
        self.assertEqual(self.client.get(url).json()["project"]["name"], "Updated")

    def test_restore_copies_an_older_revision_forward(self):
        created = self.create_project()
        project_id = created.json()["id"]
        url = f"/api/v1/projects/{project_id}/document/"
        etag = self.client.get(url).headers["ETag"]
        updated = json.loads(json.dumps(self.document))
        updated["project"]["name"] = "Second"
        self.client.put(
            url,
            data=json.dumps(updated),
            content_type="application/json",
            HTTP_IF_MATCH=etag,
        )
        restored = self.client.post(f"/api/v1/projects/{project_id}/revisions/1/restore/")
        self.assertEqual(restored.status_code, 200)
        self.assertEqual(self.client.get(url).json()["project"]["name"], "Hall")

    def test_private_venues_stay_off_the_public_endpoint(self):
        created = self.create_project()
        project_id = created.json()["id"]
        self.client.logout()
        hidden = self.client.get(f"/api/v1/public/venues/{project_id}/")
        self.assertEqual(hidden.status_code, 404)
        self.client.force_login(self.user)
        publish = self.client.patch(
            f"/api/v1/projects/{project_id}/",
            data=json.dumps({"is_public": True}),
            content_type="application/json",
        )
        self.assertEqual(publish.status_code, 200)
        self.client.logout()
        public = self.client.get(f"/api/v1/public/venues/{project_id}/")
        self.assertEqual(public.status_code, 200)
        self.assertIn("private", public.headers["Cache-Control"])

    def test_public_zone_and_content_endpoints(self):
        created = self.create_project()
        project_id = created.json()["id"]
        self.client.patch(
            f"/api/v1/projects/{project_id}/",
            data=json.dumps({"is_public": True}),
            content_type="application/json",
        )
        self.client.logout()
        zones = self.client.get(f"/api/v1/public/venues/{project_id}/zones/")
        self.assertEqual(zones.status_code, 200)
        self.assertEqual(zones.json()[0]["name"], "Food court")
        content = self.client.get(
            f"/api/v1/public/venues/{project_id}/content/?ref=content/food-court.json"
        )
        self.assertEqual(content.status_code, 200)
        payload = json.loads(b"".join(content.streaming_content))
        self.assertEqual(payload["title"], "Food court")
