from __future__ import annotations

from typing import Any
from urllib.parse import parse_qs

from client_registry_store import create_client, get_client, list_clients, update_client, update_client_status

CLIENT_REGISTRY_GET_PATHS = {
    '/api/clients',
    '/api/client',
}

CLIENT_REGISTRY_POST_PATHS = {
    '/api/clients',
    '/api/clients/update',
    '/api/clients/status',
}


def handle_client_registry_get(path: str, query: str) -> tuple[dict[str, Any], int] | None:
    if path not in CLIENT_REGISTRY_GET_PATHS:
        return None

    if path == '/api/clients':
        return {'success': True, 'clients': list_clients()}, 200

    params = parse_qs(query)
    client_id = (params.get('client_id') or [''])[0].strip()
    if not client_id:
        return {'success': False, 'message': 'client_id is required'}, 400
    record = get_client(client_id)
    if not record:
        return {'success': False, 'message': 'Client not found'}, 404
    return {'success': True, 'client': record}, 200


def handle_client_registry_post(path: str, payload: dict[str, Any]) -> tuple[dict[str, Any], int] | None:
    if path not in CLIENT_REGISTRY_POST_PATHS:
        return None

    try:
        if path == '/api/clients':
            record = create_client(payload)
            return {'success': True, 'client': record}, 201

        if path == '/api/clients/update':
            record = update_client(payload)
            if not record:
                return {'success': False, 'message': 'Client not found'}, 404
            return {'success': True, 'client': record}, 200

        client_id = str(payload.get('client_id', '')).strip()
        status = str(payload.get('status', '')).strip()
        if not client_id or not status:
            return {'success': False, 'message': 'client_id and status are required'}, 400
        record = update_client_status(client_id, status)
        if not record:
            return {'success': False, 'message': 'Client not found'}, 404
        return {'success': True, 'client': record}, 200
    except ValueError as exc:
        return {'success': False, 'message': str(exc)}, 400
