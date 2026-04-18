from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class CRMInterface(ABC):
    """Abstract CRM handler contract for all supported CRM integrations."""

    @abstractmethod
    def authenticate(self, credentials: dict[str, Any]) -> bool:
        """Verify credentials and prepare the handler for use."""
        raise NotImplementedError

    @abstractmethod
    def add_contact(self, data: dict[str, Any]) -> dict[str, Any]:
        """Create a new contact in the CRM."""
        raise NotImplementedError

    @abstractmethod
    def update_contact(self, contact_id: str, data: dict[str, Any]) -> dict[str, Any]:
        """Update an existing contact."""
        raise NotImplementedError

    @abstractmethod
    def get_contact(self, contact_id: str) -> dict[str, Any]:
        """Fetch a contact by external CRM ID."""
        raise NotImplementedError

    @abstractmethod
    def list_contacts(self, limit: int = 10) -> list[dict[str, Any]]:
        """List recent contacts from the CRM."""
        raise NotImplementedError

    @abstractmethod
    def create_deal(self, data: dict[str, Any]) -> dict[str, Any]:
        """Create a new deal or opportunity."""
        raise NotImplementedError

    @abstractmethod
    def update_deal(self, deal_id: str, data: dict[str, Any]) -> dict[str, Any]:
        """Update an existing deal."""
        raise NotImplementedError

    @abstractmethod
    def log_activity(self, data: dict[str, Any]) -> dict[str, Any]:
        """Log a CRM activity such as a call, meeting, or email."""
        raise NotImplementedError

    @abstractmethod
    def get_crm_type(self) -> str:
        """Return the canonical CRM type identifier for this handler."""
        raise NotImplementedError
