# Next Build Plan

## Goal
Make Latinum Board a true cross-session command dashboard by finishing live session ingestion and improving operator visibility.

---

## Phase 1. Fix live session ingestion path

### Objective
Make the live board app return real session data from the operator host instead of an empty sessions payload.

### Tasks
- [ ] Verify why the app host cannot reliably consume `http://10.0.0.92:9876/api/sessions/recent`
- [ ] Decide the permanent architecture for session data transport:
  - [ ] allow internal app-host to operator-host API access, or
  - [ ] move the board app/API boundary closer to operator-host data, or
  - [ ] expose session data through a different already-reachable internal path
- [ ] Remove the current silent empty-state failure mode in `/api/sessions`
- [ ] Add explicit error/status reporting for session ingestion failures
- [ ] Verify live app host returns real session payloads from `/api/sessions`

### Done looks like
- [ ] `https://kevin-todo.latinum.ca/api/sessions` returns real session data
- [ ] `/sessions` page shows active and quiet sessions from live OpenClaw data

---

## Phase 2. Improve session normalization

### Objective
Turn raw session transcript data into useful operational state.

### Tasks
- [ ] Filter out checkpoint noise and low-value session files
- [ ] Extract and normalize:
  - [ ] session key
  - [ ] title
  - [ ] last updated
  - [ ] model
  - [ ] thinking mode
  - [ ] cwd / repo path
  - [ ] last meaningful user message
  - [ ] last meaningful assistant message
- [ ] Add derived classifications:
  - [ ] active
  - [ ] quiet
  - [ ] stalled
  - [ ] waiting on Kevin
  - [ ] recently completed
- [ ] Add guardrails for malformed or partial JSONL records
- [ ] Add caching behavior that reduces load without making the dashboard stale

### Done looks like
- [ ] Sessions panel shows meaningful operational state, not raw transcript fragments
- [ ] Easy to identify which sessions need attention

---

## Phase 3. Upgrade dashboard views

### Objective
Surface the most important session intelligence on the home dashboard.

### Tasks
- [ ] Add dashboard cards for:
  - [ ] active sessions
  - [ ] stalled sessions
  - [ ] sessions waiting on user input
  - [ ] recent completions
- [ ] Add quick drill-down from dashboard to session detail view
- [ ] Improve Sessions page layout for scanning and triage
- [ ] Show stronger visual status indicators for active, blocked, stalled, and quiet sessions

### Done looks like
- [ ] Dashboard answers what is running, what is blocked, and what needs attention

---

## Phase 4. Prepare unified ingestion foundation

### Objective
Lay the groundwork for broader command-dashboard intelligence.

### Tasks
- [ ] Define a shared ingestion schema for sessions, commits, worklogs, and tasks
- [ ] Unify operator-side APIs into a clearer internal data-service boundary
- [ ] Document caching, polling, and failure behavior
- [ ] Document trust boundaries between operator host data and board app views

### Done looks like
- [ ] Board has a stable foundation for future multi-source live state

---

## Recommended order
1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4

## Immediate next move
Start with **Phase 1 + Phase 2 together**.
