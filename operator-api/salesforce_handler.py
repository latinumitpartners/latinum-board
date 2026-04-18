from __future__ import annotations

from typing import Any

from crm_interface import CRMInterface


class SalesforceHandler(CRMInterface):
    """Stub Salesforce CRM handler for Phase 1 foundation work."""

    def authenticate(self, credentials: dict[str, Any]) -> bool:
        return bool(credentials.get("instance_url") and credentials.get("client_id") and credentials.get("client_secret"))

    def add_contact(self, data: dict[str, Any]) -> dict[str, Any]:
        return {"success": False, "message": "Salesforce add_contact not implemented yet"}

    def update_contact(self, contact_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return {"success": False, "message": "Salesforce update_contact not implemented yet", "contact_id": contact_id}

    def get_contact(self, contact_id: str) -> dict[str, Any]:
        return {"success": False, "message": "Salesforce get_contact not implemented yet", "contact_id": contact_id}

    def list_contacts(self, limit: int = 10) -> list[dict[str, Any]]:
        return []

    def create_deal(self, data: dict[str, Any]) -> dict[str, Any]:
        return {"success": False, "message": "Salesforce create_deal not implemented yet"}

    def update_deal(self, deal_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return {"success": False, "message": "Salesforce update_deal not implemented yet", "deal_id": deal_id}

    def log_activity(self, data: dict[str, Any]) -> dict[str, Any]:
        return {"success": False, "message": "Salesforce log_activity not implemented yet"}

    def get_crm_type(self) -> str:
        return "salesforce"
