# Ma trận local development

## Cách chạy khuyến nghị

### Backend bằng Docker, frontend local

```bash
cp .env.dev.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db backend

cd fe
npm install
npm start
```

Khi nào dùng:

- làm frontend hằng ngày
- debug API qua local FE
- cần tốc độ lặp nhanh

## Cách chạy full stack bằng Docker

```bash
cp .env.dev.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build --wait
```

Khi nào dùng:

- muốn kiểm tra gần giống production hơn
- muốn test integration đầy đủ

## Cách chạy backend host-native

```bash
cd backend
SERVER_PORT=8088 mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Khi nào dùng:

- cần debug backend trực tiếp bằng IDE
- cần startup nhanh cho thay đổi Java nhỏ

## Kiểm tra nền tối thiểu

```bash
curl -s http://localhost:8088/actuator/health
curl -I http://localhost:4200/
```
