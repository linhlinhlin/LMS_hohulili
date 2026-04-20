# Org Admin Portal Split Design

## Objective

Tach biet ro `ADMIN` va `ORG_ADMIN` tren frontend de mental model, dieu huong, va workflow phu hop voi pham vi quyen thuc te. Phase dau tap trung vao `ORG_ADMIN` portal va surface `courses`.

## Approved Direction

- `ADMIN` giu namespace `/admin/*`
- `ORG_ADMIN` chuyen sang `/org-admin/*`
- Backend API namespace giu nguyen trong phase nay
- `ORG_ADMIN` chi co dashboard, courses, users teachers/students, analytics
- Legacy deep link `/admin/*` cua `ORG_ADMIN` duoc redirect sang `/org-admin/*` neu co route tuong duong

## FE Scope

1. Route foundation
- them `/org-admin`
- guard redirect theo role
- cap nhat login, resume session, public header

2. Navigation
- sidebar `ORG_ADMIN` dung route moi `/org-admin/*`
- bo categories, organizations, payouts, settings, logs, offline storage, users all/admins

3. Courses surface
- doi copy tu mental model he thong sang mental model to chuc
- giu API hien tai
- `ORG_ADMIN` khong hien destructive action nhu delete course

4. Shared links
- dashboard cards
- teacher/student management deep links
- course preview/back navigation
- AI context nhan dien `/org-admin`

## Success Criteria

- Dang nhap `ORG_ADMIN` vao `/org-admin`
- Dang nhap `ADMIN` vao `/admin`
- `ORG_ADMIN` vao `/admin/courses` se duoc chuyen sang `/org-admin/courses`
- sidebar `ORG_ADMIN` khong con lo menu he thong
- `/org-admin/courses` hien thi copy theo ngu canh to chuc va deep links dung portal moi
