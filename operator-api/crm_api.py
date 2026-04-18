from __future__ import annotations

import json
from typing import Any
from urllib.parse import parse_qs

from crm_manager import CRMManager
from crm_store import (
    get_crm_integration,
    get_crm_integration_status,
    log_crm_sync,
    mask_credentials,
    reseal_all_credentials,
    rotate_crm_credentials,
    upsert_crm_integration,
)
from hubspot_handler import HubSpotHandler
from salesforce_handler import SalesforceHandler

CRM_MANAGER = CRMManager()
CRM_MANAGER.register_handler('hubspot', HubSpotHandler)
CRM_MANAGER.register_handler('salesforce', SalesforceHandler)

CRM_GET_PATHS = {
    '/api/crm/supported',
    '/api/crm/validate',
    '/api/crm/config',
    '/api/crm/status',
    '/api/crm/reseal',
    '/api/crm/contacts/get',
    '/api/crm/contacts/list',
    '/api/crm/deals/get',
    '/api/crm/deals/list',
    '/api/crm/activities/list',
}

CRM_POST_PATHS = {
    '/api/crm/setup',
    '/api/crm/rotate',
    '/api/crm/contacts',
    '/api/crm/deals',
    '/api/crm/activities',
    '/api/crm/contacts/update',
    '/api/crm/deals/update',
}


def handle_crm_get(path: str, query: str) -> tuple[dict[str, Any], int] | None:
    if path not in CRM_GET_PATHS:
        return None

    params = parse_qs(query)

    if path == '/api/crm/supported':
        return {'crms': CRM_MANAGER.list_supported_crms()}, 200

    if path == '/api/crm/validate':
        crm_type = (params.get('crm_type') or [''])[0]
        credentials_raw = (params.get('credentials') or ['{}'])[0]
        try:
            credentials = json.loads(credentials_raw)
        except json.JSONDecodeError:
            return {'success': False, 'message': 'Invalid credentials JSON'}, 400
        ok, message = CRM_MANAGER.validate_credentials(crm_type, credentials)
        return {'success': ok, 'message': message, 'crm_type': crm_type}, 200 if ok else 400

    if path == '/api/crm/reseal':
        count = reseal_all_credentials()
        return {'success': True, 'resealed_integrations': count}, 200

    crm_type = (params.get('crm_type') or [''])[0]
    bot_id = (params.get('bot_id') or [''])[0]

    if path == '/api/crm/config':
        record = get_crm_integration(bot_id, crm_type)
        if not record:
            return {'success': False, 'message': 'CRM integration not found'}, 404
        record['credentials'] = mask_credentials(record['credentials'])
        return {'success': True, 'integration': record}, 200

    if path == '/api/crm/status':
        status = get_crm_integration_status(bot_id, crm_type)
        if not status:
            return {'success': False, 'message': 'CRM integration not found'}, 404
        return {'success': True, 'integration_status': status}, 200

    record = get_crm_integration(bot_id, crm_type)
    if not record:
        return {'success': False, 'message': 'CRM integration not found'}, 404

    handler = CRM_MANAGER.get_handler(crm_type, record['credentials'])

    if path == '/api/crm/contacts/get':
        contact_id = (params.get('contact_id') or [''])[0]
        result = handler.get_contact(contact_id)
        log_crm_sync(record['id'], 'get_contact', 'success' if result.get('success') else 'error', contact_id, None if result.get('success') else result.get('message'))
        return result, 200 if result.get('success') else 400

    if path == '/api/crm/deals/get':
        deal_id = (params.get('deal_id') or [''])[0]
        result = handler.get_deal(deal_id)
        log_crm_sync(record['id'], 'get_deal', 'success' if result.get('success') else 'error', deal_id, None if result.get('success') else result.get('message'))
        return result, 200 if result.get('success') else 400

    limit = int((params.get('limit') or ['10'])[0])
    if path == '/api/crm/contacts/list':
        result = {'success': True, 'contacts': handler.list_contacts(limit=limit)}
        log_crm_sync(record['id'], 'list_contacts', 'success')
        return result, 200
    if path == '/api/crm/deals/list':
        result = {'success': True, 'deals': handler.list_deals(limit=limit)}
        log_crm_sync(record['id'], 'list_deals', 'success')
        return result, 200

    result = {'success': True, 'activities': handler.list_activities(limit=limit)}
    log_crm_sync(record['id'], 'list_activities', 'success')
    return result, 200


def handle_crm_post(path: str, payload: dict[str, Any]) -> tuple[dict[str, Any], int] | None:
    if path not in CRM_POST_PATHS:
        return None

    if path in {'/api/crm/setup', '/api/crm/rotate'}:
        crm_type = str(payload.get('crm_type', '')).strip().lower()
        bot_id = str(payload.get('bot_id', '')).strip()
        credentials = payload.get('credentials', {})
        credential_label = str(payload.get('credential_label', '')).strip() or None
        if not bot_id or not crm_type or not isinstance(credentials, dict):
            return {'success': False, 'message': 'bot_id, crm_type and credentials are required'}, 400

        ok, message = CRM_MANAGER.validate_credentials(crm_type, credentials)
        if not ok:
            return {'success': False, 'message': message, 'crm_type': crm_type}, 400

        if path == '/api/crm/setup':
            record = upsert_crm_integration(bot_id, crm_type, credentials, credential_label=credential_label)
            return {'success': True, 'message': 'CRM integration saved', 'integration': record}, 200

        record = rotate_crm_credentials(bot_id, crm_type, credentials, credential_label=credential_label)
        if not record:
            return {'success': False, 'message': 'CRM integration not configured'}, 404
        return {'success': True, 'message': 'CRM credentials rotated', 'integration': record}, 200

    bot_id = str(payload.get('bot_id', '')).strip()
    crm_type = str(payload.get('crm_type', '')).strip().lower()
    data = payload.get('data', {})
    if not bot_id or not crm_type or not isinstance(data, dict):
        return {'success': False, 'message': 'bot_id, crm_type and data are required'}, 400

    record = get_crm_integration(bot_id, crm_type)
    if not record:
        return {'success': False, 'message': 'CRM integration not configured'}, 404

    try:
        handler = CRM_MANAGER.get_handler(crm_type, record['credentials'])
        if path == '/api/crm/contacts':
            result = handler.add_contact(data)
            action = 'add_contact'
        elif path == '/api/crm/deals':
            result = handler.create_deal(data)
            action = 'create_deal'
        elif path == '/api/crm/activities':
            result = handler.log_activity(data)
            action = 'log_activity'
        elif path == '/api/crm/contacts/update':
            contact_id = str(payload.get('contact_id', '')).strip()
            result = handler.update_contact(contact_id, data)
            action = 'update_contact'
        else:
            deal_id = str(payload.get('deal_id', '')).strip()
            result = handler.update_deal(deal_id, data)
            action = 'update_deal'

        log_crm_sync(
            record['id'],
            action,
            'success' if result.get('success') else 'error',
            result.get('id') or result.get('external_id'),
            None if result.get('success') else result.get('message'),
        )
        return result, 200 if result.get('success') else 400
    except Exception as exc:
        log_crm_sync(record['id'], 'exception', 'error', None, str(exc))
        return {'success': False, 'message': str(exc)}, 400
