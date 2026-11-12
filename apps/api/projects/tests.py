import json

from django.contrib.auth import get_user_model
from django.test import TestCase


class ProjectApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="owner", password="test-pass-123")
        self.client.force_login(self.user)
        self.document = {"project": {"name": "Hall"}, "venue": {"floors": []}}

    def create_project(self):
        response = self.client.post(
            "/api/v1/projects/",
            data=json.dumps({"name": "Hall", "document": self.document}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        return response

    def test_save_requires_the_current_etag(self):
        created = self.create_project()
        project_id = created.json()["id"]
        url = f"/api/v1/projects/{project_id}/document/"
        loaded = self.client.get(url)
        self.assertEqual(loaded.status_code, 200)
        self.assertEqual(loaded.headers["ETag"], '"rev-1"')

        stale = self.client.put(
            url,
            data=json.dumps({"project": {"name": "Stale"}}),
            content_type="application/json",
            HTTP_IF_MATCH='"rev-0"',
        )
        self.assertEqual(stale.status_code, 409)

        saved = self.client.put(
            url,
            data=json.dumps({"project": {"name": "Updated"}}),
            content_type="application/json",
            HTTP_IF_MATCH=loaded.headers["ETag"],
        )
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.headers["ETag"], '"rev-2"')
        self.assertEqual(self.client.get(url).json()["project"]["name"], "Updated")

    def test_restore_copies_an_older_revision_forward(self):
        created = self.create_project()
        project_id = created.json()["id"]
        url = f"/api/v1/projects/{project_id}/document/"
        self.client.put(
            url,
            data=json.dumps({"project": {"name": "Second"}}),
            content_type="application/json",
            HTTP_IF_MATCH='"rev-1"',
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
        from projects.models import Project

        Project.objects.filter(id=project_id).update(is_public=True)
        self.client.logout()
        public = self.client.get(f"/api/v1/public/venues/{project_id}/")
        self.assertEqual(public.status_code, 200)
        self.assertIn("max-age=60", public.headers["Cache-Control"])
