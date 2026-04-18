# Architecture Note — 2026-04-18

## Context
RepoGraph was run against `latinum-board` to understand the current system shape after the cross-session dashboard work.

## RepoGraph snapshot
- Repository: `latinum-board`
- Nodes: 1013
- Edges: 1745

## Current architecture shape
The project is now split into two real subsystems:

### 1. `src/`
Primary Next.js application surface.
Contains:
- UI components
- dashboard views
- app API routes
- local server-side data readers

RepoGraph highlights:
- 30 routes
- 46 components
- 328 functions

### 2. `operator-api/`
Operator-side support and ingestion layer.
Contains:
- session parsing and normalization logic
- mirrored data generation
- internal support logic for operator-side data access

RepoGraph highlights:
- 130 functions

## Important architectural finding
`latinum-board` is no longer just a UI shell. It is now a real operational application with:
- dashboard rendering
- route-based API aggregation
- local persisted data
- operator-side ingestion and normalization
- deployment/runtime infrastructure

## Main runtime data flow
Current dashboard data flow is:

1. Operator-side OpenClaw session files
2. `operator-api/server.py` parses and normalizes session state
3. operator side writes mirrored session snapshot to `data/sessions.json`
4. `src/lib/server/session-ingest.ts` reads the mirrored file
5. app routes expose data through:
   - `/api/sessions`
   - `/api/dashboard`
6. homepage and `/sessions` render the operational view

This mirrored-file approach exists because the app host could not reliably call the operator host directly across the current private network boundary.

## Highest-risk routes right now
RepoGraph’s top route risks were:

### `/api/sessions`
Why it matters:
- sensitive operational session surface
- directly tied to ingestion health

### `/api/dashboard`
Why it matters:
- aggregates tasks, commits, worklogs, audit data, and sessions
- central dependency for homepage command view

### `/sessions`
Why it matters:
- direct operator-facing session visibility surface

## What depends on session ingestion
If session ingestion breaks or changes incorrectly, the following break first:
- `/api/sessions`
- `/api/dashboard`
- homepage session command view
- homepage recent completions
- homepage session preview
- `/sessions` filtered and full session views
- session KPI counts

That means session ingestion is now a **core architectural dependency**.

## Complexity hotspots
RepoGraph flagged these as current hotspots:
- `src/components/board/kanban/InteractiveBoard.tsx`
- `src/components/board/worklog/WorklogView.tsx`
- `src/components/board/items/ItemDetailDrawer.tsx`
- `src/components/board/commits/CommitsView.tsx`
- `operator-api/server.py`

Interpretation:
- board UI complexity is concentrated where expected
- `operator-api/server.py` is becoming the main integration hotspot and should be watched closely

## Architectural risk to watch
The biggest structural risk now is that `operator-api/server.py` is starting to become a catch-all integration file.

That is manageable right now, but it should be cleaned up in the next architecture pass before more ingestion logic accumulates.

## Recommended next step
Phase 4 should focus on a **unified ingestion foundation**:
- define a shared ingestion schema for sessions, commits, tasks, and worklogs
- make data contracts explicit between operator-api, mirrored files, app API routes, and UI panels
- split operator-side ingestion responsibilities more cleanly if growth continues
- document polling, caching, and failure behavior

## Bottom line
The board is already a usable command dashboard.
The next important architecture move is not more UI first, it is making the ingestion layer cleaner, more explicit, and easier to extend safely.
