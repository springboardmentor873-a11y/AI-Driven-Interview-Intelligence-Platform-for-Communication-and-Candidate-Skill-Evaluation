from django.contrib import admin

from .models import Answer, Assessment, InterviewQuestion, InterviewSession, InterviewTemplate

for m in (InterviewTemplate, InterviewSession, InterviewQuestion, Answer, Assessment):
    admin.site.register(m)