from __future__ import annotations

from typing import Any
from urllib.parse import parse_qs

from webhook_store import get_webhook_config, rotate_webhook_secret, upsert_webhook_config, write_webhook_delivery_log

WEBHOOK_GET_PATHS = {
    '/api/webhooks/config',
}

WEBHOOK_POST_PATHS = {
    '/api/webhooks/config',
    '/api/webhooks/rotate',
    '/api/webhooks/delivery-log',
}


def handle_webhook_get(path: str, query: str) -> tuple[dict[str, Any], int] | None:
    if path not in WEBHOOK_GET_PATHS:
        return None

    params = parse_qs(query)
    client_id = (params.get('client_id') or [''])[0].strip()
    if not client_id:
        return {'success': False, 'message': 'client_id is required'}, 400

    config = get_webhook_config(client_id)
    if not config:
        return {'success': False, 'message': 'Webhook config not found'}, 404
    return {'success': True, 'webhook': config}, 200


def handle_webhook_post(path: str, payload: dict[str, Any]) -> tuple[dict[str, Any], int] | None:
    if path not in WEBHOOK_POST_PATHS:
        return None

    try:
        if path == '/api/webhooks/config':
            config = upsert_webhook_config(payload)
            return {'success': True, 'webhook': config}, 200

        if path == '/api/webhooks/rotate':
            config = rotate_webhook_secret(payload)
            return {'success': True, 'webhook': config}, 200

        record = write_webhook_delivery_log(payload)
        return {'success': True, 'delivery': record}, 201
    except ValueError as exc:
        return {'success': False, 'message': str(exc)}, 400
