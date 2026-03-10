# Coordination Mailbox

This folder is a local coordination channel between planning/review and implementation agents.

Use it as a mailbox, not as product documentation.

## Files

- `PLAN.md`: the active local execution plan owned by the planning/review agent.
- `TASKS/WAVE-*.md`: execution cards for the implementation team.
- `REPORTS/WAVE-*.md`: implementation reports from the execution team.
- `REVIEW/WAVE-*.md`: acceptance review and next-step decisions from the planning/review agent.
- `STATUS.md`: generated summary for fast scanning.
- `events.jsonl`: append-only machine-readable event log.

## Lifecycle

1. Planning/review writes or updates `PLAN.md`.
2. Planning/review creates a `TASKS/WAVE-*.md` card.
3. Implementation runs the wave and updates `REPORTS/WAVE-*.md`.
4. Implementation appends short events to `events.jsonl`.
5. The watcher regenerates `STATUS.md`.
6. Planning/review writes a decision in `REVIEW/WAVE-*.md`.
7. The next wave starts only after review says `approved`.

## Status Vocabulary

Use only these values in `Status:` lines and event entries:

- `todo`
- `in_progress`
- `blocked`
- `waiting_for_run`
- `ready_for_review`
- `approved`
- `rejected`

## Commands

Render status once:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/dev/coord-watch.ps1 -Mode render
```

Start watcher in the current shell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/dev/coord-watch.ps1 -Mode watch
```

Launch watcher in a detached PowerShell window:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/dev/coord-watch.ps1 -Mode launch
```

Append an event:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/dev/coord-watch.ps1 -Mode event -Role claude-code -Wave WAVE-A -Status in_progress -Message "Frontend build started."
```
