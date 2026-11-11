"""Pydantic custom types for SmartHire AI."""
from typing import Annotated
from pydantic import GetCoreSchemaHandler
from pydantic_core import core_schema
import email_validator as _ev


class _LocalEmailStr(str):
    """
    EmailStr equivalent that skips DNS deliverability checks.
    Works offline and in sandboxed / test environments.
    """

    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type, handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.no_info_plain_validator_function(
            cls._validate,
            serialization=core_schema.to_string_ser_schema(),
        )

    @classmethod
    def _validate(cls, value: object) -> "_LocalEmailStr":
        if not isinstance(value, str):
            raise ValueError(f"string required, got {type(value).__name__}")
        try:
            info = _ev.validate_email(value, check_deliverability=False)
            return cls(info.normalized)
        except _ev.EmailNotValidError as exc:
            raise ValueError(str(exc)) from exc


# Public alias – import this everywhere instead of pydantic.EmailStr
LocalEmailStr = _LocalEmailStr

