from django.apps import AppConfig


class InterviewsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.interviews'

    def ready(self):
        from . import signals  # noqa: F401  (connects the signal handlers)
