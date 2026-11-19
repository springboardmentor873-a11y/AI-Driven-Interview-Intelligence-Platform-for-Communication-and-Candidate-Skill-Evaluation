import asyncio
import json
import sys
from pathlib import Path

import httpx
from fastapi import HTTPException

MAX_BYTES = 5 * 1024 * 1024


async def fetch_resume(client: httpx.AsyncClient, base_url: str, key: str, token: str, user_id: str) -> bytes:
    # The path comes exclusively from the server-verified user ID. Storage RLS
    # still applies because we forward the caller's token, not a service key.
    url = f'{base_url.rstrip("/")}/storage/v1/object/authenticated/resumes/{user_id}/resume.pdf'
    try:
        async with client.stream('GET', url, headers={'apikey': key, 'Authorization': f'Bearer {token}'}) as response:
            if response.status_code != 200:
                if response.status_code in (400, 403, 404):
                    raise HTTPException(404, 'No accessible resume found. Upload a resume as a candidate first.')
                raise HTTPException(503, 'Resume storage is temporarily unavailable.')
            data = bytearray()
            async for chunk in response.aiter_bytes():
                data.extend(chunk)
                if len(data) > MAX_BYTES:
                    raise HTTPException(413, 'Resume must be 5 MB or smaller.')
            return bytes(data)
    except httpx.RequestError as exc:
        raise HTTPException(503, 'Resume storage is temporarily unavailable.') from exc


async def analyze_pdf(data: bytes) -> dict:
    # Run parsing out of the API process so a stuck parser can be terminated.
    process = await asyncio.create_subprocess_exec(
        sys.executable, '-m', 'app.resume_parser',
        cwd=str(Path(__file__).resolve().parent.parent),
        stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )
    try:
        output, _ = await asyncio.wait_for(process.communicate(data), timeout=20)
    except (TimeoutError, asyncio.CancelledError):
        if process.returncode is None:
            process.kill()
        await process.wait()
        raise HTTPException(422, 'Resume processing timed out. Try a simpler PDF.')
    if process.returncode != 0:
        raise HTTPException(503, 'Resume extraction is unavailable. Check the backend dependencies.')
    try:
        result = json.loads(output)
    except (ValueError, UnicodeError) as exc:
        raise HTTPException(503, 'Resume extraction returned an invalid result.') from exc
    if 'error' in result:
        raise HTTPException(422, result['error'])
    return result
