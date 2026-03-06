#!/bin/bash
# Export toàn bộ dữ liệu PostgreSQL LMS
# Chạy khi Docker đang bật: ./export_db.sh
#
# File output: db_dump_full.sql (schema + data)
# Đồng nghiệp import bằng: docker compose exec -T db psql -U lms -d lms < db_dump_full.sql

echo "=== Exporting LMS Database ==="

cd backend

# Export full dump (schema + data, no ownership info)
docker compose exec -T db pg_dump -U lms -d lms \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  > ../db_dump_full.sql

# Export data-only (nếu đồng nghiệp đã có schema từ Flyway)
docker compose exec -T db pg_dump -U lms -d lms \
  --no-owner \
  --no-acl \
  --data-only \
  --inserts \
  > ../db_dump_data_only.sql

cd ..

echo ""
echo "=== Export Complete ==="
echo "Files created:"
echo "  db_dump_full.sql      - Full schema + data (cho fresh DB)"
echo "  db_dump_data_only.sql - Data only (INSERT statements)"
echo ""
echo "=== Hướng dẫn cho đồng nghiệp ==="
echo ""
echo "CÁCH 1: Chạy từ đầu (khuyến nghị - tự động seed 4 accounts)"
echo "  cd backend && docker compose up -d"
echo "  cd ../fe && npm install && npm start"
echo ""
echo "CÁCH 2: Import full dump (có sẵn dữ liệu courses/lessons)"
echo "  cd backend && docker compose up -d"
echo "  # Đợi 60s cho DB ready"
echo "  docker compose exec -T db psql -U lms -d lms < ../db_dump_full.sql"
echo ""
echo "CÁCH 3: Chạy bình thường + import data only"
echo "  cd backend && docker compose up -d"
echo "  # Đợi API ready (Flyway tạo schema)"
echo "  docker compose exec -T db psql -U lms -d lms < ../db_dump_data_only.sql"
