# Quy ước runtime

Tài liệu này là nguồn tham chiếu ngắn gọn cho runtime hiện tại của dự án.

## Local development

- Frontend local: `http://localhost:4200`
- Backend local trên host: `http://localhost:8088`
- Spring Boot/container port nội bộ: `8080`
- Swagger local: `http://localhost:8088/swagger-ui`

## Production

- Frontend + API: `https://holilihu.online`
- API chạy same-origin dưới `/api/*`
- Health check: `/actuator/health`
- Wiii production origin: `https://wiii.holilihu.online`

## Docker topology được hỗ trợ

- `docker-compose.yml`
- `docker-compose.dev.yml`
- `docker-compose.prod.yml`

Không coi các topology khác là chuẩn vận hành của repo.

## Env files

- Local/dev: `.env.dev.example` -> `.env`
- Production: `.env.prod.example` -> `.env.prod`

## Quy ước frontend dev

- frontend dev dùng `fe/proxy.conf.json`
- gọi API bằng `/api/*`
- không hardcode backend host trong code frontend local

## Quy ước backend

- port `8088` là port host-facing ở local
- port `8080` chỉ dùng cho container/reverse proxy wiring
