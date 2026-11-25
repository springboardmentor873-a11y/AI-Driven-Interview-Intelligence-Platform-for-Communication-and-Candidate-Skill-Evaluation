from rest_framework import serializers

from .models import Resume
from .services import process_resume

MAX_SIZE = 5 * 1024 * 1024   # 5 MB


class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = ('id', 'file', 'original_name', 'status', 'parsed_data', 'created_at')
        read_only_fields = ('id', 'original_name', 'status', 'parsed_data', 'created_at')
        extra_kwargs = {'file': {'write_only': True}}

    def validate_file(self, f):
        if not f.name.lower().endswith('.pdf'):
            raise serializers.ValidationError('Only PDF files are allowed.')
        if f.size > MAX_SIZE:
            raise serializers.ValidationError('File is larger than 5 MB.')
        header = f.read(5)
        f.seek(0)
        if header != b'%PDF-':
            raise serializers.ValidationError('This file is not a real PDF.')
        return f

    def create(self, validated_data):
        resume = super().create(validated_data)
        process_resume(resume)   # reads the PDF and fills status + parsed_data
        return resume
