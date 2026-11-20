from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from users.models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("email", "username", "first_name", "role", "is_staff", "is_active", "date_joined")
    list_filter = ("is_staff", "is_superuser", "is_active")
    search_fields = ("email", "username", "first_name", "last_name", "organization")
    ordering = ("-date_joined",)
    fieldsets = (
        *DjangoUserAdmin.fieldsets,
        ("Profile", {"fields": ("role", "organization")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "email", "first_name", "role", "organization", "password1", "password2"),
            },
        ),
    )
