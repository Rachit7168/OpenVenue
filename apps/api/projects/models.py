import uuid

from django.conf import settings
from django.db import models


class Project(models.Model):
    """A saved venue. Private until the owner marks it public."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name


class Revision(models.Model):
    """One stored copy of the venue document."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="revisions")
    number = models.PositiveIntegerField()
    document = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["project", "number"], name="unique_project_revision")
        ]
        ordering = ["number"]
