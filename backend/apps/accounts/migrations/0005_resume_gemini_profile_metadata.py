from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_resume_extracted_experience_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="resume",
            name="extracted_projects",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="resume",
            name="extraction_source",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
    ]
