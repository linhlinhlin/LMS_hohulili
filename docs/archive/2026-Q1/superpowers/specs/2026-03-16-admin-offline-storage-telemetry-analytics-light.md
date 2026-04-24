# Spec: Analytics nhẹ cho Admin Offline Storage Telemetry

> **Date**: 2026-03-16  
> **Status**: Approved for implementation  
> **Owner**: Codex

## Mục tiêu

Bổ sung một lớp analytics nhẹ ngay trên trang `ADMIN` hiện có để support/QA không chỉ xem log từng dòng, mà còn nhìn được:

- sự cố có đang tăng lên hay không
- route nào bị lỗi nhiều nhất
- platform nào bị ảnh hưởng nhiều nhất
- bao nhiêu user thực sự đang bị tác động

## Phạm vi V1.1

- Endpoint analytics riêng:
  - `GET /api/v3/admin/client-telemetry/offline-storage/analytics`
- Tham số:
  - `days` (`7/14/30`)
  - `eventType`
  - `search`
- Payload:
  - `totalEvents`
  - `affectedUsers`
  - `requiresRedownloadCount`
  - `byEventType`
  - `byAvailability`
  - `dailyTrend`
  - `topRoutes`
  - `topPlatforms`

## Frontend

- Tái sử dụng màn `/admin/offline-storage`
- Thêm:
  - summary cards
  - switch `7/14/30 ngày`
  - trend bar theo ngày
  - top route
  - top platform

## Không làm trong V1.1

- dashboard analytics riêng
- export CSV
- alerting/realtime
- drill-down nhiều tầng

## Kiểm thử

- backend test cho analytics endpoint
- frontend build pass
- production smoke:
  - admin query endpoint analytics trả `200`
  - `search` vẫn lọc đúng
  - `ORG_ADMIN` vẫn `403`
