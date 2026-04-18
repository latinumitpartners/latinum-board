# Ingestion Architecture — 2026-04-18

## Purpose
This note defines the Phase 4 ingestion foundation for Latinum Board.

The goal is to make ingestion contracts explicit so the board can grow without fragile, implicit coupling between operator-side parsers, mirrored files, app API routes, and UI components.

## Current direction
Latinum Board now uses an explicit ingestion model for session data.

### Current session flow
1. Operator-side OpenClaw session files are parsed on the operator host
2. `operator-api/server.py` normalizes session state
3. operator side writes a mirrored file into `data/sessions.json`
4. app-side `src/lib/server/session-ingest.ts` reads the mirrored file
5. app routes expose the result to the UI

## Core Phase 4 rule
**Operator ingestion payloads and UI-facing board types are not the same thing.**

They may overlap, but they serve different purposes:
- ingestion payloads define transport/storage contracts
- board types define UI/application semantics

## Shared ingestion contract
A new ingestion contract now exists in:
- `src/lib/ingestion-types.ts`

### Envelope
All mirrored ingestion payloads should move toward this shape:

```ts
{
  schemaVersion: '2026-04-18.v1',
  generatedAt: string,
  source: 'operator-api' | 'local-store' | 'manual',
  kind: 'sessions' | 'commits' | 'tasks' | 'worklogs',
  items: []
}
```

### Why this matters
This gives us:
- explicit schema versioning
- source attribution
- consistent ingestion shape across data families
- safer future migrations
- easier debugging when mirrored data goes stale or malformed

## Current implementation status
### Sessions
Implemented first:
- operator side now writes session mirrors using an ingestion envelope
- app side accepts either:
  - legacy raw array payloads
  - new envelope-based payloads

This preserves backward compatibility while establishing the new standard.

## Planned extension targets
Next data families to migrate to the same ingestion contract:
- commits
- tasks
- worklogs

## Boundary rules
### Operator API responsibilities
- parse source-of-truth operational data
- normalize into ingestion-safe records
- write mirrored payloads in explicit envelope format
- avoid UI-specific formatting logic where possible

### App-side ingestion responsibilities
- read mirrored payloads safely
- validate / normalize transport format
- adapt ingestion records into board-facing shapes
- fail soft when mirrored data is missing or malformed

### UI responsibilities
- consume app-facing board data only
- avoid direct knowledge of operator-side source files or transport quirks

## Failure behavior
Expected Phase 4 behavior:
- missing mirrored file → empty UI state, not crash
- malformed ingestion payload → safe fallback, not crash
- stale mirrored file → visible but debuggable behavior
- schema changes → versioned transition path

## What still needs doing
- extend the ingestion envelope to commits, tasks, and worklogs
- document polling/caching cadence explicitly
- consider splitting `operator-api/server.py` as ingestion logic grows
- add schema validation if the ingestion surface becomes broader

## Bottom line
This establishes the first real ingestion contract for Latinum Board.

Phase 4 should continue from here by making all mirrored operational data explicit, versioned, and transport-safe.
