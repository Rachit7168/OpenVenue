from django.contrib import admin

from projects.models import Project, Revision

admin.site.register(Project)
admin.site.register(Revision)
