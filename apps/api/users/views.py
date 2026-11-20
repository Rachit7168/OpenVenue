import re

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

User = get_user_model()
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def profile_payload(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.get_full_name() or user.first_name or user.username,
        "role": "Venue Designer",
        "organization": "",
        "createdAt": user.date_joined.isoformat(),
    }


def unique_username(email: str) -> str:
    base = email.strip().lower()
    candidate = base
    suffix = 0
    while User.objects.filter(username=candidate).exists():
        suffix += 1
        candidate = f"{base}#{suffix}"
    return candidate


class CsrfView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request: Request) -> Response:
        return Response({"detail": "ok"})


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        email = str(request.data.get("email", "")).strip().lower()
        password = str(request.data.get("password", ""))
        name = str(request.data.get("name", "")).strip()
        if not name:
            return Response({"detail": "name is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not EMAIL_RE.match(email):
            return Response({"detail": "Enter a valid email address."}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "An account with this email already exists."}, status=status.HTTP_409_CONFLICT)
        user = User.objects.create_user(
            username=unique_username(email),
            email=email,
            password=password,
            first_name=name[:150],
        )
        login(request, user)
        return Response(profile_payload(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        email = str(request.data.get("email", "")).strip().lower()
        password = str(request.data.get("password", ""))
        if not EMAIL_RE.match(email) or not password:
            return Response({"detail": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            account = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
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
        name = request.data.get("name")
        if isinstance(name, str) and name.strip():
            user.first_name = name.strip()[:150]
        email = request.data.get("email")
        if isinstance(email, str):
            normalized = email.strip().lower()
            if not EMAIL_RE.match(normalized):
                return Response({"detail": "Enter a valid email address."}, status=status.HTTP_400_BAD_REQUEST)
            if User.objects.exclude(pk=user.pk).filter(email__iexact=normalized).exists():
                return Response({"detail": "That email is already in use."}, status=status.HTTP_409_CONFLICT)
            user.email = normalized
        user.save()
        return Response(profile_payload(user))