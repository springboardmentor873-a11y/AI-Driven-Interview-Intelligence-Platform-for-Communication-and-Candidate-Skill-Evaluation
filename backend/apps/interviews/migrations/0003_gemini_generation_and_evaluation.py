from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("interviews", "0002_interview_resume_interview_target_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="interview",
            name="generation_source",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
        migrations.AddField(
            model_name="question",
            name="topic",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="question",
            name="difficulty",
            field=models.CharField(
                choices=[
                    ("EASY", "Easy"),
                    ("MEDIUM", "Medium"),
                    ("HARD", "Hard"),
                ],
                default="MEDIUM",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="question",
            name="question_type",
            field=models.CharField(
                choices=[
                    ("TECHNICAL", "Technical"),
                    ("PRACTICAL", "Practical"),
                ],
                default="TECHNICAL",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="question",
            name="expected_criteria",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="answer",
            name="evaluation",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="answer",
            name="evaluation_source",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
    ]
