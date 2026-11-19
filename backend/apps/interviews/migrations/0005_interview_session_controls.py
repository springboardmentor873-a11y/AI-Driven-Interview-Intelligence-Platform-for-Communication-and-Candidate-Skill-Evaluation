from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("interviews", "0004_question_relevance_and_style"),
    ]

    operations = [
        migrations.AddField(
            model_name="interview",
            name="paused_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="interview",
            name="elapsed_seconds",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="interview",
            name="recording",
            field=models.FileField(blank=True, null=True, upload_to="interviews/"),
        ),
        migrations.AlterField(
            model_name="interview",
            name="status",
            field=models.CharField(
                choices=[
                    ("CREATED", "Created"),
                    ("IN_PROGRESS", "In Progress"),
                    ("PAUSED", "Paused"),
                    ("COMPLETED", "Completed"),
                    ("ABANDONED", "Abandoned"),
                ],
                default="CREATED",
                max_length=20,
            ),
        ),
    ]
