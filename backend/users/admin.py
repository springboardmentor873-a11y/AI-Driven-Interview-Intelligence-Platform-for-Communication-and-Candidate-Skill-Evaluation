from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, CandidateProfile, RecruiterProfile


class CandidateProfileInline(admin.StackedInline):
    model = CandidateProfile
    can_delete = False
    verbose_name_plural = 'Candidate Profile'
    extra = 0


class RecruiterProfileInline(admin.StackedInline):
    model = RecruiterProfile
    can_delete = False
    verbose_name_plural = 'Recruiter Profile'
    extra = 0


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = (
        'username',
        'email',
        'role',
        'is_staff',
        'is_active',
        'date_joined',
    )
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('username', 'email')

    fieldsets = UserAdmin.fieldsets + (
        ('SmartHire AI Role', {
            'fields': ('role',)
        }),
    )

    inlines = [CandidateProfileInline, RecruiterProfileInline]


@admin.register(CandidateProfile)
class CandidateProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'target_role', 'phone', 'created_at')
    search_fields = ('user__username', 'user__email', 'target_role')
    list_filter = ('created_at',)


@admin.register(RecruiterProfile)
class RecruiterProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'company_name', 'designation', 'created_at')
    search_fields = ('user__username', 'user__email', 'company_name')
    list_filter = ('created_at',)
