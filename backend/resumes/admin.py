from django.contrib import admin
from .models import Resume


@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'file_name',
        'user',
        'file_size',
        'uploaded_at'
    )
    list_filter = ('uploaded_at',)
    search_fields = ('file_name', 'user__username', 'user__email')
    readonly_fields = ('uploaded_at', 'file_size', 'file_name')
