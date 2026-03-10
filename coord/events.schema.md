# events.jsonl Schema

Each line in `events.jsonl` must be a single JSON object.

## Required fields

- `timestamp`: ISO 8601 string
- `role`: short actor label such as `codex`, `claude-code`, `tester`
- `wave`: wave identifier such as `WAVE-A`
- `status`: one of the allowed coordination statuses
- `message`: short human-readable update

## Example

```json
{"timestamp":"2026-03-10T12:34:56.0000000+07:00","role":"claude-code","wave":"WAVE-A","status":"in_progress","message":"Frontend build started."}
```
