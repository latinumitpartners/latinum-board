# Client Registry and Webhooks — Implementation Checklist

Date: 2026-04-18
Repo: `product/latinum-board`

## Goal
Finish the implementation of the client registry and webhook system so that Latinum Board has a real source of truth for client integration state, reliable webhook delivery, secure secret handling, and operator-visible health.

---

## Phase 1 — Canonical client registry model

### Objective
Create a single source of truth for client identity, integration metadata, and operational state.

### Required outcomes
- One canonical client registry schema
- Explicit link between client, bot, CRM integration, and webhook configuration
- Clear lifecycle state for each client record

### Files to create
- `operator-api/client_registry_store.py`
- `operator-api/schema/client-registry.sql`
- `src/lib/client-registry-types.ts`

### Files to modify
- `operator-api/README.md`
- `operator-api/server.py`
- `src/lib/board-types.ts`

### Schema fields to define
- `client_id`
- `client_name`
- `status` (`active`, `paused`, `suspended`, `decommissioned`)
- `environment` (`test`, `prod`, `demo`, etc.)
- `bot_id`
- `crm_type`
- `crm_integration_id`
- `webhook_url`
- `webhook_secret_label`
- `webhook_secret_version`
- `webhook_enabled`
- `webhook_event_version`
- `created_at`
- `updated_at`
- `last_webhook_success_at`
- `last_webhook_failure_at`
- `last_webhook_error`
- `notes`

### API surface to add
- `GET /api/clients`
- `GET /api/clients/:id` or query-based equivalent
- `POST /api/clients`
- `POST /api/clients/update`
- `POST /api/clients/status`

### Exit criteria
- Registry records can be created, updated, listed, and inspected
- Registry becomes the canonical source of truth for client integration state

---

## Phase 2 — Webhook configuration and secret management

### Objective
Add real webhook configuration persistence and secret lifecycle support.

### Required outcomes
- Webhook secrets stored securely
- Rotation flow supported
- Registry linked to active secret/version metadata

### Files to create
- `operator-api/webhook_store.py`
- `operator-api/schema/webhooks.sql`

### Files to modify
- `operator-api/crm_store.py`
- `operator-api/client_registry_store.py`
- `operator-api/crm_api.py`
- `operator-api/latinum-board-operator-api.env.example`

### Capabilities to add
- create webhook secret
- rotate webhook secret
- mask secret in any read surface
- track active secret version
- track secret creation and rotation timestamps

### API surface to add
- `GET /api/webhooks/config`
- `POST /api/webhooks/config`
- `POST /api/webhooks/rotate`

### Exit criteria
- Webhook config can be persisted and rotated safely
- Secret metadata is visible without exposing secret values

---

## Phase 3 — Webhook event model and delivery engine

### Objective
Implement actual outbound webhook delivery, not just config storage.

### Required outcomes
- Versioned event schema
- Signed outbound delivery
- Reliable delivery with retry behavior

### Files to create
- `operator-api/webhook_delivery.py`
- `operator-api/webhook_events.py`
- `operator-api/schema/webhook-delivery-log.sql`

### Files to modify
- `operator-api/server.py`
- `operator-api/client_registry_store.py`
- `operator-api/README.md`

### Event model to define
- `event_id`
- `event_type`
- `event_version`
- `client_id`
- `occurred_at`
- `payload`
- `signature`
- `delivery_attempt`

### Delivery behavior to implement
- sign payloads
- send HTTP POST requests
- capture response code/body summary
- retry with backoff
- mark success/failure timestamps
- store final error state

### API surface to add
- `POST /api/webhooks/test-send`
- `GET /api/webhooks/deliveries`
- `GET /api/webhooks/deliveries/recent`

### Exit criteria
- Board can send real webhook events
- Delivery attempts are logged and inspectable
- Failures do not disappear silently

---

## Phase 4 — Operator visibility in the board UI

### Objective
Expose registry and webhook state inside Latinum Board so the operator can manage and debug integrations without shell access.

### Required outcomes
- Client registry view
- Webhook health view
- Secret/version state visible
- Failure state visible

### Files to create
- `src/app/clients/page.tsx`
- `src/components/board/clients/ClientRegistryTable.tsx`
- `src/components/board/clients/ClientRegistryDrawer.tsx`
- `src/components/board/webhooks/WebhookHealthPanel.tsx`
- `src/lib/server/client-registry.ts`
- `src/lib/server/webhook-deliveries.ts`

### Files to modify
- `src/app/page.tsx`
- `src/components/board/layout/SidebarNav.tsx`
- `src/components/board/layout/Topbar.tsx`
- `src/lib/board-types.ts`

### UI fields to surface
- client status
- webhook enabled/disabled
- last delivery success/failure
- failure count / recent error
- CRM linkage state
- secret version

### Exit criteria
- Operator can inspect client integration health from the board
- Webhook breakage is visible without manual backend inspection

---

## Phase 5 — Inbound verification and security hardening

### Objective
Secure the webhook system and any inbound callback path.

### Required outcomes
- Signature verification
- Replay protection
- Idempotency support
- Audit trail for config changes

### Files to create
- `operator-api/webhook_verify.py`
- `operator-api/schema/webhook-audit.sql`

### Files to modify
- `operator-api/webhook_delivery.py`
- `operator-api/webhook_store.py`
- `operator-api/server.py`
- `operator-api/README.md`

### Security features to add
- HMAC signature verification
- timestamp validation
- nonce or replay window handling
- idempotency key support
- audit logging for config changes and secret rotation

### Exit criteria
- Webhook system can be operated safely in production
- Config changes and secret rotations are auditable

---

## Phase 6 — Deployment and runtime integration

### Objective
Make registry and webhook configuration part of real deployment/runtime behavior, not a disconnected app feature.

### Required outcomes
- Deploy/runtime reads canonical registry data
- Service env/config is aligned
- New client provisioning can register webhook state

### Files to modify
- `deploy/ROLL_OUT_KEVIN_TODO.md`
- `deploy/latinum-board.service`
- `operator-api/latinum-board-operator-api.service`
- `operator-api/latinum-board-operator-api.env.example`
- `README.md`

### Integration tasks
- document required env vars
- document webhook secret handling
- define how new clients get registry entries
- define how deploy flow updates registry state
- define operational recovery steps for failed webhook delivery

### Exit criteria
- Registry and webhook config are part of deployment and operations
- Runtime behavior matches documented architecture

---

## Cross-cutting rules

### Source of truth
- Client registry must become the canonical source of truth
- UI, operator API, and deploy/runtime must not drift into separate state models

### Security
- Never expose raw secrets in UI or logs
- Secret rotation must preserve history and active version metadata
- Webhook verification must be designed before any production inbound callback flow

### Observability
- Every webhook failure must be visible somewhere
- Last success / failure timestamps must be queryable
- Silent failure is not acceptable

### Versioning
- Webhook events must be explicitly versioned
- Registry schema changes must be migration-aware

---

## Recommended implementation order
1. Phase 1 — client registry schema + store + API
2. Phase 2 — webhook config + secret lifecycle
3. Phase 3 — outbound delivery engine + retry/logging
4. Phase 4 — board visibility and operator control
5. Phase 5 — security hardening and inbound verification
6. Phase 6 — deployment/runtime integration

---

## Immediate next step
Start with **Phase 1** and define the canonical client registry schema before building more webhook behavior.

If the schema is weak, everything downstream will need rework.
