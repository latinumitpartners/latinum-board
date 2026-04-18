from __future__ import annotations

from typing import Any, Type

from crm_interface import CRMInterface


class CRMManager:
    """Factory and registry for CRM handlers."""

    def __init__(self) -> None:
        self._handlers: dict[str, Type[CRMInterface]] = {}

    def register_handler(self, crm_type: str, handler_cls: Type[CRMInterface]) -> None:
        key = crm_type.strip().lower()
        if not key:
            raise ValueError("crm_type is required")
        self._handlers[key] = handler_cls

    def get_handler(self, crm_type: str, credentials: dict[str, Any]) -> CRMInterface:
        key = crm_type.strip().lower()
        if key not in self._handlers:
            raise ValueError(f"Unknown CRM: {crm_type}")

        handler = self._handlers[key]()
        if not handler.authenticate(credentials):
            raise ValueError(f"Failed to authenticate with {crm_type}")
        return handler

    def list_supported_crms(self) -> list[str]:
        return sorted(self._handlers.keys())

    def validate_credentials(self, crm_type: str, credentials: dict[str, Any]) -> tuple[bool, str]:
        try:
            self.get_handler(crm_type, credentials)
            return True, "validated"
        except Exception as exc:
            return False, str(exc)
