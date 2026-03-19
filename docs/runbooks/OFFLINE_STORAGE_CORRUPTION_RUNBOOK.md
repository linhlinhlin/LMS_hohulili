# Offline Storage Corruption Runbook

## Khi nao dung

Dung runbook nay khi learner hoac QA gap cac dau hieu nhu:

- trang bao `Bo nho ngoai tuyen dang tam khong dung duoc`
- console co `UnknownError` hoac `Internal error opening backing store for indexedDB.open`
- app roi sang `online-only` du truoc do da tung tai khoa hoc offline

## Dau hieu nhan biet

- `Dexie: Workaround for Chrome UnknownError on open()`
- `IndexedDB open failed. Resetting offline cache database`
- `IndexedDB recreate on same name failed. Rotating database name`
- `Offline cache unavailable ... Falling back to online-only mode`

## Muc tieu xu ly

- giu learner hoc online duoc
- khoi phuc kha nang dung offline neu co the
- lay chan doan du ro cho QA / support / dev

## Quy trinh chuan

### 1. Kiem tra UI `/student/storage`

Quan sat xem co card nao sau day khong:

- `Bo nho ngoai tuyen dang tam khong dung duoc`
- `Bo nho ngoai tuyen da duoc tu khoi phuc`
- `Bo nho ngoai tuyen da duoc dat lai`

### 2. Sao chep chan doan truoc

Neu co card `Chan doan bo nho ngoai tuyen`:

1. bam `Sao chep chan doan`
2. luu lai payload cho QA hoac dev

Payload nay la client-side telemetry cuc bo, khong phu thuoc `IndexedDB`, nen van dung duoc ngay ca khi DB offline bi hong.

### 3. Thu reset ngay trong app

Tren `/student/storage`:

1. bam `Dat lai bo nho ngoai tuyen`
2. xac nhan dialog
3. quay lai danh sach khoa hoc
4. tai lai khoa hoc can dung offline

## Ky vong sau reset

- learner van hoc online binh thuong
- kho du lieu offline cuc bo duoc tao lai sach
- learner co the tai lai khoa hoc / video tu dau

## Khi nao can dung browser clear site data

Chi dung buoc nay neu:

- reset trong app van khong recover duoc
- card loi tiep tuc lap lai ngay sau reset
- QA can tra moi truong ve trang thai sach hoan toan

Thu tu khuyen nghi:

1. dong cac tab `holilihu.online`
2. mo `/clear-site-data` de xem checklist rut gon cho browser cleanup
3. clear site data bang giao dien browser
4. mo lai site
5. dang nhap
6. thu tai lai khoa hoc

## Khong nen lam

- khong huong learner tu vao thu muc profile de xoa le file
- khong ket luan day la loi backend
- khong yeu cau learner xoa toan bo browser profile neu chua thu reset trong app

## Bang chung nen gui cho dev

- payload tu nut `Sao chep chan doan`
- anh chup card loi tren `/student/storage`
- browser + version
- he dieu hanh
- learner dang dung route nao truoc khi loi xay ra
- learner co tung tu xoa du lieu browser hay khong

## Ket luan dieu tra

### Neu reset trong app recover duoc

- dong case nhu loi storage cuc bo phia client
- learner can tai lai khoa hoc offline

### Neu reset trong app khong recover duoc

- escalate cho dev voi payload chan doan
- can nhac clear site data o browser
- neu van lap lai, danh dau la browser/environment-specific bug can dao sau them
