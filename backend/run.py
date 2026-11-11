import sys
import types

# Windows WDAC / Application Control policy fallback for _multiprocessing
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
    print("Starting SmartHire AI Backend on http://127.0.0.1:8000 ...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
