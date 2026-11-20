from django.contrib.auth import get_user_model
from django.test import TestCase


class AuthApiTests(TestCase):
    def test_register_login_and_profile(self):
        registered = self.client.post(
            "/api/v1/auth/register/",
            data={
                "name": "Ada Lovelace",
                "email": "ada@example.com",
                "password": "long-enough-pass",
                "role": "Lead Architect",
                "organization": "Analytical Engines",
            },
            content_type="application/json",
        )
        self.assertEqual(registered.status_code, 201)
        self.assertEqual(registered.json()["email"], "ada@example.com")
        self.assertEqual(registered.json()["role"], "Lead Architect")
        me_after_register = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me_after_register.status_code, 200)
        self.assertEqual(me_after_register.json()["name"], "Ada Lovelace")

        logged_out = self.client.post("/api/v1/auth/logout/", content_type="application/json")
        self.assertEqual(logged_out.status_code, 204)
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 403)

        logged_in = self.client.post(
            "/api/v1/auth/login/",
            data={"email": "ada@example.com", "password": "long-enough-pass"},
            content_type="application/json",
        )
        self.assertEqual(logged_in.status_code, 200)
        me = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["organization"], "Analytical Engines")

    def test_rejects_common_passwords_and_duplicate_email(self):
        weak = self.client.post(
            "/api/v1/auth/register/",
            data={"name": "Ada", "email": "ada@example.com", "password": "password"},
            content_type="application/json",
        )
        self.assertEqual(weak.status_code, 400)

        created = self.client.post(
            "/api/v1/auth/register/",
            data={"name": "Ada", "email": "ada@example.com", "password": "long-enough-pass"},
            content_type="application/json",
        )
        self.assertEqual(created.status_code, 201)
        duplicate = self.client.post(
            "/api/v1/auth/register/",
            data={"name": "Other", "email": "ADA@example.com", "password": "another-long-pass"},
            content_type="application/json",
        )
        self.assertEqual(duplicate.status_code, 400)

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
            data={"email": "new-owner@studio.com", "name": "Owner Studio", "role": "Director"},
            content_type="application/json",
        )
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(changed.json()["name"], "Owner Studio")
        self.assertEqual(changed.json()["role"], "Director")
        user.refresh_from_db()
        self.assertEqual(user.email, "new-owner@studio.com")
        self.assertEqual(user.first_name, "Owner")
        self.assertEqual(user.last_name, "Studio")
