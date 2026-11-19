import asyncio
from unittest.mock import AsyncMock
import json
import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app.interviews import InterviewSetup, generate_questions
from app.main import app, settings

SETUP = {'interview_type': 'technical', 'difficulty': 'beginner', 'target_role': 'Developer', 'skills': ['Python']}


def test_setup_bounds():
    with pytest.raises(ValidationError):
        InterviewSetup(**{**SETUP, 'difficulty': 'unknown'})
    with pytest.raises(ValidationError):
        InterviewSetup(**{**SETUP, 'skills': ['x' * 51]})


def test_structured_generation_and_no_storage():
    questions = [f'Explain concept {n}?' for n in range(5)]
    client = AsyncMock()
    client.post.return_value = httpx.Response(200, json={'status': 'completed', 'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': json.dumps({'questions': questions})}]}]})
    result = asyncio.run(generate_questions(client, 'test-key', 'test-model', InterviewSetup(**SETUP)))
    assert result['questions'] == questions
    payload = client.post.call_args.kwargs['json']
    assert payload['store'] is False
    assert payload['text']['format']['strict'] is True
    assert json.loads(payload['input']) == SETUP


@pytest.mark.parametrize('payload', [
    {'status': 'incomplete'},
    {'status': 'completed', 'output': [{'type': 'message', 'content': [{'type': 'refusal', 'refusal': 'No'}]}]},
    {'status': 'completed', 'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': '{"questions": ["one"]}'}]}]},
])
def test_incomplete_or_invalid_questions_fail(payload):
    client = AsyncMock(); client.post.return_value = httpx.Response(200, json=payload)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(generate_questions(client, 'key', 'model', InterviewSetup(**SETUP)))
    assert exc.value.status_code == 502


def test_candidate_role_and_throttle(monkeypatch):
    monkeypatch.setattr(settings, 'supabase_url', 'https://test.supabase.co')
    monkeypatch.setattr(settings, 'supabase_publishable_key', 'public')
    monkeypatch.setattr(settings, 'openai_api_key', 'test-key')
    generate = AsyncMock(return_value={'questions': ['a', 'b', 'c', 'd', 'e']})
    monkeypatch.setattr('app.main.generate_questions', generate)
    identity = httpx.Response(200, json={'id': '5aee38f0-17c2-40da-a0dd-5383c5e8cf6a'})
    with TestClient(app) as client:
        assert client.post('/api/interviews/questions', json=SETUP).status_code == 401
        app.state.http.get = AsyncMock(side_effect=[identity, httpx.Response(200, json=[{'role': 'recruiter'}])])
        assert client.post('/api/interviews/questions', json=SETUP, headers={'Authorization': 'Bearer token'}).status_code == 403
        generate.assert_not_called()
        app.state.http.get = AsyncMock(side_effect=[identity, httpx.Response(200, json=[{'role': 'candidate'}])] * 2)
        assert client.post('/api/interviews/questions', json=SETUP, headers={'Authorization': 'Bearer token'}).status_code == 200
        assert client.post('/api/interviews/questions', json=SETUP, headers={'Authorization': 'Bearer token'}).status_code == 429
        assert generate.call_count == 1
