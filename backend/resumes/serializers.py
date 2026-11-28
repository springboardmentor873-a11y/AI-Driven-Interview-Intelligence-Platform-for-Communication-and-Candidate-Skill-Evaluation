import hashlib

from rest_framework import serializers
from rest_framework.exceptions import APIException

from .models import Resume
from .services import process_resume

MAX_SIZE = 5 * 1024 * 1024   # 5 MB


class DuplicateResumeError(APIException):
    status_code = 409
    default_detail = 'You already uploaded this file.'
    default_code = 'duplicate_resume'


def _file_sha256(f):
    digest = hashlib.sha256()
    for chunk in f.chunks():
        digest.update(chunk)
    f.seek(0)
    return digest.hexdigest()


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

    def validate(self, data):
        # One hash of the whole file, reused both to reject a repeat upload and
        # to store on the row so the next upload can be checked the same way.
        file_hash = _file_sha256(data['file'])
        request = self.context.get('request')
        owner = request.user if request else None
        if owner and Resume.objects.filter(owner=owner, file_hash=file_hash).exists():
            raise DuplicateResumeError()
        data['file_hash'] = file_hash
        return data

    def create(self, validated_data):
        resume = super().create(validated_data)
        process_resume(resume)   # reads the PDF and fills status + parsed_data
        return resume
