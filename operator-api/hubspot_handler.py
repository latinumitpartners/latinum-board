from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

from crm_interface import CRMInterface


class HubSpotHandler(CRMInterface):
    """Phase 1 HubSpot handler using the CRM v3 API."""

    base_url = "https://api.hubapi.com"

    def __init__(self) -> None:
        self.api_key: str | None = None

    def authenticate(self, credentials: dict[str, Any]) -> bool:
        token = credentials.get("private_app_token") or credentials.get("api_key")
        if not token:
            return False
        self.api_key = str(token).strip()
        return self._request("GET", "/crm/v3/objects/contacts?limit=1") is not None

    def add_contact(self, data: dict[str, Any]) -> dict[str, Any]:
        firstname, lastname = self._split_name(data.get("name", ""))
        payload = {
            "properties": {
                "firstname": firstname,
                "lastname": lastname,
                "email": data.get("email", ""),
                "phone": data.get("phone", ""),
                "company": data.get("company", ""),
                "notes_last_contacted": data.get("notes", ""),
            }
        }
        response = self._request("POST", "/crm/v3/objects/contacts", payload)
        if not response:
            return {"success": False, "message": "HubSpot add_contact failed"}
        return {
            "success": True,
            "id": response.get("id"),
            "message": "Contact created in HubSpot",
        }

    def update_contact(self, contact_id: str, data: dict[str, Any]) -> dict[str, Any]:
        firstname, lastname = self._split_name(data.get("name", ""))
        payload = {
            "properties": {
                "firstname": firstname,
                "lastname": lastname,
                "email": data.get("email", ""),
                "phone": data.get("phone", ""),
                "company": data.get("company", ""),
            }
        }
        response = self._request("PATCH", f"/crm/v3/objects/contacts/{contact_id}", payload)
        if not response:
            return {"success": False, "message": "HubSpot update_contact failed", "contact_id": contact_id}
        return {"success": True, "id": response.get("id", contact_id), "message": "Contact updated in HubSpot"}

    def get_contact(self, contact_id: str) -> dict[str, Any]:
        response = self._request("GET", f"/crm/v3/objects/contacts/{contact_id}")
        if not response:
            return {"success": False, "message": "HubSpot get_contact failed", "contact_id": contact_id}
        return {"success": True, "contact": response}

    def list_contacts(self, limit: int = 10) -> list[dict[str, Any]]:
        response = self._request("GET", f"/crm/v3/objects/contacts?limit={limit}")
        if not response:
            return []
        return response.get("results", [])

    def create_deal(self, data: dict[str, Any]) -> dict[str, Any]:
        payload = {
            "properties": {
                "dealname": data.get("title", "Untitled Deal"),
                "amount": str(data.get("amount", "")),
                "dealstage": data.get("stage", "appointmentscheduled"),
                "closedate": data.get("close_date", ""),
            }
        }
        response = self._request("POST", "/crm/v3/objects/deals", payload)
        if not response:
            return {"success": False, "message": "HubSpot create_deal failed"}
        return {
            "success": True,
            "id": response.get("id"),
            "message": "Deal created in HubSpot",
        }

    def update_deal(self, deal_id: str, data: dict[str, Any]) -> dict[str, Any]:
        payload = {
            "properties": {
                "dealname": data.get("title", ""),
                "amount": str(data.get("amount", "")),
                "dealstage": data.get("stage", ""),
                "closedate": data.get("close_date", ""),
            }
        }
        response = self._request("PATCH", f"/crm/v3/objects/deals/{deal_id}", payload)
        if not response:
            return {"success": False, "message": "HubSpot update_deal failed", "deal_id": deal_id}
        return {"success": True, "id": response.get("id", deal_id), "message": "Deal updated in HubSpot"}

    def log_activity(self, data: dict[str, Any]) -> dict[str, Any]:
        payload = {
            "properties": {
                "hs_timestamp": data.get("timestamp", ""),
                "hs_note_body": data.get("description", ""),
            }
        }
        response = self._request("POST", "/crm/v3/objects/notes", payload)
        if not response:
            return {"success": False, "message": "HubSpot log_activity failed"}
        return {"success": True, "id": response.get("id"), "message": "Activity logged in HubSpot"}

    def get_crm_type(self) -> str:
        return "hubspot"

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any] | None:
        if not self.api_key:
            return None
        body = None if payload is None else json.dumps(payload).encode()
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            data=body,
            method=method,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            return None

    @staticmethod
    def _split_name(name: str) -> tuple[str, str]:
        parts = str(name).strip().split()
        if not parts:
            return "", ""
        if len(parts) == 1:
            return parts[0], ""
        return parts[0], " ".join(parts[1:])
