from django.contrib.auth import get_user_model
from django.test import TestCase


class AuthApiTests(TestCase):
    def test_register_login_and_profile(self):
        registered = self.client.post(
            "/api/v1/auth/register/",
            data={"name": "Ada", "email": "ada@example.com", "password": "long-enough"},
            content_type="application/json",
        )
        self.assertEqual(registered.status_code, 201)
        self.assertEqual(registered.json()["email"], "ada@example.com")

        self.client.post("/api/v1/auth/logout/", content_type="application/json")
        logged_in = self.client.post(
            "/api/v1/auth/login/",
            data={"email": "ada@example.com", "password": "long-enough"},
            content_type="application/json",
        )
        self.assertEqual(logged_in.status_code, 200)
        me = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["name"], "Ada")

    def test_admin_can_manage_email(self):
        user_model = get_user_model()
        user = user_model.objects.create_user(
            username="owner",
            email="owner@studio.com",
            password="admin-pass-9",
            is_staff=True,
            is_superuser=True,
        )
        self.client.force_login(user)
        changed = self.client.patch(
            "/api/v1/auth/me/",
            data={"email": "new-owner@studio.com", "name": "Owner"},
            content_type="application/json",
        )
        self.assertEqual(changed.status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.email, "new-owner@studio.com")