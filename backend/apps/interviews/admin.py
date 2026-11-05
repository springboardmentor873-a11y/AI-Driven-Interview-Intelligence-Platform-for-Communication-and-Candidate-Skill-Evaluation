from django.contrib import admin

from .models import Answer, InterviewSession, InterviewTemplate, Question

admin.site.register(InterviewTemplate)
admin.site.register(InterviewSession)
admin.site.register(Question)
admin.site.register(Answer)