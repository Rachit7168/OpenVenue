from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import SimpleTestCase


class HealthTests(SimpleTestCase):
    def test_health(self):
        response = self.client.get("/api/v1/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_openapi_schema(self):
        response = self.client.get("/api/v1/schema/?format=json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("/api/v1/health/", response.json()["paths"])

    def test_docs_page(self):
        response = self.client.get("/api/v1/docs/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"swagger", response.content.lower())


class UserModelTests(SimpleTestCase):
    def test_custom_user_is_the_auth_model(self):
        self.assertEqual(settings.AUTH_USER_MODEL, "users.User")
        user = get_user_model()
        self.assertEqual(user._meta.pk.get_internal_type(), "UUIDField")
