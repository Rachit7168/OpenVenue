import json
from pathlib import Path

from django.db import IntegrityError, transaction
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from projects.models import Project, Revision
from projects.validate import validate_venue_document

CONTENT_ROOT = Path(__file__).resolve().parents[2] / "viewer" / "public"


def etag_for(project: Project, number: int) -> str:
    stamp = int(project.updated_at.timestamp()) if project.updated_at else 0
    visibility = "public" if project.is_public else "private"
    return f'"rev-{number}-{visibility}-{stamp}"'


def current_revision(project: Project) -> Revision:
    revision = project.revisions.order_by("-number").first()
    if revision is None:
        raise Http404("This project has no document.")
    return revision


def owned(request: Request, project_id: str) -> Project:
    return get_object_or_404(Project, id=project_id, owner=request.user)


def content_refs(document: dict) -> set[str]:
    refs: set[str] = set()
    venue = document.get("venue")
    if not isinstance(venue, dict):
        return refs
    for floor in venue.get("floors", []):
        if not isinstance(floor, dict):
            continue
        for zone in floor.get("zones", []):
            if not isinstance(zone, dict):
                continue
            interaction = zone.get("interaction")
            if isinstance(interaction, dict):
                ref = interaction.get("contentRef")
                if isinstance(ref, str) and ref.strip():
                    refs.add(ref.strip())
    return refs


def safe_content_path(ref: str) -> Path | None:
    normalized = ref.strip().lstrip("/")
    if not normalized or ".." in normalized.split("/"):
        return None
    root = CONTENT_ROOT.resolve()
    target = (root / normalized).resolve()
    if root not in target.parents and target != root:
        return None
    return target


def save_revision(project: Project, document: dict, expected: int | None) -> Revision:
    with transaction.atomic():
        locked = Project.objects.select_for_update().get(pk=project.pk)
        latest = locked.revisions.order_by("-number").first()
        current = latest.number if latest else 0
        if expected is not None and current != expected:
            raise ValueError("stale")
        number = current + 1
        try:
            saved = Revision.objects.create(project=locked, number=number, document=document)
        except IntegrityError as error:
            raise ValueError("conflict") from error
        locked.save(update_fields=["updated_at"])
        return saved


class PublicVenueThrottle(AnonRateThrottle):
    scope = "public-venue"


class ProjectListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        projects = Project.objects.filter(owner=request.user).order_by("-updated_at")
        return Response(
            [
                {"id": str(project.id), "name": project.name, "is_public": project.is_public}
                for project in projects
            ]
        )

    def post(self, request: Request) -> Response:
        name = request.data.get("name")
        document = request.data.get("document")
        if not isinstance(name, str) or not name.strip() or not isinstance(document, dict):
            return Response({"detail": "name and document are required."}, status=400)
        issues = validate_venue_document(document)
        if issues:
            return Response({"detail": "Document failed validation.", "issues": issues[:20]}, status=400)
        with transaction.atomic():
            project = Project.objects.create(
                name=name.strip()[:200],
                owner=request.user,
                is_public=False,
            )
            Revision.objects.create(project=project, number=1, document=document)
        response = Response({"id": str(project.id), "name": project.name, "revision": 1}, status=201)
        response["ETag"] = etag_for(project, 1)
        return response


class ProjectDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request: Request, project_id: str) -> Response:
        project = owned(request, project_id)
        is_public = request.data.get("is_public")
        if not isinstance(is_public, bool):
            return Response({"detail": "is_public must be a boolean."}, status=400)
        project.is_public = is_public
        project.save(update_fields=["is_public", "updated_at"])
        return Response({"id": str(project.id), "is_public": project.is_public})


class ProjectDocumentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, project_id: str) -> Response:
        project = owned(request, project_id)
        revision = current_revision(project)
        response = Response(revision.document)
        response["ETag"] = etag_for(project, revision.number)
        return response

    def put(self, request: Request, project_id: str) -> Response:
        project = owned(request, project_id)
        revision = current_revision(project)
        match = request.headers.get("If-Match")
        if match is None:
            return Response({"detail": "If-Match is required."}, status=428)
        if match != etag_for(project, revision.number):
            return Response(
                {"detail": "The document changed since you loaded it.", "revision": revision.number},
                status=409,
            )
        document = request.data
        if not isinstance(document, dict):
            return Response({"detail": "Document must be a JSON object."}, status=400)
        issues = validate_venue_document(document)
        if issues:
            return Response({"detail": "Document failed validation.", "issues": issues[:20]}, status=400)
        try:
            saved = save_revision(project, document, revision.number)
        except ValueError as error:
            if str(error) == "conflict":
                return Response({"detail": "Another save landed first."}, status=409)
            return Response(
                {"detail": "The document changed since you loaded it.", "revision": revision.number},
                status=409,
            )
        project.refresh_from_db(fields=["updated_at"])
        response = Response({"revision": saved.number})
        response["ETag"] = etag_for(project, saved.number)
        return response


class RevisionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, project_id: str) -> Response:
        project = owned(request, project_id)
        return Response(
            [
                {"number": revision.number, "created_at": revision.created_at.isoformat()}
                for revision in project.revisions.all()
            ]
        )


class RevisionRestoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, project_id: str, number: int) -> Response:
        project = owned(request, project_id)
        source = get_object_or_404(project.revisions, number=number)
        latest = current_revision(project)
        try:
            restored = save_revision(project, source.document, latest.number)
        except ValueError:
            return Response({"detail": "Another save landed first."}, status=409)
        project.refresh_from_db(fields=["updated_at"])
        response = Response({"revision": restored.number})
        response["ETag"] = etag_for(project, restored.number)
        return response


class PublicVenueView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicVenueThrottle]

    def get(self, request: Request, project_id: str) -> Response:
        project = get_object_or_404(Project, id=project_id, is_public=True)
        revision = current_revision(project)
        response = Response(revision.document)
        response["Cache-Control"] = "private, max-age=60, must-revalidate"
        response["ETag"] = etag_for(project, revision.number)
        return response


class PublicVenueZonesView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicVenueThrottle]

    def get(self, request: Request, project_id: str) -> Response:
        project = get_object_or_404(Project, id=project_id, is_public=True)
        revision = current_revision(project)
        venue = revision.document.get("venue", {})
        zones = []
        for floor in venue.get("floors", []):
            if not isinstance(floor, dict):
                continue
            floor_id = floor.get("id")
            for zone in floor.get("zones", []):
                if not isinstance(zone, dict):
                    continue
                interaction = zone.get("interaction") if isinstance(zone.get("interaction"), dict) else {}
                zones.append(
                    {
                        "id": zone.get("id"),
                        "name": zone.get("name"),
                        "floorId": floor_id,
                        "contentRef": interaction.get("contentRef"),
                    }
                )
        response = Response(zones)
        response["Cache-Control"] = "private, max-age=60, must-revalidate"
        return response


class PublicVenueContentView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicVenueThrottle]

    def get(self, request: Request, project_id: str) -> Response:
        ref = request.query_params.get("ref", "").strip()
        if not ref:
            return Response({"detail": "ref is required."}, status=400)
        project = get_object_or_404(Project, id=project_id, is_public=True)
        revision = current_revision(project)
        if ref not in content_refs(revision.document):
            return Response({"detail": "That content is not part of this venue."}, status=404)
        path = safe_content_path(ref)
        if path is None or not path.is_file():
            return Response({"detail": "Content file is unavailable."}, status=404)
        response = FileResponse(path.open("rb"), content_type="application/json")
        response["Cache-Control"] = "private, max-age=60, must-revalidate"
        return response
