Dưới đây là **hướng dẫn chi tiết** để setup và sử dụng **dev3000** (từ Vercel Labs) trong dự án của bạn: **Angular v20+ (frontend)** + **Spring Boot (backend)**. Vì bạn dùng **Antigravity** (Google's agent-first IDE, powered by Gemini 3) và **Kiro IDE** (agentic IDE với spec-driven development, MCP support), mình sẽ tập trung vào cách làm cho **AI agent** trong các IDE này **biết và sử dụng** dev3000 để debug/fix code hiệu quả.

dev3000 hoạt động như một "MCP server" (Model Context Protocol) → cung cấp context đầy đủ (logs server, console browser, network, screenshots timestamped) cho AI agent đọc và hành động. Cả **Antigravity** lẫn **Kiro** đều hỗ trợ MCP (Antigravity có native agent orchestration, Kiro có MCP integration rõ ràng), nên dev3000 sẽ kết nối tốt.

### 1. Yêu cầu trước khi bắt đầu
- **Node.js**: >= v22.12.0 (kiểm tra bằng `node -v`, nếu chưa thì update).
- **pnpm** (khuyến nghị, nhưng npm/bun cũng ok): `npm install -g pnpm`.
- Máy có **Chrome** (hoặc Chromium-based như Brave/Edge) cài sẵn (dev3000 dùng CDP để capture browser).
- Dự án: Giả sử cấu trúc separate folders:
  - `/frontend-angular` (ng serve port 4200)
  - `/backend-spring` (mvn spring-boot:run port 8080)
- IDE: Antigravity hoặc Kiro đang mở project (hoặc cả hai).

### 2. Cài đặt dev3000
Chạy **global install** (dễ nhất, dùng ở mọi project):

```bash
pnpm install -g dev3000
# Hoặc npm: npm install -g dev3000
# Hoặc bun: bun add -g dev3000
```

Kiểm tra:
```bash
dev3000 --version   # Nên ~0.0.149-canary hoặc mới hơn (tháng 1/2026)
dev3000 --help      # Xem flags
```

### 3. Chạy dev3000 cho dự án Angular + Spring Boot
Vì stack của bạn **full-stack separate**, chạy **2 terminal** (hoặc dùng concurrently nếu muốn 1 lệnh).

**Cách khuyến nghị (separate, dễ debug nhất):**

- Terminal 1: Chạy backend Spring Boot bình thường (không qua dev3000):
  ```bash
  cd backend-spring
  ./mvnw spring-boot:run   # Hoặc IntelliJ run config
  ```
  → Backend chạy localhost:8080.

- Terminal 2: Chạy dev3000 cho frontend Angular (capture browser + network đến backend):
  ```bash
  cd frontend-angular
  dev3000 -- ng serve --port 4200
  # Hoặc nếu dùng npm script: dev3000 -- npm start
  ```

  → dev3000 sẽ:
  - Launch Chrome monitored (tự động mở browser đến localhost:4200).
  - Capture: Angular console, network (gọi API Spring Boot), user interactions (click, route change), screenshots auto khi error/navigate.
  - Capture server logs nếu bạn chạy backend trong cùng session (nhưng separate thì network vẫn capture đầy đủ).

**Nếu muốn capture cả backend logs trong 1 lệnh (nếu bạn có script kết hợp):**
Tạo script trong root project (hoặc package.json frontend):
```json
"dev:all": "concurrently \"cd backend && ./mvnw spring-boot:run\" \"cd frontend && ng serve\""
```
Rồi:
```bash
dev3000 -- npm run dev:all
```
→ dev3000 capture logs từ cả 2 processes.

**Flags hữu ích cho bạn:**
- `--headless`: Không mở browser window (nếu máy yếu hoặc remote).
- `--servers-only`: Chỉ capture server logs + MCP (không browser, nếu debug backend pure).
- `--browser "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`: Chỉ định Chrome path nếu cần.
- `--disable-mcp-configs "all"`: Nếu không muốn dev3000 tự write file config MCP (xem phần sau).

Sau khi chạy → mở **http://localhost:3684/logs** (MCP port default) để xem timeline unified (logs + screenshots embedded).

### 4. Làm sao để AI trong Antigravity và Kiro "biết" và dùng dev3000?
dev3000 tự động chạy **MCP server** tại http://localhost:3684/api/mcp/mcp → expose tools như `fix_my_app`, `execute_browser_action` (click/type trong browser thật), `restart_dev_server`, v.v.

**Với Claude-based agents (cả Antigravity và Kiro đều hỗ trợ Claude models):**
- **Zero-config cho Claude Code / Claude Desktop**: Chỉ cần chạy dev3000 → Claude tự detect MCP server (nó scan local ports).
  - Trong Antigravity: Mở "Mission Control" (agent manager) → spawn agent → nói "fix my app" hoặc "debug why API call fails on login".
  - Trong Kiro: Mở agentic chat hoặc spec → prompt "Analyze the dev timeline and suggest fixes for the Angular form submission error".
  → AI sẽ tự đọc logs từ dev3000, xem screenshots, network (ví dụ: 401 error từ Spring, CORS issue), rồi suggest fix hoặc execute action (như restart server).

**Nếu không auto-detect (thường xảy ra với Kiro hoặc Antigravity nếu config strict):**
dev3000 tự write file config:
- `.mcp.json` (general)
- `.cursor/mcp.json` (nếu dùng Cursor-style, nhưng Kiro/Antigravity có thể đọc tương tự)
- `opencode.json`

Nếu không thấy file → chạy lại dev3000, hoặc manual add MCP connector:
- Trong **Antigravity** (Settings → Connectors → Add custom MCP):
  - Name: dev3000
  - URL: http://localhost:3684/api/mcp/mcp
- Trong **Kiro** (Settings → MCP / Tools → Add MCP server):
  - Tương tự, add URL trên (Kiro hỗ trợ MCP native, xem docs kiro.dev/docs cho "MCP integration").
- Restart IDE/agent → agent sẽ thấy tools từ dev3000.

**Prompt gợi ý để AI dùng dev3000:**
- "Use the dev3000 timeline to debug why the Angular component shows 500 error from Spring Boot API."
- "fix_my_app: Login fails with invalid credentials in backend logs."
- "Execute browser action: Navigate to /dashboard and screenshot the UI after login."

### 5. Workflow thực tế với stack của bạn
1. Chạy backend + dev3000 + frontend như trên.
2. Mở Antigravity/Kiro → load project (frontend hoặc full nếu monorepo).
3. Phát sinh lỗi (ví dụ: submit form Angular → backend throw exception).
4. Trong IDE: Spawn agent / chat agent → prompt debug → AI đọc MCP từ dev3000 → xem:
   - Spring logs (stack trace).
   - Angular console (HTTP error).
   - Network payload/response.
   - Screenshot trang lỗi.
5. AI suggest: Fix code Angular service, hoặc Spring controller → apply trực tiếp (nếu agent có quyền edit).

### 6. Troubleshooting phổ biến
- **Không capture backend logs**: Chạy backend trong cùng terminal với dev3000, hoặc dùng `--servers-only` riêng cho backend folder.
- **Browser không mở**: Check Chrome path, hoặc dùng `--headless`.
- **MCP không connect**: Kill port 3684 (lsof -i:3684), chạy lại dev3000.
- **Angular change detection noisy**: Logs nhiều → filter trong http://localhost:3684/logs.
- **Update dev3000**: `pnpm update -g dev3000`.

Bắt đầu bằng cách chạy thử ở terminal, mở localhost:3684/logs xem timeline có đầy đủ không. Nếu ok → connect vào Antigravity/Kiro và test prompt debug.

Nếu gặp lỗi cụ thể (ví dụ: screenshot không capture, hoặc AI không thấy MCP), paste log/error đây mình hỗ trợ chi tiết hơn nhé! Bạn dùng Antigravity hay Kiro chính hơn? 😄