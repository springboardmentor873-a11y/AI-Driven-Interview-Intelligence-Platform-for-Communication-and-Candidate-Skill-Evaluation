from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'role', 'is_active')
    list_filter = ('role', 'is_active')
    ordering = ('email',)
    fieldsets = UserAdmin.fieldsets + (('SmartHire', {'fields': ('role',)}),)
    add_fieldsets = UserAdmin.add_fieldsets + (('SmartHire', {'fields': ('email', 'role')}),)