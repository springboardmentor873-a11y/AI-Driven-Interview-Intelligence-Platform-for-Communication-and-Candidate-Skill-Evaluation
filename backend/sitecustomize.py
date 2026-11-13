"""Automatic early-startup patch for Windows WDAC environment."""
import sys
import types

if "_multiprocessing" not in sys.modules:
    try:
        import _multiprocessing
    except ImportError:
        _shim = types.ModuleType("_multiprocessing")
        _shim.closesocket = lambda s: None
        _shim.send = lambda h, b: len(b)
        _shim.recv = lambda h, s: b""
        sys.modules["_multiprocessing"] = _shim

