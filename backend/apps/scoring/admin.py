from django.contrib import admin

from .models import Feedback, Score

admin.site.register(Score)
admin.site.register(Feedback)