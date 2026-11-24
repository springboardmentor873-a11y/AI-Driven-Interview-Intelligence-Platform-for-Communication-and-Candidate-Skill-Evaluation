import time
import logging

logger = logging.getLogger("smarthire_ai.access")


class RequestLoggingMiddleware:
    """
    Pure ASGI Middleware that logs HTTP request execution time and status codes.
    Avoids Starlette BaseHTTPMiddleware event-loop blocking issues on Python 3.13 / Windows.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.time()
        status_code = [200]

        async def logging_send(message):
            if message["type"] == "http.response.start":
                status_code[0] = message.get("status", 200)
            await send(message)

        try:
            await self.app(scope, receive, logging_send)
        finally:
            process_time = time.time() - start_time
            logger.info(
                f"{scope.get('method', 'GET')} {scope.get('path', '/')} - Status: {status_code[0]} - Completed in {process_time:.4f}s"
            )
