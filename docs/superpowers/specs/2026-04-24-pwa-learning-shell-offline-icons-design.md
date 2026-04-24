# PWA Learning Shell Offline Icons Hardening

## Problem

Khi learner đã mở gói offline hoặc tắt mạng thiết bị, màn học vẫn phụ thuộc vào `Material Symbols` theo kiểu ligature text. Nếu font icon không được lấy lại từ cache, UI lộ nguyên văn `arrow_back`, `check_circle`, `article`, `folder_open` thay vì icon. Cùng lúc đó, một số máy vẫn thấy log debug `[PWA] Network Status` từ app shell cũ.

## Root Cause

1. Learning shell (`course-learning`, `lesson-content`) đang dùng font icon ligature ở đúng các surface quan trọng nhất khi offline.
2. Font icon là một dependency runtime riêng, nên khi shell/chunk còn chạy được nhưng asset font không sẵn sàng thì UI degrade theo cách rất lộ.
3. Log debug đã được bỏ khỏi source mới, nhưng browser đang giữ shell cũ vẫn có thể tiếp tục in log cho tới khi nhận bản app shell mới.

## Chosen Approach

Tách learning shell khỏi font icon bằng SVG nội bộ:

- Thay toàn bộ icon ligature ở `learning` surface bằng `app-icon` tự bundle.
- Bổ sung các glyph còn thiếu (`eye`, `more-vertical`, `circle`, `folder`, `paperclip`, `play-circle`, `file-check`, `help-circle`) ngay trong icon component nội bộ.
- Giữ nguyên logic PWA/offline hiện có; chỉ harden lớp hiển thị để offline không còn rơi về text thô.
- Verify thêm bằng targeted spec cho icon component và grep zero-occurrence với `material-symbols-outlined` trong feature `learning`.

## Why This Approach

- Không phụ thuộc font/network ở đường đi quan trọng.
- Scope gọn hơn việc thay toàn bộ hệ icon toàn app.
- Phù hợp với clean architecture frontend: fix đúng boundary presentation của feature `learning`.
- Shell mới sẽ tự cache-bust sau build/deploy, giúp các máy đang giữ bundle cũ thoát khỏi log debug sau refresh/update.

## Verification Plan

- Targeted unit test cho `IconComponent` với các glyph mới dùng trong learning shell.
- Search xác nhận feature `learning` không còn `material-symbols-outlined`.
- `npm run build` pass.
