import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Project user. UUID primary key from the first migration so it never changes later."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=120, blank=True, default="Venue Designer")
    organization = models.CharField(max_length=200, blank=True, default="")
