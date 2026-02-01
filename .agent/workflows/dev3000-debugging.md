---
description: Use dev3000 (Vercel Labs MCP server) for AI-assisted debugging of full-stack apps (Angular + Spring Boot)
---

# Dev3000 Debugging Workflow

## What is dev3000?

MCP server từ Vercel Labs - capture unified timeline (logs, browser, network, screenshots) cho AI debugging.

## Requirements

- Node.js >= 22.12.0
- Chrome/Chromium browser
- `pnpm install -g dev3000`

## LMS Project Setup

### Option 1: Frontend Only (Recommended)

```bash
# Terminal 1: Backend
cd d:\lms_update\hung_backend_ref\api
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 2: Frontend with dev3000
cd d:\lms_update\fe
dev3000 -- npm start
```

### Option 2: Headless Mode

```bash
dev3000 --headless -- npm start
```

### Option 3: Servers Only (Backend logs)

```bash
dev3000 --servers-only -- mvn spring-boot:run
```

## Access Points

- **Timeline**: http://localhost:3684/logs
- **MCP API**: http://localhost:3684/api/mcp/mcp

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `fix_my_app` | Analyze logs, find errors, suggest fixes |
| `execute_browser_action` | Screenshot, click, navigate |
| `restart_dev_server` | Restart server safely |
| `crawl_app` | Discover all routes |
| `find_component_source` | Map DOM to source code |

## AI Integration

### Antigravity
1. Settings → Connectors → Add custom MCP
2. Name: `dev3000`
3. URL: `http://localhost:3684/api/mcp/mcp`

### Prompting
- "fix my app"
- "debug why API call fails on login"
- "analyze the dev timeline for 500 errors"

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Browser not opening | Use `--headless` or check Chrome path |
| MCP not connecting | Kill port 3684, restart dev3000 |
| No backend logs | Run backend through dev3000 |
