# PWA / Offline Runbook

## Khi nao dung

- sau deploy lien quan toi service worker, IndexedDB, offline sync, course download
- khi learner bao "da tai course nhung offline sai noi dung"
- khi team can kiem tra stale package, refresh package, hoac sync queue

## Quy tac truoc khi test

- dung dung production origin `https://holilihu.online`
- neu vua deploy frontend/PWA, luon reset service worker truoc
- neu package dang la legacy hoac stale, khong lay package cu lam ket luan cuoi

## Reset service worker

1. mo `/reset-sw` hoac `/pwa-repair`
2. bam `Bat dau khoi phuc`
3. tai lai app theo nut tren man hinh
4. dang nhap lai neu can
5. mo lai trang can test

## Khi reset trong app khong du

1. mo `/clear-site-data`
2. lam theo huong dan xoa site data cua `holilihu.online` bang browser
3. mo lai LMS
4. dang nhap va tai lai khoa hoc neu can

## Smoke co ban cho offline

1. dang nhap learner
2. tai mot khoa hoc self-paced
3. xac nhan course xuat hien trong library/offline list
4. tat mang
5. mo lai lesson text da tai
6. neu course co internal video offline:
   - mo video
   - xac nhan player dung nguon local, khong crash
7. neu course co `PRACTICE` quiz:
   - mo quiz
   - lam bai
   - xac nhan queue sync tang khi dang offline

## Smoke policy bat buoc

### Quiz

- `PRACTICE`: duoc tai offline
- `ASSESSMENT`: khong duoc tai offline
- `EXAM`: khong duoc tai offline

Neu learner offline ma gap `ASSESSMENT` hoac `EXAM`, UI phai bao online-only ro rang.

### Video

- internal LMS video: co the offline neu package hop le
- YouTube/external: online-only

## Kiem tra package version

- package co `publicationId`
- package co `publicationNumber`
- package co `versionModeSnapshot`
- package co `staleReason` dung khi stale

Neu package khong co `publicationId`, coi la `LEGACY_PACKAGE` va yeu cau tai lai.

## Self-paced vs instructor-led

### Self-paced

- neu course co publication moi:
  - learner online thay content moi
  - package cu phai duoc mark `UPDATE_AVAILABLE`

### Instructor-led

- class dung `PINNED`
- course co publication moi nhung class chua adopt:
  - learner van thay content publication cu
  - package khong bi stale sai

## Khi sync bi loi

1. mo console, tim loi IndexedDB / service worker
2. kiem tra `/api/v3/sync/push`
3. kiem tra `/api/v3/sync/pull`
4. kiem tra `/api/v3/courses/versions`
5. doi chieu `publicationId` cua package voi publication hien tai

## Khi IndexedDB hoac bo nho offline bi hong

Neu learner gap log kieu:

- `UnknownError`
- `backing store for indexedDB.open`
- `Falling back to online-only mode`

thi dung runbook rieng:

- `OFFLINE_STORAGE_CORRUPTION_RUNBOOK.md`

## Khong duoc ket luan sai

- khong ket luan "offline sync hong" chi vi package dang la `LEGACY_PACKAGE`
- khong ket luan "course update khong vao app" khi class dang `PINNED`
- khong coi `ASSESSMENT`/`EXAM` khong tai offline la bug; do la policy
