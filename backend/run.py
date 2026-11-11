import sys
import types
import os

# WDAC / Windows Application Control fallback
if "_multiprocessing" not in sys.modules:
    try:
        import _multiprocessing  # noqa: F401
    except ImportError:
        _shim = types.ModuleType("_multiprocessing")
        _shim.closesocket = lambda s: None
        _shim.send = lambda h, b: len(b)
        _shim.recv = lambda h, s: b""
        sys.modules["_multiprocessing"] = _shim

import uvicorn

if __name__ == "__main__":
    print("=" * 60, flush=True)
    print("  🚀 SmartHire AI Backend Server", flush=True)
    print("  API Base URL:     http://127.0.0.1:8000", flush=True)
    print("  Interactive Docs: http://127.0.0.1:8000/docs", flush=True)
    print("=" * 60, flush=True)
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
