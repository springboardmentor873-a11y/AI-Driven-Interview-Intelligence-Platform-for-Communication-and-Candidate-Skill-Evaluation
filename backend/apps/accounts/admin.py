from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin

from .models import Resume


@admin.register(get_user_model())
class SmartHireUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("SmartHire role", {"fields": ("role",)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("SmartHire role", {"fields": ("email", "role")}),
    )


@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "uploaded_at")
    list_filter = ("uploaded_at",)
    readonly_fields = ("uploaded_at",)
