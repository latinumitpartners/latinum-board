# Polling and Caching Note — 2026-04-18

## Purpose
This note documents the current polling and caching behavior for Latinum Board ingestion and dashboard surfaces.

## Current runtime model
Latinum Board uses a mixed model:
- operator-side normalization for operational data
- mirrored local data files for app-host reads
- on-demand app API aggregation for dashboard views

## Operator-side caching
### Session ingestion
- source: OpenClaw session JSONL files on operator host
- normalization: `operator-api/ingestion.py`
- cache file: `~/.openclaw/workspace/.latinum-board-sessions.json`
- mirror file: `product/latinum-board/data/sessions.json`
- TTL: 300 seconds

### Commit ingestion
- source: workspace git history
- normalization: `operator-api/ingestion.py`
- cache file: `~/.openclaw/workspace/.latinum-board-commits.json`
- mirror target: `product/latinum-board/data/commits.json` when refreshed through ingestion path
- TTL: 300 seconds

## App-side reads
App-side server readers now tolerate either:
- legacy raw arrays
- ingestion envelope payloads

Current mirrored files in `data/`:
- `tasks.json`
- `commits.json`
- `worklogs.json`
- `audit.json`
- `saved-views.json`
- `sessions.json`

## UI fetch behavior
Current dashboard/session UI uses `fetch(..., { cache: 'no-store' })` for live reads from app routes.

That means:
- browser/client requests ask for fresh route results each time
- freshness still depends on underlying mirrored file state and operator-side TTLs

## Failure behavior
### Missing mirrored file
- app should fail soft and return empty state, not crash

### Malformed mirrored payload
- app should fail soft and return empty state, not crash

### Stale mirrored payload
- dashboard may render stale operational state until operator-side cache refreshes or mirror is rewritten

## Recommended next improvements
- explicitly refresh mirrored commits/tasks/worklogs through the same ingestion pipeline
- add visible stale-data indicators when mirrored data ages beyond expected TTL
- consider scheduled mirror refresh if runtime freshness becomes more important than low overhead
- split ingestion refresh cadence by data type instead of one mental model for all data

## Bottom line
Current polling/caching behavior is acceptable for operator use, but still lightly documented and partly implicit.

Phase 4 is about making this explicit and transport-safe before the system grows further.
