from django.contrib import admin
from .models import InterviewSession, InterviewQuestion


class InterviewQuestionInline(admin.TabularInline):
    model = InterviewQuestion
    extra = 0
    fields = ('order', 'question_text', 'question_type', 'difficulty', 'status', 'time_taken_seconds')
    readonly_fields = ('order', 'question_text', 'question_type', 'difficulty', 'time_taken_seconds')


@admin.register(InterviewSession)
class InterviewSessionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'candidate',
        'target_role',
        'interview_type',
        'difficulty',
        'status',
        'total_questions',
        'created_at'
    )
    list_filter = ('interview_type', 'difficulty', 'status', 'created_at')
    search_fields = ('candidate__username', 'candidate__email', 'target_role')
    inlines = [InterviewQuestionInline]


@admin.register(InterviewQuestion)
class InterviewQuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'order', 'question_type', 'difficulty', 'status', 'time_taken_seconds')
    list_filter = ('question_type', 'difficulty', 'status')
    search_fields = ('question_text', 'session__candidate__username')
