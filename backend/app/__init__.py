"""SmartHire AI Backend Application Package"""
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

__version__ = "1.0.0"
