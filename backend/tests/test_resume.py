import asyncio
import io
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject

from app.main import app, settings
from app.resume_parser import extract_skills, parse_resume
from app.resume_service import fetch_resume, analyze_pdf

USER = '5aee38f0-17c2-40da-a0dd-5383c5e8cf6a'


def pdf(text='Experience developing Python and React applications with PostgreSQL.'):
    writer = PdfWriter()
    page = writer.add_blank_page(width=600, height=800)
    font = DictionaryObject({NameObject('/Type'): NameObject('/Font'), NameObject('/Subtype'): NameObject('/Type1'), NameObject('/BaseFont'): NameObject('/Helvetica')})
    page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): DictionaryObject({NameObject('/F1'): writer._add_object(font)})})
    content = DecodedStreamObject()
    content.set_data(f'BT /F1 12 Tf 40 700 Td ({text}) Tj ET'.encode())
    page[NameObject('/Contents')] = writer._add_object(content)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def test_matching_uses_boundaries_and_aliases():
    assert extract_skills('JavaScript React.js C++ C# GitHub') == ['JavaScript', 'C++', 'C#', 'React']
    assert 'Java' not in extract_skills('JavaScript')


def test_pdf_extraction_and_invalid_documents():
    assert parse_resume(pdf())['skills'] == ['Python', 'React', 'PostgreSQL']
    with pytest.raises(ValueError, match='valid PDF'):
        parse_resume(b'not a pdf')
    with pytest.raises(ValueError, match='No readable text'):
        parse_resume(pdf(''))
    writer = PdfWriter(); writer.add_blank_page(width=600, height=800); writer.encrypt('secret')
    buffer = io.BytesIO(); writer.write(buffer)
    with pytest.raises(ValueError, match='unprotected'):
        parse_resume(buffer.getvalue())


def test_worker_extracts_real_pdf():
    assert asyncio.run(analyze_pdf(pdf()))['skills'] == ['Python', 'React', 'PostgreSQL']


def test_storage_uses_callers_token_and_fixed_path():
    async def run():
        def handler(request):
            assert request.url.path == f'/storage/v1/object/authenticated/resumes/{USER}/resume.pdf'
            assert request.headers['Authorization'] == 'Bearer caller-token'
            return httpx.Response(200, content=pdf())
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            assert (await fetch_resume(client, 'https://test.supabase.co', 'public-key', 'caller-token', USER)).startswith(b'%PDF-')
    asyncio.run(run())


def test_denied_storage_is_not_parsed():
    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda request: httpx.Response(403))) as client:
            with pytest.raises(HTTPException) as exc:
                await fetch_resume(client, 'https://test.supabase.co', 'key', 'token', USER)
            assert exc.value.status_code == 404
    asyncio.run(run())


def test_endpoint_requires_auth_and_uses_verified_identity(monkeypatch):
    monkeypatch.setattr(settings, 'supabase_url', 'https://test.supabase.co')
    monkeypatch.setattr(settings, 'supabase_publishable_key', 'key')
    fetch = AsyncMock(return_value=pdf())
    monkeypatch.setattr('app.main.fetch_resume', fetch)
    monkeypatch.setattr('app.main.analyze_pdf', AsyncMock(return_value={'skills': ['Python']}))
    with TestClient(app) as client:
        assert client.post('/api/resume/analyze').status_code == 401
        app.state.http.get = AsyncMock(return_value=httpx.Response(200, json={'id': USER}))
        response = client.post('/api/resume/analyze', headers={'Authorization': 'Bearer caller-token'}, json={'user_id': 'other-user'})
        assert response.status_code == 200
        assert fetch.call_args.args[-1] == USER
