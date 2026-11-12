from django.urls import path

from projects.views import (
    ProjectDetailView,
    ProjectDocumentView,
    ProjectListView,
    PublicVenueContentView,
    PublicVenueView,
    PublicVenueZonesView,
    RevisionListView,
    RevisionRestoreView,
)

urlpatterns = [
    path("projects/", ProjectListView.as_view(), name="projects"),
    path("projects/<uuid:project_id>/", ProjectDetailView.as_view(), name="project-detail"),
    path("projects/<uuid:project_id>/document/", ProjectDocumentView.as_view(), name="project-document"),
    path("projects/<uuid:project_id>/revisions/", RevisionListView.as_view(), name="project-revisions"),
    path(
        "projects/<uuid:project_id>/revisions/<int:number>/restore/",
        RevisionRestoreView.as_view(),
        name="project-restore",
    ),
    path("public/venues/<uuid:project_id>/", PublicVenueView.as_view(), name="public-venue"),
    path("public/venues/<uuid:project_id>/zones/", PublicVenueZonesView.as_view(), name="public-venue-zones"),
    path("public/venues/<uuid:project_id>/content/", PublicVenueContentView.as_view(), name="public-venue-content"),
]
