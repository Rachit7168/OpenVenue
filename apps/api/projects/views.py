from django.db import transaction
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from projects.models import Project, Revision


def etag_for(number: int) -> str:
    return f'"rev-{number}"'


def current_revision(project: Project) -> Revision:
    revision = project.revisions.order_by("-number").first()
    if revision is None:
        raise Http404("This project has no document.")
    return revision


def owned(request: Request, project_id: str) -> Project:
    return get_object_or_404(Project, id=project_id, owner=request.user)


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
        with transaction.atomic():
            project = Project.objects.create(
                name=name.strip()[:200],
                owner=request.user,
                is_public=False,
            )
            Revision.objects.create(project=project, number=1, document=document)
        response = Response({"id": str(project.id), "name": project.name, "revision": 1}, status=201)
        response["ETag"] = etag_for(1)
        return response


class ProjectDocumentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, project_id: str) -> Response:
        project = owned(request, project_id)
        revision = current_revision(project)
        response = Response(revision.document)
        response["ETag"] = etag_for(revision.number)
        return response

    def put(self, request: Request, project_id: str) -> Response:
        project = owned(request, project_id)
        revision = current_revision(project)
        match = request.headers.get("If-Match")
        if match is None:
            return Response({"detail": "If-Match is required."}, status=428)
        if match != etag_for(revision.number):
            return Response(
                {"detail": "The document changed since you loaded it.", "revision": revision.number},
                status=409,
            )
        document = request.data
        if not isinstance(document, dict):
            return Response({"detail": "Document must be a JSON object."}, status=400)
        saved = Revision.objects.create(project=project, number=revision.number + 1, document=document)
        project.save(update_fields=["updated_at"])
        response = Response({"revision": saved.number})
        response["ETag"] = etag_for(saved.number)
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
        restored = Revision.objects.create(
            project=project,
            number=latest.number + 1,
            document=source.document,
        )
        response = Response({"revision": restored.number})
        response["ETag"] = etag_for(restored.number)
        return response


class PublicVenueView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicVenueThrottle]

    def get(self, request: Request, project_id: str) -> Response:
        project = get_object_or_404(Project, id=project_id, is_public=True)
        revision = current_revision(project)
        response = Response(revision.document)
        response["Cache-Control"] = "public, max-age=60"
        response["ETag"] = etag_for(revision.number)
        return response
