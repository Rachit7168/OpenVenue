import re

from django.contrib.auth import authenticate, get_user_model, login, logout, password_validation
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

User = get_user_model()
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USERNAME_MAX = 150


class AuthThrottle(AnonRateThrottle):
    scope = "auth"


def profile_payload(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.get_full_name() or user.first_name or user.username,
        "role": user.role or "Venue Designer",
        "organization": user.organization or "",
        "createdAt": user.date_joined.isoformat(),
    }


def unique_username(email: str) -> str:
    base = email.strip().lower()[:USERNAME_MAX]
    candidate = base
    suffix = 0
    while User.objects.filter(username=candidate).exists():
        suffix += 1
        tag = f"#{suffix}"
        candidate = f"{base[: USERNAME_MAX - len(tag)]}{tag}"
    return candidate


def split_display_name(name: str) -> tuple[str, str]:
    parts = name.strip().split(None, 1)
    first = (parts[0] if parts else "")[:150]
    last = (parts[1] if len(parts) > 1 else "")[:150]
    return first, last


class CsrfView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @method_decorator(ensure_csrf_cookie)
    def get(self, request: Request) -> Response:
        return Response({"detail": "ok"})


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthThrottle]

    def post(self, request: Request) -> Response:
        email = str(request.data.get("email", "")).strip().lower()
        password = str(request.data.get("password", ""))
        name = str(request.data.get("name", "")).strip()
        role = str(request.data.get("role", "")).strip() or "Venue Designer"
        organization = str(request.data.get("organization", "")).strip()
        if not name:
            return Response({"detail": "name is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not EMAIL_RE.match(email):
            return Response({"detail": "Enter a valid email address."}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            password_validation.validate_password(password)
        except ValidationError as error:
            return Response({"detail": " ".join(error.messages)}, status=status.HTTP_400_BAD_REQUEST)
        first_name, last_name = split_display_name(name)
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=unique_username(email),
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    role=role[:120],
                    organization=organization[:200],
                )
        except IntegrityError:
            return Response(
                {"detail": "Unable to create an account with those details."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        login(request, user)
        return Response(profile_payload(user), status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthThrottle]

    def post(self, request: Request) -> Response:
        email = str(request.data.get("email", "")).strip().lower()
        password = str(request.data.get("password", ""))
        if not EMAIL_RE.match(email) or not password:
            return Response({"detail": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)
        account = User.objects.filter(email__iexact=email).order_by("date_joined").first()
        if account is None:
            return Response({"detail": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)
        user = authenticate(request, username=account.username, password=password)
        if user is None:
            return Response({"detail": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)
        login(request, user)
        return Response(profile_payload(user))


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(profile_payload(request.user))

    def patch(self, request: Request) -> Response:
        user = request.user
        updates: list[str] = []
        name = request.data.get("name")
        if isinstance(name, str) and name.strip():
            first_name, last_name = split_display_name(name)
            user.first_name = first_name
            user.last_name = last_name
            updates.extend(["first_name", "last_name"])
        email = request.data.get("email")
        if isinstance(email, str):
            normalized = email.strip().lower()
            if not EMAIL_RE.match(normalized):
                return Response({"detail": "Enter a valid email address."}, status=status.HTTP_400_BAD_REQUEST)
            if User.objects.exclude(pk=user.pk).filter(email__iexact=normalized).exists():
                return Response({"detail": "That email is already in use."}, status=status.HTTP_409_CONFLICT)
            user.email = normalized
            updates.append("email")
        role = request.data.get("role")
        if isinstance(role, str):
            user.role = role.strip()[:120] or "Venue Designer"
            updates.append("role")
        organization = request.data.get("organization")
        if isinstance(organization, str):
            user.organization = organization.strip()[:200]
            updates.append("organization")
        if updates:
            try:
                user.save(update_fields=[*updates])
            except IntegrityError:
                return Response({"detail": "That email is already in use."}, status=status.HTTP_409_CONFLICT)
        return Response(profile_payload(user))
