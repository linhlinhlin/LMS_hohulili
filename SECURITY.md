# Security Policy

Cảm ơn bạn vì đã dành thời gian kiểm tra tính bảo mật của LMS Maritime (`holilihu.online`). Tài liệu này mô tả cách báo cáo lỗ hổng và những version nào đang được hỗ trợ.

## Supported versions

| Branch | Status | Security fixes |
|---|---|---|
| `main` | Active | ✅ — luôn nhận fix |
| `develop` | Legacy integration | Chỉ khi backport |
| Các nhánh khác | Unsupported | Không |

Production deploy luôn theo đúng revision của `main`.

## Reporting a vulnerability

**Không mở issue public** cho lỗ hổng bảo mật. Thay vào đó:

1. Gửi email đến owner của repo qua GitHub private message (`@meiiie`) hoặc email cá nhân đã công bố.
2. Mô tả lỗ hổng gồm:
   - Surface bị ảnh hưởng (FE / BE / infra / docker-compose / Caddy / GCP)
   - Reproduce steps tối thiểu
   - Impact tiềm năng (RCE / XSS / SQLi / IDOR / PII leak / privilege escalation)
   - Đề xuất fix nếu có
3. Bạn sẽ nhận phản hồi ban đầu trong **72 giờ** kể từ lúc báo.

## Scope

### In-scope

- Tất cả code tại repo `LMS_hohulili` tracked trên `main`
- Cấu hình deploy: `docker-compose.*.yml`, `Caddyfile`, `deploy.sh`, `.github/workflows/`
- Production URL: `https://holilihu.online` khi VM không ở trạng thái paused
- Authentication: JWT, Google Identity Services, session management
- File upload: presigned URL flow, R2, Cloudflare Stream
- Payment: VNPay + SePay integrations
- PWA / offline: IndexedDB isolation, Service Worker

### Out-of-scope

- Tấn công DoS, brute-force, hoặc spam
- Đăng nhập bằng credential rò rỉ từ nguồn bên ngoài
- Tấn công social engineering vào maintainer
- Các dependency CVE mà bản mới đã có trong dependabot/security advisories (dùng `npm audit` / Snyk thay vì báo cáo trực tiếp)
- Lỗ hổng chỉ reproduce được trong `localhost` không có nghĩa khai thác production (vẫn có thể báo để tham khảo)
- Missing HTTP security header là non-critical trừ khi gây exploit cụ thể

## Hardening đã áp dụng

Các biện pháp phòng vệ chính đang active trên production:

- **HTTPS**: Caddy auto-HTTPS + HSTS
- **CSP**: Content Security Policy strict (Google avatars, fonts allowed)
- **CORS**: whitelist `holilihu.online`, `localhost:4200` chỉ cho dev
- **JWT**: HS256 + short expiry + refresh flow, JWT secret trong `.env.prod` (never committed)
- **Password storage**: BCrypt
- **Rate limiting**: Spring Security filter on auth endpoints
- **SQL injection**: JPA/Hibernate parameterized queries, Flyway migrations
- **File upload**: presigned URL với size + MIME whitelist, Cloudflare R2 backend
- **Admin separation**: 3-tier role (ADMIN / ORG_ADMIN / TEACHER / STUDENT), `isAdminRole()` ownership bypass
- **Multi-tenant**: org scope guards trong use cases
- **SSRF protection**: `NG_ALLOWED_HOSTS` cho Angular SSR
- **Offline isolation**: IndexedDB keyed bằng `[userId+...]` compound keys

## Responsible disclosure

- Không public lỗ hổng cho tới khi có fix merge vào `main` + deploy production (nếu VM active).
- Nếu tìm thấy lỗ hổng trong dependency, ưu tiên báo upstream project trước.
- Maintainer cam kết credit (nếu bạn muốn) trong `CHANGELOG.md` sau khi fix ship.

## Reference

- [`docs/runbooks/`](docs/runbooks/) — quy trình incident response
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — coding standard
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — danh mục threat đang cover
