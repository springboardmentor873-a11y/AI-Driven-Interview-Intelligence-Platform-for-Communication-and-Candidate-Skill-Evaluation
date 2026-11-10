from rest_framework import serializers

from .models import Resume

MAX_SIZE = 5 * 1024 * 1024   # 5 MB


class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = ('id', 'file', 'original_name', 'status', 'created_at')
        read_only_fields = ('id', 'original_name', 'status', 'created_at')
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