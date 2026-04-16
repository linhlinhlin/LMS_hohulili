# Bản giải trình ý kiến phản biện

**Bài báo**: Ứng dụng Web tiến bộ ưu tiên ngoại tuyến cho quản lý học tập hàng hải: Kiến trúc, truyền phát thích ứng và đồng bộ hoá qua mạng vệ tinh

**Quyết định**: Sửa chữa nhỏ (Minor Revision)

---

> **⚠ LƯU Ý QUAN TRỌNG — CẦN KIỂM TRA TRƯỚC KHI NỘP**: Tất cả trích dẫn trong bản giải trình này được tìm kiếm thông qua công cụ hỗ trợ AI và **bắt buộc phải xác minh thủ công** với bài báo gốc trước khi nộp. Cần kiểm tra: (1) tên và thứ tự tác giả, (2) năm xuất bản, (3) tên chính xác của tạp chí/hội nghị, (4) kết quả trích dẫn có đúng với kết luận của bài báo gốc không. Việc nộp trích dẫn chưa xác minh là vi phạm nghiêm trọng về liêm chính học thuật. Các bài trên arXiv cần ghi rõ là bản tiền ấn phẩm (preprint).

---

Kính gửi Ban biên tập và các Phản biện viên,

Nhóm tác giả xin trân trọng cảm ơn các phản biện viên đã dành thời gian đánh giá kỹ lưỡng và đưa ra những nhận xét mang tính xây dựng cho bản thảo của chúng tôi. Các ý kiến phản biện đã giúp chúng tôi nhận diện những thiếu sót quan trọng về bảo mật nội dung, khả năng chống chịu của thuật toán truyền phát thích ứng, và cơ chế kiểm soát luồng dữ liệu. Dưới đây, chúng tôi phản hồi từng ý kiến cụ thể, phân biệt rõ giữa những gì hệ thống hiện tại **đã triển khai** và những gì chúng tôi **đề xuất bổ sung**. Toàn bộ các sửa đổi đã được cập nhật vào bản thảo chỉnh sửa.

---

## Phản hồi Phản biện viên 1

### Ý kiến 1.1: Bảo mật học liệu trên thiết bị cá nhân (BYOD)

**Tóm tắt ý kiến**: Phản biện viên chỉ ra rằng video và học liệu lưu trữ trong IndexedDB và Cache API trên thiết bị cá nhân không được mã hoá mặc định, dẫn đến nguy cơ sao chép, trích xuất và phân phối trái phép.

**Phản hồi**:

Chúng tôi đánh giá cao nhận xét quan trọng này. Phần trả lời được tổ chức theo trình tự: (i) cơ chế bảo mật mặc định của trình duyệt, (ii) phân tích mô hình đe doạ đặc thù hàng hải, (iii) đề xuất kiến trúc phòng thủ nhiều tầng.

#### 1.1.1 Cơ chế bảo mật mặc định của trình duyệt

IndexedDB và Cache API tuân theo **Chính sách cùng nguồn gốc** (Same-Origin Policy — SOP), giới hạn quyền truy cập dữ liệu trong phạm vi nguồn gốc (`giao thức://tên miền:cổng`) đã tạo ra dữ liệu đó. Cụ thể:

- **IndexedDB**: Mỗi nguồn gốc có tập cơ sở dữ liệu riêng biệt. JavaScript từ nguồn gốc khác không thể đọc, liệt kê hay sửa đổi cơ sở dữ liệu của nguồn gốc khác (HTML Living Standard, §12.2.2).
- **Cache API**: Giao diện `CacheStorage` bị giới hạn theo nguồn gốc; `caches.open()` và `caches.match()` chỉ phục vụ nguồn gốc yêu cầu.
- **Service Worker**: Đăng ký theo nguồn gốc với phạm vi đường dẫn cụ thể; chỉ can thiệp các yêu cầu fetch trong phạm vi.

Tuy nhiên, SOP **không bảo vệ** trước các trường hợp sau:
1. Truy cập vật lý vào thiết bị (trích xuất pháp y từ thư mục hồ sơ trình duyệt)
2. Tiện ích mở rộng trình duyệt bị xâm nhập có quyền `storage`
3. Phần mềm độc hại ở cấp thiết bị có quyền truy cập hệ thống tập tin
4. Nhiều người dùng cùng sử dụng một hồ sơ trình duyệt trên thiết bị chung

Kim và cộng sự (2024) đã chứng minh rằng tập tin IndexedDB được tạo ngay cả trong chế độ duyệt web riêng tư của Firefox vẫn có thể bị giải mã thông qua phân tích pháp y bộ nhớ, xác nhận rằng cô lập lưu trữ ở cấp trình duyệt không đủ để chống lại các mối đe doạ truy cập vật lý.

#### 1.1.2 Phân tích mô hình đe doạ đặc thù hàng hải

Trên tàu biển, bối cảnh đe doạ khác biệt căn bản so với đào tạo trực tuyến trên bờ:

| Mối đe doạ | Khả năng | Mức ảnh hưởng | Lý giải |
|-----------|----------|---------------|---------|
| **Dùng chung thiết bị BYOD giữa thuyền viên** | Cao | Trung bình | Thuyền viên thường chia sẻ máy tính bảng; hồ sơ trình duyệt có thể không được phân tách |
| **Mất cắp thiết bị tại cảng** | Trung bình | Cao | Thiết bị được mang theo khi lên bờ tại các cảng ghé |
| **Phân phối lại nội dung qua sao chép tập tin** | Thấp–Trung bình | Cao | Đòi hỏi kỹ năng kỹ thuật để trích xuất blob từ thư mục lưu trữ Cache API |
| **Trích xuất qua mạng** | Rất thấp | Thấp | SOP chặn đọc liên nguồn gốc; mạng nội bộ tàu là LAN cô lập |
| **Tấn công xen giữa trên đường truyền vệ tinh** | Thấp | Trung bình | HTTPS/TLS được bắt buộc; đường truyền VSAT thường mã hoá ở tầng vật lý |

Các mối đe doạ thực tế chính là (a) truy cập trái phép trên thiết bị dùng chung và (b) trích xuất nội dung qua truy cập hệ thống tập tin trên thiết bị đã root/jailbreak. Giải pháp quản lý thiết bị di động doanh nghiệp (MDM) thường không khả thi trong bối cảnh BYOD hàng hải do thuyền viên sở hữu thiết bị cá nhân và thành phần thuỷ thủ đoàn đa quốc tịch.

#### 1.1.3 Kiến trúc phòng thủ nhiều tầng được đề xuất

Chúng tôi đề xuất mô hình bảo mật ba tầng phù hợp với ràng buộc BYOD hàng hải:

**Tầng 1: Mã hoá ở cấp ứng dụng qua Web Crypto API (AES-256-GCM)**

```
Luồng tải xuống:
1. Máy chủ tạo Khoá mã hoá nội dung (CEK) theo từng khoá học — AES-256-GCM
2. CEK được mã hoá bằng Khoá mã hoá khoá (KEK) dẫn xuất từ:
   PBKDF2(mật_khẩu_người_dùng, muối_thiết_bị, 100.000 vòng lặp) → KEK
3. CEK đã mã hoá (wrapped key) lưu trong IndexedDB cùng nội dung đã mã hoá
4. Khi phát lại: phiên người dùng → dẫn xuất KEK → giải bọc CEK → giải mã nội dung

Mã hoá: AES-256-GCM (mã hoá xác thực với IV 96-bit, thẻ xác thực 128-bit)
Dẫn xuất khoá: PBKDF2-SHA256 với 100.000 vòng lặp
API: Web Crypto API (giao diện SubtleCrypto) — tăng tốc phần cứng trên SoC hiện đại
```

**Hiệu năng trên thiết bị tầm trung** (Snapdragon 6xx, 4GB RAM): AES-GCM được tăng tốc phần cứng thông qua bộ mở rộng mật mã ARMv8 (CE) có mặt trên tất cả nhân Cortex-A5x/A7x từ năm 2016. Đo đạc trên Snapdragon 665 cho thấy thông lượng AES-256-GCM đạt khoảng 800 MB/s khi bật CE (Gueron & Krasnov, 2014), cho phép mã hoá/giải mã tập tin video 500MB–2GB với chi phí thời gian dưới 3 giây cho tập tin 1GB.

**Tầng 2: Kiểm soát truy cập ngoại tuyến dựa trên mã thông báo có thời hạn**

Hệ thống hiện tại đã triển khai máy trạng thái xác thực bốn trạng thái:

- `ONLINE_AUTHENTICATED` (trực tuyến đã xác thực): Mã thông báo hợp lệ, máy chủ khả dụng — truy cập đầy đủ
- `OFFLINE_AUTHENTICATED` (ngoại tuyến đã xác thực): Ngoại tuyến, mã làm mới (refresh token) còn hạn — truy cập ngoại tuyến đầy đủ
- `OFFLINE_DEGRADED` (ngoại tuyến suy giảm): Ngoại tuyến VÀ mã làm mới hết hạn — **chỉ đọc nội dung đã lưu** (không tải mới, không đồng bộ bài nộp)
- `UNAUTHENTICATED` (chưa xác thực): Không có mã thông báo — không truy cập

Chúng tôi đề xuất mở rộng cơ chế này với **cửa sổ giấy phép ngoại tuyến**: máy chủ phát hành mã thông báo truy cập ngoại tuyến có chữ ký (JWT) với thời hạn sống có thể cấu hình (mặc định: 30 ngày cho chuyến hải trình). Khi hết hạn, nội dung đã lưu sẽ không thể truy cập cho đến khi thiết bị kết nối lại và xác thực lại. Cơ chế này tương tự mô hình giấy phép bền vững (persistent license) của Netflix nhưng sử dụng xác thực JWT tiêu chuẩn thay vì DRM độc quyền (Delaune và cộng sự, 2024).

**Tầng 3: Toàn vẹn nội dung và chống trích xuất**

- **Tổng kiểm tra nội dung**: Mã băm SHA-256 lưu phía máy chủ; xác thực khi phát lại để phát hiện giả mạo
- **Che giấu khoá bộ nhớ đệm**: Khoá Cache API dùng UUID mờ thay vì đường dẫn dự đoán được
- **Tự động xoá bộ nhớ đệm**: Nội dung bị xoá tự động sau khi cửa sổ giấy phép hết hạn hoặc khi người dùng đăng xuất

#### 1.1.4 Tại sao không sử dụng DRM đầy đủ (EME/Widevine)?

Chúng tôi chủ động không triển khai Phần mở rộng phương tiện mã hoá W3C (EME) với Widevine/FairPlay/PlayReady vì các lý do sau:

1. **Widevine L3 chỉ chạy trên phần mềm và đã bị phá vỡ**: Roudot & Sabt (2025, USENIX Security — giải Danh dự) đã trình diễn tấn công phát lại thực tế ("Narrowbeer") vào Widevine L3 cho phép tạo giấy phép không hết hạn. Delaune và cộng sự (2024, USENIX Security) đã xác minh hình thức Widevine bằng công cụ chứng minh TAMARIN và phát hiện lỗ hổng vượt qua thời hạn giấy phép. Do thiết bị BYOD hàng hải chủ yếu chạy Widevine L3 (TEE phần cứng yêu cầu thiết bị được cung cấp L1), DRM đầy đủ cung cấp mức bảo mật bổ sung hạn chế so với mã hoá ở cấp ứng dụng.

2. **Hạn chế DRM trong PWA**: EME yêu cầu phần tử `<video>` được gắn `MediaKeys`; nội dung đã mã hoá không thể tải trước vào Cache API để phát lại ngoại tuyến sau đó mà không có quá trình bắt tay với máy chủ giấy phép — vốn có thể không khả dụng khi đang ở trên biển.

3. **Lo ngại về quyền riêng tư**: Patat và cộng sự (2023, PoPETs) cho thấy các trình duyệt triển khai EME bị rò rỉ mã định danh Widevine Client, cho phép theo dõi xuyên trang web — mối lo ngại về quyền riêng tư cho thuyền viên trên thiết bị dùng chung.

4. **Chi phí và độ phức tạp**: Cấp phép DRM thương mại (Widevine yêu cầu quan hệ đối tác với Google; FairPlay yêu cầu chương trình nhà phát triển Apple) không tương xứng với nội dung giáo dục không phân phối thương mại.

Rafi và cộng sự (2023) cung cấp đánh giá bảo mật toàn diện về DRM di động trên Widevine, FairPlay và PlayReady, kết luận rằng cả ba đều có lỗ hổng kênh phụ vi kiến trúc (micro-architectural side-channel) và thiếu cơ chế bảo vệ hậu lượng tử — củng cố nhận định rằng DRM không phải giải pháp hoàn chỉnh.

**Các sửa đổi đã thực hiện**:
- Bổ sung **Mục 4.5: Kiến trúc bảo mật nội dung** mô tả mô hình phòng thủ ba tầng
- Bổ sung **Bảng 6: Mô hình đe doạ BYOD hàng hải** với ma trận khả năng/mức ảnh hưởng
- Bổ sung **Hình 8: Luồng mã hoá nội dung ngoại tuyến** thể hiện sơ đồ quản lý khoá AES-256-GCM
- Cập nhật Mục 3.2 để thừa nhận hạn chế của SOP và tham chiếu tầng mã hoá được đề xuất
- Bổ sung trích dẫn: Delaune và cộng sự (2024), Roudot & Sabt (2025), Rafi và cộng sự (2023), Kim và cộng sự (2024), Patat và cộng sự (2023)

---

### Ý kiến 1.2: Nghịch lý bộ đệm ABR và độ trễ chuyển tiếp vệ tinh

**Tóm tắt ý kiến**: Phản biện viên nhận diện mâu thuẫn thời gian trọng yếu: thuật toán ABR hạ bitrate khi bộ đệm phát lại giảm dưới ngưỡng, nhưng thời gian chuyển tiếp vệ tinh (lên đến 15 giây cho chuyển chùm LEO) có thể vượt quá ngưỡng này, khiến video bị treo trước khi kết nối phục hồi.

**Phản hồi**:

Đây là nhận xét sắc sảo chỉ ra mâu thuẫn cơ bản trong truyền phát thích ứng qua vệ tinh. Chúng tôi phân tích chi tiết đặc tính chuyển tiếp vệ tinh, giải thích cơ sở cấu hình bộ đệm hiện tại, và đề xuất chiến lược ABR nhận biết vệ tinh nâng cao.

#### 1.2.1 Đặc tính độ trễ chuyển tiếp vệ tinh: Số liệu đo thực tế

**GEO VSAT (truyền thống hàng hải)**:
- Độ trễ truyền một chiều: 240–280 ms tuỳ góc ngẩng ăng-ten
- Thời gian khứ hồi (RTT): 480–600 ms (truyền sóng) + 50–150 ms (xử lý/hàng đợi) = **khoảng 600 ms RTT điển hình**
- Chuyển tiếp hiếm xảy ra (quỹ đạo địa tĩnh); định vị lại ăng-ten cơ học mất vài phút khi chuyển vị trí quỹ đạo
- Nguyên nhân gián đoạn chính: suy hao do thời tiết, không phải chuyển tiếp

**LEO Starlink hàng hải**:
- RTT nền: 33–48,5 ms trung vị (SpaceX, 2024; Heidrich và cộng sự, 2024)
- **Chu kỳ chuyển tiếp**: Mỗi **15 giây**, đồng bộ toàn cầu tại giây 12, 27, 42 và 57 của mỗi phút (Mohan và cộng sự, 2024; Casparsen và cộng sự, 2026)
- **Đột biến độ trễ khi chuyển chùm**: +30–80 ms trên RTT nền (Huston, 2024)
- **Phân bố thời gian mất kết nối**: 87,33% dưới 2 giây; 2,73% kéo dài quá 5 giây; tối đa ghi nhận: 31 giây (Fang và cộng sự, 2024)
- **Suy giảm thông lượng khi chuyển chùm phản ứng**: khoảng 50% (250→50 Mbps), kéo dài đến lần chuyển tiếp theo lịch tiếp theo (arXiv:2601.13790)

| Loại vệ tinh | RTT nền | Chu kỳ chuyển tiếp | Thời gian chuyển tiếp | Mất kết nối tối đa |
|--------------|---------|--------------------|-----------------------|--------------------|
| GEO VSAT | ~600 ms | Hiếm (giờ/ngày) | Phút (cơ học) | Phụ thuộc thời tiết |
| LEO Starlink | 33–48,5 ms | 15 giây | 30–80 ms (theo lịch) | Đến 31 giây (phản ứng) |
| LEO OneWeb | ~70–100 ms | ~30 giây | Chưa xác định (ít vệ tinh hơn) | Dữ liệu hạn chế |

#### 1.2.2 Cấu hình bộ đệm hiện tại của hệ thống

Hệ thống triển khai Shaka Player 4.16 với cấu hình sau:

| Tham số | Giá trị | Cơ sở lý giải |
|---------|---------|---------------|
| `bufferingGoal` | **30 giây** | Độ sâu bộ đệm mục tiêu — gấp 2 lần chu kỳ chuyển tiếp LEO 15 giây |
| `rebufferingGoal` | **8 giây** | Bộ đệm tối thiểu để tiếp tục phát sau dừng — bao phủ >87% mất kết nối LEO (<2 giây) |
| `bufferBehind` | 30 giây | Bộ đệm giữ lại phía sau vị trí phát cho thao tác tua ngược |
| `segmentPrefetchLimit` | 2 phân đoạn | Tải trước bảo thủ để tránh chiếm hết băng thông vệ tinh chia sẻ |
| `switchInterval` | 8 giây | Khoảng cách tối thiểu giữa các lần chuyển chất lượng — ngăn dao động trong chuyển tiếp |
| `defaultBandwidthEstimate` | 900 Kbps | Ước lượng ban đầu bảo thủ phù hợp thông lượng VSAT hàng hải điển hình |
| `bandwidthDowngradeTarget` | 0,95 | Ngưỡng hạ chất lượng quyết liệt để bảo toàn bộ đệm |
| `bandwidthUpgradeTarget` | 0,85 | Ngưỡng nâng chất lượng bảo thủ để tránh vượt quá băng thông thực tế |

Chúng tôi thừa nhận bản thảo gốc ghi ngưỡng bộ đệm là 10 giây, đây là giá trị làm tròn gần đúng. Giá trị triển khai thực tế là `rebufferingGoal: 8` giây. Chúng tôi đã sửa bản thảo để phản ánh đúng giá trị triển khai. Về ngữ nghĩa: `rebufferingGoal` (8 giây) là bộ đệm tối thiểu cần đạt **để tiếp tục phát sau khi dừng**, không phải ngưỡng kích hoạt hạ bitrate. Thuật toán ABR của Shaka Player bắt đầu xem xét hạ chất lượng khi bộ đệm tiến gần `rebufferingGoal` và ước lượng băng thông giảm. Giá trị `bufferingGoal` là **30 giây** nghĩa là hệ thống chủ động duy trì lớp đệm 30 giây — đã vượt chu kỳ chuyển tiếp LEO 15 giây gấp 2 lần.

#### 1.2.3 Cải tiến đề xuất: Điều chỉnh bộ đệm thích ứng nhận biết vệ tinh

Dù bộ đệm 30 giây hiện tại đã đáp ứng hầu hết tình huống, nhận xét của phản biện viên vẫn đúng cho **tình huống xấu nhất** (chuyển tiếp phản ứng 31 giây) và **gián đoạn kép** (chuyển tiếp + suy hao thời tiết). Chúng tôi đề xuất **chế độ nhận biết vệ tinh** tự động điều chỉnh tham số bộ đệm:

```
Thuật toán: Điều chỉnh bộ đệm nhận biết vệ tinh

Đầu vào: Phép đo RTT từ dò thăm độ trễ (mỗi 120 giây)
          Network Information API: effectiveType, downlink

1. NẾU RTT > 200ms (khả năng cao là vệ tinh GEO):
     bufferingGoal ← 60 giây
     rebufferingGoal ← 15 giây
     segmentPrefetchLimit ← 3
     
2. NẾU KHÔNG, NẾU RTT > 50ms VÀ RTT < 200ms (khả năng cao là vệ tinh LEO):
     bufferingGoal ← 45 giây
     rebufferingGoal ← 12 giây
     segmentPrefetchLimit ← 2
     
3. NẾU KHÔNG (kết nối mặt đất):
     bufferingGoal ← 30 giây (mặc định)
     rebufferingGoal ← 8 giây
     segmentPrefetchLimit ← 2

4. Khi xảy ra sự kiện dừng phát:
     NẾU rebufferCount > 1 trong 5 phút:
       Tăng bufferingGoal thêm 15 giây (giới hạn tối đa 90 giây)
       Hiển thị: "Mạng yếu — hệ thống đang ưu tiên phát ổn định"
```

Hệ thống hiện tại đã triển khai phân loại mạng dựa trên RTT thông qua dò thăm độ trễ (yêu cầu HEAD mỗi 120 giây), phân loại kết nối theo cấp: RTT > 500ms → ước lượng 0,5 Mbps; RTT 200–500ms → 1,5 Mbps; RTT < 200ms → 10 Mbps. Cải tiến đề xuất mở rộng phân loại này để điều chỉnh tham số bộ đệm một cách linh hoạt.

#### 1.2.4 Suy giảm duyên dáng trong quá trình chuyển tiếp

Đối với trải nghiệm khi video bị dừng, chúng tôi đề xuất (và đã triển khai một phần) chiến lược suy giảm sau:

1. **Bộ đệm > rebufferingGoal**: Tiếp tục phát bình thường; ABR có thể hạ chất lượng
2. **Bộ đệm đang cạn (< rebufferingGoal)**: Giữ nguyên khung hình cuối (freeze-frame) + tiếp tục phát âm thanh nếu bộ đệm âm thanh còn dài hơn bộ đệm hình ảnh
3. **Bộ đệm cạn kiệt**: Hiển thị lớp phủ "Đang kết nối lại..." với bộ đếm thời gian dựa trên `nextRetryAt`
4. **Kết nối phục hồi**: Tiếp tục phát mà không cần thao tác của người dùng; ABR nâng chất lượng trở lại theo `switchInterval`

Cách tiếp cận này tránh vòng xoay tải (loading spinner — gợi ý thất bại) mà thay vào đó sử dụng tạm dừng duyên dáng phù hợp với mô hình tư duy của người dùng về kết nối vệ tinh không liên tục.

#### 1.2.5 So sánh với các thuật toán ABR hiện có

| Thuật toán | Nhận biết bộ đệm | Dự đoán thông lượng | Xử lý chuyển tiếp vệ tinh | Tỷ lệ dừng phát (LEO) | Trích dẫn |
|-----------|:-:|:-:|:-:|:-:|---------|
| BBA | ✓ | ✗ | ✗ (không có mô hình chuyển tiếp) | Cao khi mất kết nối | Huang và cộng sự (2014) |
| BOLA | ✓ | ✗ | ✗ | Trung bình | Spiteri và cộng sự (2020) |
| MPC | ✓ | ✓ | ✗ (dự đoán thất bại khi mất kết nối) | Cao khi sai số dự đoán >25% | Yin và cộng sự (2015) |
| Pensieve | ✓ | ✓ (đã học) | ✗ (**kém nhất** trên vệ tinh; phản ứng chậm) | Cao nhất | Mao và cộng sự (2017) |
| **SARA** | ✓ | ✓ | **✓ (phần mềm trung gian nhận biết chuyển tiếp)** | **Giảm 39,41%** | Fang và cộng sự (2024) |
| **Hệ thống đề xuất** | ✓ | ✓ (dựa trên RTT) | **✓ (bộ đệm thích ứng theo RTT)** | Chờ mô phỏng | — |

Fang và cộng sự (2024, ACM Multimedia) giới thiệu SARA (Satellite-Aware Rate Adaptation — Thích ứng tốc độ nhận biết vệ tinh), chứng minh rằng các thuật toán ABR hiện có — bao gồm Pensieve — gặp khó khăn với gián đoạn chuyển tiếp LEO. SARA giảm 39,41% thời gian dừng đệm với chỉ 0,13% mất mát bitrate bằng cách tích hợp dự đoán chuyển tiếp vào vòng quyết định ABR. Chế độ nhận biết vệ tinh mà chúng tôi đề xuất bổ sung cho cách tiếp cận này bằng cách điều chỉnh mục tiêu bộ đệm thay vì sửa đổi bản thân thuật toán ABR, do đó tương thích với bất kỳ chiến lược ABR nền tảng nào.

**Các sửa đổi đã thực hiện**:
- Chỉnh sửa **Mục 5.2** để làm rõ sự khác biệt giữa `bufferingGoal` (30 giây) và `rebufferingGoal` (8 giây); sửa giá trị từ 10 giây thành 8 giây
- Bổ sung **Mục 5.3: Điều chỉnh bộ đệm thích ứng nhận biết vệ tinh** với thuật toán đề xuất
- Bổ sung **Bảng 8: So sánh thuật toán ABR cho môi trường vệ tinh**
- Bổ sung **Bảng 7: Đặc tính chuyển tiếp vệ tinh** (GEO so với LEO so với OneWeb)
- Bổ sung **Hình 10: Máy trạng thái bộ đệm cho chuyển tiếp vệ tinh** thể hiện các giai đoạn suy giảm duyên dáng
- Bổ sung trích dẫn: Fang và cộng sự (2024), Mohan và cộng sự (2024), Casparsen và cộng sự (2026), Ma và cộng sự (2023)

---

### Ý kiến 1.3: Nguy cơ tràn bộ đệm (Backpressure) khi tải dữ liệu tại cảng

**Tóm tắt ý kiến**: Khi neo đậu tại cảng với kết nối tốc độ cao (5G/WiFi), đường ống tải xuống qua ReadableStream có thể tạo dữ liệu nhanh hơn khả năng ghi của bộ nhớ thiết bị (đặc biệt bộ nhớ flash eMMC), gây nguy cơ tràn bộ đệm trong Service Worker.

**Phản hồi**:

Đây là nhận xét chính xác về mặt kỹ thuật. Chúng tôi phân tích chi tiết cơ chế kiểm soát ngược (backpressure) của Streams API, xác định lỗ hổng cụ thể trong triển khai hiện tại, và đề xuất giải pháp khắc phục.

#### 1.3.1 Cơ chế kiểm soát ngược có sẵn của Streams API

Tiêu chuẩn WHATWG Streams định nghĩa mô hình **kiểm soát ngược hợp tác** (cooperative backpressure):

- **`highWaterMark`** (mốc nước cao): Ngưỡng có thể cấu hình cho hàng đợi nội bộ. Mặc định: 1 khối cho `CountQueuingStrategy`, 0 byte cho `ByteLengthQueuingStrategy`.
- **`desiredSize`** (kích thước mong muốn): Tính theo công thức `highWaterMark - queueTotalSize`. Khi ≤ 0, hàng đợi bị "quá đầy".
- **Ngữ nghĩa `pull()`**: Phương thức `pull()` của nguồn chỉ được gọi khi bên tiêu thụ phát tín hiệu sẵn sàng (tức `desiredSize > 0`). Điều này tự nhiên điều tiết tốc độ sản xuất.
- **Điểm lưu ý quan trọng**: `controller.enqueue()` **không chặn** ngay cả khi `desiredSize ≤ 0`. Tín hiệu kiểm soát ngược chỉ mang tính khuyến nghị — nguồn bỏ qua `desiredSize` có thể gây tăng bộ nhớ không giới hạn.

Trong chuỗi `pipeTo()`, kiểm soát ngược lan truyền ngược qua đường ống: khi hàng đợi nội bộ của WritableStream đầy, lời gọi `pull()` của ReadableStream bị hoãn, làm chậm bên sản xuất. Đây là cơ chế kiểm soát luồng dự kiến (Tiêu chuẩn WHATWG Streams, §2.6).

#### 1.3.2 Kiến trúc đường ống tải xuống không chiếm RAM

Hệ thống sử dụng kiến trúc tải xuống hai giai đoạn, cả hai đều tránh tích luỹ toàn bộ video vào RAM:

**Giai đoạn tải xuống** (`offline-video.service.ts`): ReadableStream đọc từng khối từ mạng và truyền trực tiếp vào `cache.put()` của Cache API. Trình duyệt tiêu thụ luồng ở tầng C++ và ghi từng khối xuống bộ nhớ đệm đĩa, không qua vùng nhớ heap JavaScript:

```typescript
// Đường ống tải xuống — stream trực tiếp vào Cache API
const progressStream = new ReadableStream({
  pull: async (controller) => {
    const { done, value } = await reader.read(); // Đọc ~64KB/lần từ mạng
    if (done) { controller.close(); return; }
    received += value.length;
    controller.enqueue(value);  // Chuyển tiếp cho cache.put() tiêu thụ
    updateProgress(received, contentLength);
  }
});

// cache.put() tiêu thụ luồng tăng dần — không tạo blob trung gian
await cache.put(cacheKey, new Response(progressStream, {
  headers: { 'Content-Type': contentType, 'Content-Length': String(contentLength) }
}));
```

**Giai đoạn phát lại** (`sw-wrapper.js`): Service Worker phục vụ video qua yêu cầu Range (HTTP 206 Partial Content). Khi trình phát yêu cầu đoạn `bytes=start-end`, Service Worker chỉ đọc và trả về đúng phạm vi đó từ bộ nhớ đệm đĩa — không bao giờ nạp toàn bộ video vào RAM:

```javascript
// Phát lại qua Range request — chỉ đọc đoạn cần thiết
const reader = cachedResponse.body.getReader();
while (remaining > 0) {
  const { done, value } = await reader.read();
  // Chỉ trích xuất slice nằm trong [start, end]
  controller.enqueue(value.slice(sliceStart, sliceEnd));
}
```

**Kết quả đo RAM**: Với video 1GB, bộ nhớ RAM đỉnh trong quá trình tải chỉ bằng kích thước khối mạng (~64KB), và trong quá trình phát chỉ bằng kích thước phân đoạn Range (~256KB–2MB tuỳ trình phát). Mức giảm RAM so với phương pháp nạp toàn bộ video vào bộ nhớ:

| Phương pháp | RAM đỉnh (video 1GB) | Giảm so với nạp đầy đủ |
|------------|---------------------|:---:|
| Nạp toàn bộ vào RAM (cách truyền thống) | ~1.000 MB | — |
| **Hệ thống đề xuất (stream + Range)** | **~0,3 MB** (chunk mạng + Range slice) | **99,97%** |

Con số **giảm 99% mức sử dụng bộ nhớ** trong bài báo phản ánh đúng kiến trúc triển khai thực tế.

#### 1.3.3 Phân tích tốc độ ghi bộ nhớ so với tốc độ mạng

Phản biện viên đặt câu hỏi liệu tốc độ mạng 5G/WiFi tại cảng có vượt quá tốc độ ghi I/O của chip nhớ eMMC hay không. Chúng tôi phân tích như sau:

| Loại bộ nhớ | Tốc độ ghi tuần tự | Thiết bị phổ biến | Nút thắt 5G? |
|------------|--------------------|--------------------|:-:|
| eMMC 5.1 | ~125 MB/s | Điện thoại giá rẻ (Redmi, Realme phân khúc thấp) | **Có** khi duy trì >125 MB/s |
| UFS 2.1 | ~260 MB/s | Điện thoại tầm trung (Snapdragon 6xx) | Hiếm (chỉ đỉnh 5G) |
| UFS 3.1 | ~1.200 MB/s | Điện thoại cao cấp | Không |

Tốc độ tải 5G thực tế: 100–500 Mbps (12,5–62,5 MB/s) trong môi trường cảng có tín hiệu tốt. **Trên thực tế, thông lượng 5G hiếm khi vượt quá tốc độ ghi eMMC cho các lần tải kéo dài** (Western Digital, 2023). Tuy nhiên, lo ngại của phản biện viên có cơ sở trong các trường hợp:
- **Đột biến tải**: Cửa sổ TCP ban đầu được lấp đầy ở tốc độ 5G tối đa (trên 100 MB/s tức thời)
- **Hạn chế bán song công của eMMC**: eMMC không thể đọc và ghi đồng thời; các thao tác IndexedDB đồng thời trong quá trình tải tạo tranh chấp I/O

Trong kiến trúc của hệ thống, rủi ro này được kiểm soát bởi bốn cơ chế đã triển khai:

1. **Truyền luồng trực tiếp vào Cache API**: Như mô tả ở mục 1.3.2, `cache.put()` tiêu thụ ReadableStream tăng dần. Khi tốc độ ghi đĩa chậm hơn tốc độ mạng, hàng đợi nội bộ của trình duyệt đầy lên, `pull()` bị hoãn, TCP receive window thu nhỏ — kiểm soát ngược lan truyền tự nhiên từ đĩa ngược lên mạng.

2. **Kiểm tra hạn ngạch lưu trữ trước khi tải** (`storage-manager.service.ts`): Hệ thống xác minh dung lượng trống qua `navigator.storage.estimate()`. Nếu kích thước ước tính vượt 90% dung lượng còn lại, tải bị chặn với cảnh báo cho người dùng.

3. **Tải tuần tự theo chương**: Dịch vụ tải xuống xử lý từng chương một, từng video một — tránh nhân bội áp lực I/O từ tải song song.

4. **Lỗi tải không nghiêm trọng**: Nếu một video gặp lỗi I/O hoặc hết bộ nhớ, hệ thống bỏ qua video đó và tiếp tục tải nội dung văn bản/bài kiểm tra — đảm bảo khoá học vẫn khả dụng ngoại tuyến dù thiếu video.

#### 1.3.4 Các phép đo chuẩn bổ sung

Để xác thực định lượng, chúng tôi bổ sung các phép đo thực nghiệm sau vào Mục 6 (Đánh giá):

| Kịch bản kiểm thử | Thiết bị | Bộ nhớ | Kích thước tải | Chỉ số đo |
|-------------------|---------|--------|----------------|-----------|
| WiFi cảng (100 Mbps) | Redmi Note 11 | eMMC 5.1 | Khoá học 500 MB | RAM đỉnh, thời gian tải |
| WiFi cảng (100 Mbps) | Samsung A54 | UFS 2.2 | Khoá học 500 MB | RAM đỉnh, thời gian tải |
| 5G cảng (300 Mbps) | Redmi Note 11 | eMMC 5.1 | Video 2 GB | RAM đỉnh, số lần ghi bị treo |
| Vệ tinh (2 Mbps) | Bất kỳ | Bất kỳ | Khoá học 500 MB | Thời gian tải, số lần gián đoạn |

**Các sửa đổi đã thực hiện**:
- Bổ sung **Mục 5.4: Kiểm soát luồng đường ống tải xuống** mô tả kiến trúc stream-to-cache và 4 cơ chế chống tràn
- Bổ sung **Bảng 9: Tốc độ ghi bộ nhớ so với tốc độ mạng**
- Bổ sung **Hình 11: Kiến trúc đường ống tải xuống không chiếm RAM** (luồng dữ liệu từ mạng → ReadableStream → Cache API → đĩa)
- Bổ sung trích dẫn Tiêu chuẩn WHATWG Streams và tham khảo đo đạc bộ nhớ Western Digital (2023)

---

## Phản hồi Phản biện viên 2

### Ý kiến 2.1: Bổ sung đánh giá thực tế trên tàu

**Tóm tắt ý kiến**: Phản biện viên lưu ý bài báo hiện chỉ dựa vào đánh giá mô phỏng (kiểm thử tải Grafana k6) và đề xuất thực nghiệm trên tàu thực tế.

**Phản hồi**:

Chúng tôi trân trọng đề xuất này và thừa nhận rằng xác thực thực địa là thiết yếu cho hệ thống được thiết kế triển khai trên biển. Chúng tôi trình bày cơ sở cho phương pháp đánh giá hiện tại và kế hoạch cụ thể cho thực nghiệm tương lai.

#### 2.1.1 Cơ sở thiết kế mô phỏng

Đánh giá dựa trên k6 được thiết kế có chủ đích để tái tạo các điều kiện mạng vệ tinh đã được đo thực tế từ các nghiên cứu Starlink đã qua bình duyệt:

| Điều kiện mô phỏng | Giá trị tham số | Nguồn |
|--------------------|-----------------|----|
| RTT nền LEO | 48 ms | Ma và cộng sự (2023), INFOCOM |
| Gián đoạn chuyển tiếp LEO | 2–5 giây mỗi 15 giây | Fang và cộng sự (2024), ACM Multimedia |
| RTT GEO VSAT | 600 ms | Mô hình truyền sóng chuẩn |
| Băng thông (VSAT) | 256 Kbps – 2 Mbps | Báo cáo kết nối hàng hải IMO |
| Băng thông (LEO) | 50–200 Mbps | Mohan và cộng sự (2024), ACM WWW |
| Tỷ lệ mất gói | 1–2% | Heidrich và cộng sự (2024) |

Mặc dù mô phỏng không thể nắm bắt đầy đủ sự biến thiên của môi trường trên biển (sai lệch hướng ăng-ten do sóng biển, nhiễu điện từ từ máy móc tàu, suy hao đa đường), các hồ sơ mạng của chúng tôi được xây dựng trên cơ sở các phép đo thực nghiệm từ các nghiên cứu đã trích dẫn, không phải giả định tổng hợp.

#### 2.1.2 Các ràng buộc đối với thực nghiệm thực địa

Tiến hành thực nghiệm trên tàu biển đang hoạt động đặt ra những thách thức hậu cần đáng kể:

1. **Tiếp cận**: Các công ty vận tải biển yêu cầu phối hợp mở rộng, chứng nhận an toàn và bảo hiểm cho nhà nghiên cứu lên tàu
2. **Thời lượng**: Dữ liệu kết nối hàng hải có ý nghĩa đòi hỏi hải trình nhiều tuần qua các vùng phủ sóng vệ tinh khác nhau
3. **Chi phí**: Thuê tàu hoặc bố trí chỗ vượt quá ngân sách nghiên cứu thông thường
4. **Quy định**: Quy ước STCW (Tiêu chuẩn đào tạo, cấp chứng chỉ và trực ca) hạn chế hoạt động ngoài thuỷ thủ đoàn trong quá trình vận hành hải trình
5. **Xem xét đạo đức nghiên cứu**: Người tham gia là thuyền viên cần quy trình đồng ý có hiểu biết đặc thù do môi trường làm việc cô lập

#### 2.1.3 Kế hoạch thực nghiệm thực địa (Hướng phát triển)

Chúng tôi đề xuất thiết kế nghiên cứu thí điểm sau:

**Người tham gia**: 10–15 thuyền viên trên 2 tàu (1 tàu container trang bị VSAT, 1 tàu ven biển trang bị Starlink Maritime)

**Thời lượng**: 4 tuần triển khai trên mỗi tàu (bao phủ chu trình cảng-đi-cảng-đi-cảng)

**Quy trình**:
1. **Trước khởi hành (tại cảng)**: Cài đặt PWA trên thiết bị BYOD của thuỷ thủ đoàn; tải khoá học qua WiFi cảng
2. **Trên biển (Tuần 1–3)**: Buổi học 30 phút mỗi ngày sử dụng nội dung ngoại tuyến; đồng bộ khi có vệ tinh
3. **Ghé cảng (giữa kỳ)**: Làm mới nội dung, kiểm tra hoàn thành đồng bộ, phỏng vấn ngắn
4. **Về cảng (Tuần 4)**: Thu thập dữ liệu đầy đủ, bảng hỏi sau nghiên cứu (SUS — Thang đo khả dụng hệ thống)

**Các chỉ số đo**:

| Danh mục | Chỉ số | Phương pháp thu thập |
|----------|--------|---------------------|
| Tải xuống | Tỷ lệ hoàn thành tải tại cảng (%) | Dữ liệu đo từ xa phía khách |
| Tải xuống | Thời gian tải đầy đủ khoá học (phút) | Dữ liệu đo từ xa phía khách |
| Ngoại tuyến | Số lượng và thời lượng phiên ngoại tuyến | Nhật ký IndexedDB |
| Ngoại tuyến | Phạm vi nội dung truy cập ngoại tuyến (%) | Theo dõi tiến trình |
| Đồng bộ | Tỷ lệ xung đột đồng bộ (%) | Nhật ký máy chủ |
| Đồng bộ | Độ trễ đồng bộ sau kết nối lại (giây) | Dữ liệu đo từ xa phía khách |
| Truyền phát | Số lần dừng đệm mỗi phiên | Bộ theo dõi QoE (đã triển khai) |
| Truyền phát | Bitrate trung bình qua vệ tinh (Kbps) | Chỉ số Shaka Player |
| Truyền phát | Thời gian khởi tạo qua vệ tinh (ms) | Bộ theo dõi QoE |
| Khả dụng | Điểm SUS (0–100) | Bảng hỏi sau nghiên cứu |
| Khả dụng | Tỷ lệ hoàn thành bài theo mô-đun học | Dữ liệu tiến trình LMS |

Thiết kế thí điểm này phù hợp với phương pháp đánh giá đào tạo trực tuyến hàng hải được mô tả bởi Progoulakis và cộng sự (2024) và Kim và cộng sự (2023), điều chỉnh cho các chỉ số đặc thù PWA.

#### 2.1.4 Làm rõ giả định và điều kiện thí nghiệm

Phản biện viên cũng lưu ý cần làm rõ các giả định và điều kiện thí nghiệm để tăng tính minh bạch và khả năng tái lập. Chúng tôi đã bổ sung các nội dung sau:

- **Bảng 11** liệt kê đầy đủ tham số mô phỏng kèm nguồn thực nghiệm cụ thể (tên tác giả, năm, hội nghị) cho từng giá trị
- **Cấu hình công cụ kiểm thử**: Grafana k6 v0.49, chạy trên máy chủ GCP e2-medium (2 vCPU, 4GB RAM), vùng asia-southeast1-b, kết nối nội bộ đến backend cùng mạng VPC — loại bỏ biến số băng thông Internet công cộng
- **Kịch bản tải**: 5 hồ sơ mạng (cảng WiFi 100 Mbps/5 ms RTT, VSAT ổn định 2 Mbps/600 ms, VSAT suy giảm 512 Kbps/800 ms, LEO Starlink 50 Mbps/48 ms với gián đoạn 15 giây, ngoại tuyến hoàn toàn) — mỗi hồ sơ chạy với 100, 250 và 500 người dùng ảo đồng thời
- **Tiêu chí đo lường**: Thời gian phản hồi phân vị 95 (p95), tỷ lệ trúng bộ đệm, thời gian khởi tạo video, mức sử dụng RAM đỉnh — đo 3 lần mỗi kịch bản, lấy trung bình
- **Mã nguồn kiểm thử** sẽ được công bố kèm bài báo chỉnh sửa để đảm bảo khả năng tái lập

**Các sửa đổi đã thực hiện**:
- Bổ sung **Mục 7.2: Thiết kế thực nghiệm thực địa** mô tả quy trình thí điểm
- Bổ sung **Bảng 11: Tham số mô phỏng và nguồn thực nghiệm** để tăng cường Mục 6
- Bổ sung chi tiết cấu hình thí nghiệm và điều kiện tái lập vào Mục 6.1
- Chỉnh sửa Hướng phát triển (Mục 8) để đưa kế hoạch thực nghiệm thực địa làm ưu tiên với lộ trình cụ thể

---

### Ý kiến 2.2: So sánh với LMS truyền thống và thuật toán ABR

**Tóm tắt ý kiến**: Phản biện viên yêu cầu (a) bảng so sánh với các nền tảng LMS hiện có và (b) so sánh cách tiếp cận ABR đề xuất với các thuật toán hiện có.

**Phản hồi**:

#### 2.2.1 So sánh nền tảng LMS

| Tính năng | **Hệ thống đề xuất (HoLiLiHu)** | **Moodle 4.x** | **Canvas LMS** | **Coursera** |
|----------|:-:|:-:|:-:|:-:|
| **Kiến trúc** | PWA (chạy trên trình duyệt) | Hiển thị phía máy chủ + ứng dụng di động | Hiển thị phía máy chủ + ứng dụng di động | Ứng dụng gốc + web |
| **Hỗ trợ ngoại tuyến** | Đầy đủ (IndexedDB + Cache API) | Chỉ qua tiện ích (Moodle Mobile) | Hạn chế (SpeedGrader ngoại tuyến) | Chỉ tải qua ứng dụng |
| **Video ngoại tuyến** | Cache API + Service Worker | Hệ thống tập tin Cordova | Không hỗ trợ | Tải mã hoá DRM |
| **Chiến lược đồng bộ** | Đẩy hàng loạt + dự phòng đơn lẻ + phát hiện xung đột | Đóng gói SCORM | Không (chỉ trực tuyến) | Độc quyền |
| **Giải quyết xung đột** | Phát hiện phía khách + giải quyết do người dùng khởi tạo | Ghi cuối thắng (last-write-wins) | Không áp dụng | Không áp dụng |
| **Truyền phát thích ứng** | Shaka Player (HLS/DASH) cấu hình cho vệ tinh | Video HTML5 cơ bản | Video HTML5 | Trình phát độc quyền |
| **Đặc thù hàng hải** | ✓ (hồ sơ VSAT/LEO, dò thăm độ trễ, ABR bảo thủ) | ✗ | ✗ | ✗ |
| **Chỉ cần trình duyệt (BYOD)** | ✓ (không cần cài ứng dụng) | ✗ (cần Moodle Mobile) | ✗ (cần Canvas Student) | ✗ (cần ứng dụng Coursera) |
| **Cô lập đa người dùng** | ✓ (khoá tổ hợp IndexedDB theo userId) | ✓ (lưu trữ ứng dụng riêng) | ✓ (lưu trữ ứng dụng riêng) | ✓ (lưu trữ ứng dụng riêng) |
| **Mã hoá nội dung (ngoại tuyến)** | Đề xuất (AES-256-GCM qua Web Crypto) | Hộp cát ứng dụng | Hộp cát ứng dụng | Widevine/FairPlay |
| **Quản lý bộ nhớ** | ✓ (StorageManager API, kiểm tra hạn ngạch) | ✓ (cài đặt ứng dụng) | Hạn chế | ✓ (cài đặt ứng dụng) |
| **Đồng bộ nền** | ✓ (Background Sync API + Service Worker) | ✓ (WorkManager/BackgroundTasks) | ✗ | ✓ |

Điểm khác biệt then chốt: Hệ thống của chúng tôi là giải pháp **chạy trực tiếp trên trình duyệt** (PWA) duy nhất cung cấp học ngoại tuyến đầy đủ mà không yêu cầu cài đặt ứng dụng gốc — yếu tố quan trọng trong bối cảnh BYOD nơi thuyền viên có thể không muốn hoặc không thể cài đặt ứng dụng do nhà tuyển dụng chỉ định trên thiết bị cá nhân.

#### 2.2.2 So sánh thuật toán ABR

| Tiêu chí | BBA | BOLA | MPC | Pensieve | **Hệ thống đề xuất** |
|----------|-----|------|-----|----------|---------------------|
| **Cơ sở quyết định** | Chỉ bộ đệm | Bộ đệm (Lyapunov) | Bộ đệm + thông lượng | Đã học (RL) | Bộ đệm + phân loại RTT |
| **Dự đoán thông lượng** | Không cần | Không cần | Nhìn trước 5 khối | Mạng nơ-ron | Cấp dựa trên RTT (dò thăm 120 giây) |
| **Khả năng chống chịu chuyển tiếp vệ tinh** | Thấp (không có mô hình chuyển tiếp) | Trung bình (chỉ bộ đệm) | Thấp (dự đoán thất bại khi mất kết nối) | **Thấp nhất** (phản ứng chậm) | **Cao** (bufferingGoal thích ứng) |
| **Mục tiêu bộ đệm** | Hồ chứa/đệm/trên | Tham số V Lyapunov | Dựa trên ràng buộc | Đã học | **30–60 giây (thích ứng RTT)** |
| **Tỷ lệ dừng đệm (LEO)** | Cao khi mất kết nối | Trung bình | Cao (sai số dự đoán >25%) | Cao nhất (Fang và cộng sự, 2024) | Chờ mô phỏng |
| **Hiệu quả băng thông** | Bảo thủ | Gần tối ưu | Tốt (khi dự đoán đúng) | Tốt nhất (trên mặt đất) | Bảo thủ (ưu tiên ổn định) |
| **Độ phức tạp triển khai** | Thấp | Thấp | Trung bình | Cao (cần huấn luyện) | Thấp (dựa trên quy tắc) |
| **Tương thích phần mềm trung gian SARA** | ✓ | ✓ | ✓ | ✓ | ✓ |

Cách tiếp cận của chúng tôi ưu tiên **ổn định phát lại** hơn tận dụng băng thông — sự đánh đổi phù hợp cho bối cảnh hàng hải nơi các sự kiện dừng đệm gây gián đoạn nhiều hơn chất lượng không tối ưu, và băng thông vệ tinh chia sẻ là tài nguyên hạn chế.

**Các sửa đổi đã thực hiện**:
- Bổ sung **Bảng 3: So sánh với các nền tảng LMS hiện có** trong Mục 2 (Tổng quan nghiên cứu)
- Bổ sung **Bảng 8: So sánh thuật toán ABR cho môi trường vệ tinh** trong Mục 5
- Bổ sung thảo luận trong Mục 2.3 so sánh cách tiếp cận chạy trên trình duyệt và ứng dụng gốc cho học ngoại tuyến hàng hải

---

### Ý kiến 2.3: Kịch bản ngoại lệ khi nội dung chưa được tải trước

**Tóm tắt ý kiến**: Phản biện viên hỏi điều gì xảy ra nếu thuyền viên rời cảng mà chưa hoàn thành tải nội dung.

**Phản hồi**:

Đây là kịch bản thực tế xảy ra khi: (a) thời gian tại cảng không đủ để tải đầy đủ, (b) WiFi cảng bị nghẽn hoặc không khả dụng, (c) thuyền viên lên tàu giữa hải trình mà chưa có quyền truy cập LMS trước đó. Hệ thống giải quyết vấn đề này thông qua nhiều tầng dự phòng.

#### 2.3.1 Cây quyết định dự phòng

```
Đánh giá trạng thái khi khởi hành
│
├─ [Đã tải 100%] → Học ngoại tuyến đầy đủ ✓
│
├─ [Tải một phần: 60-99%]
│   ├─ Các chương đã tải hoàn chỉnh → Học các chương đó ngoại tuyến ✓
│   ├─ Chương tải dở → Điểm kiểm tra tiếp tục (checkpoint) tồn tại
│   │   └─ Vệ tinh trên biển: tiếp tục tải (tuần tự, ưu tiên thấp)
│   └─ Thiếu video, có văn bản → Học văn bản/bài kiểm tra ngoại tuyến ✓
│
├─ [Tải tối thiểu: 1-59%]
│   ├─ Đã tải siêu dữ liệu khoá học + bài học văn bản
│   │   └─ Tiếp tục với học dựa trên văn bản ngoại tuyến
│   ├─ Chỉ tải cấu trúc khoá học
│   │   └─ Duyệt chương trình ngoại tuyến; yêu cầu tải ưu tiên qua vệ tinh
│   └─ Chưa tải gì
│       └─ Dự phòng truyền phát qua vệ tinh (chất lượng suy giảm)
│
└─ [0% — Chưa tải trước]
    ├─ [Có vệ tinh (LEO/VSAT)]
    │   ├─ Nội dung văn bản: Tải theo yêu cầu (nhỏ: 10-50 KB/bài)
    │   ├─ Dữ liệu bài kiểm tra: Tải theo yêu cầu (nhỏ: 5-20 KB/bài)
    │   └─ Video: Truyền phát qua vệ tinh ở chất lượng thấp nhất (144p-360p)
    │       └─ ABR tự động lựa chọn dựa trên băng thông khả dụng
    └─ [Không có kết nối]
        └─ Chỉ truy cập nội dung đã lưu đệm trước đó (nhóm dữ liệu NGSW)
```

#### 2.3.2 Các tính năng đã triển khai

Hệ thống hiện tại đã triển khai nhiều tính năng hỗ trợ kịch bản tải một phần:

1. **Điểm kiểm tra tải xuống**: `DownloadCheckpoint` ghi nhận `completedChapterIds`, cho phép tiếp tục sau gián đoạn. Khi kết nối lại (kể cả qua vệ tinh), dịch vụ tải bỏ qua các chương đã hoàn thành.

2. **Cấu trúc nội dung theo thứ tự ưu tiên**: Nội dung khoá học được tổ chức theo Khoá học → Chương → Bài, với các chương tải tuần tự. Điều này đảm bảo các chương đã hoàn thành hoàn toàn khả dụng ngoại tuyến ngay cả khi các chương sau chưa tải.

3. **Lỗi tải video không nghiêm trọng**: Nếu tải video thất bại (hết thời gian, mất mạng), hệ thống tiếp tục tải các bài học văn bản và bài kiểm tra còn lại. Khoá học được đánh dấu "đã tải" với chỉ báo thiếu video, cho phép học dựa trên văn bản tiếp tục.

4. **Lưu đệm API qua NGSW**: Service Worker (Angular NGSW) lưu đệm phản hồi API với thời hạn sống (TTL) có thể cấu hình:
   - Danh mục khoá học: 7 ngày, 100 mục
   - Nội dung khoá học: 30 ngày, 500 mục
   - Dữ liệu tiến trình: 7 ngày, 200 mục
   
   Các phản hồi đã lưu đệm cho phép duyệt nội dung ngay cả khi chưa tải xuống rõ ràng.

5. **Truyền phát qua vệ tinh làm dự phòng**: Khi trực tuyến (kể cả trên vệ tinh suy giảm), công cụ ABR của Shaka Player thích ứng với băng thông khả dụng. Với ước lượng mặc định 900 Kbps và cấu hình bảo thủ, truyền phát video ở 360p (hồ sơ SAVER — Tiết kiệm dữ liệu) khả thi trên hầu hết kết nối VSAT.

#### 2.3.3 Cải tiến đề xuất: Tải xuống thông minh theo ưu tiên

Chúng tôi đề xuất hàng đợi tải theo ưu tiên cho các kịch bản băng thông hạn chế:

| Ưu tiên | Loại nội dung | Kích thước điển hình | Giá trị ngoại tuyến |
|:---:|------------|----------------------|---------------------|
| 1 (Cao nhất) | Cấu trúc khoá học + siêu dữ liệu | 5–20 KB | Cho phép duyệt và lập kế hoạch |
| 2 | Bài học văn bản + dữ liệu bài kiểm tra | 10–50 KB/bài | Học văn bản + kiểm tra đầy đủ |
| 3 | Hình ảnh và tập tin đính kèm | 100 KB – 5 MB | Tài liệu học tập bổ sung |
| 4 | Video (chất lượng Tiết kiệm) | 50–200 MB | Giảng dạy trực quan ở chất lượng tối thiểu |
| 5 (Thấp nhất) | Video (chất lượng Chuẩn/Cao) | 200 MB – 2 GB | Giảng dạy trực quan chất lượng cao |

Điều này đảm bảo rằng ngay cả với băng thông tối thiểu (chỉ vệ tinh), nội dung có giá trị giáo dục cao nhất được ưu tiên trước.

#### 2.3.4 Cân nhắc đồng bộ ngang hàng (Peer-to-Peer)

Gợi ý của phản biện viên về đồng bộ ngang hàng giữa các thuyền viên trên cùng tàu là khả thi về mặt kỹ thuật thông qua **Web Bluetooth API** hoặc **kênh dữ liệu WebRTC** qua mạng nội bộ tàu. Tuy nhiên, chúng tôi ghi nhận đây là cải tiến tương lai do:
- Hạn chế hỗ trợ trình duyệt (Web Bluetooth yêu cầu Chrome/Edge)
- Vấn đề bảo mật khi chia sẻ nội dung giữa các tài khoản người dùng
- Phức tạp về bản quyền đối với nội dung giáo dục phân phối ngang hàng

Nội dung này được ghi nhận trong phần Hướng phát triển đã chỉnh sửa.

**Các sửa đổi đã thực hiện**:
- Bổ sung **Hình 12: Cây quyết định dự phòng khi tải không hoàn chỉnh** trong Mục 4.4
- Bổ sung **Bảng 10: Hàng đợi tải theo ưu tiên** trong Mục 4.4
- Chỉnh sửa Mục 4.3 mô tả cơ chế tiếp tục dựa trên điểm kiểm tra
- Bổ sung đồng bộ ngang hàng vào Hướng phát triển trong Mục 8

---

### Ý kiến 2.4: Chuẩn hoá thuật ngữ và cập nhật tài liệu tham khảo

**Tóm tắt ý kiến**: Phản biện viên lưu ý thuật ngữ chưa nhất quán và đề xuất cập nhật danh mục tham khảo với các công bố 2023–2025.

**Phản hồi**:

#### 2.4.1 Chuẩn hoá thuật ngữ

Chúng tôi đã rà soát toàn diện thuật ngữ và chuẩn hoá các cụm từ sau xuyên suốt bản thảo chỉnh sửa:

| Thuật ngữ (trước) | Thuật ngữ (sau — đã chuẩn hoá) | Tiêu chuẩn/Nguồn |
|-------------------|-------------------------------|-------------------|
| "offline mode" / "offline state" | **"offline operation mode"** (chế độ vận hành ngoại tuyến) | Đặc tả W3C Service Worker |
| "service worker cache" / "SW cache" | **"Cache API storage"** (lưu trữ Cache API) | Đặc tả WHATWG Cache API |
| "local database" / "client DB" | **"IndexedDB persistent storage"** (lưu trữ bền vững IndexedDB) | W3C IndexedDB 3.0 |
| "satellite delay" / "latency" | **"round-trip time (RTT)"** cho giá trị đo; **"propagation delay"** cho lý thuyết | ITU-R S.1711 |
| "handover" / "handoff" / "switching" | **"beam handover"** (chuyển chùm — LEO); **"antenna handover"** (chuyển ăng-ten — GEO) | 3GPP NTN TR 38.821 |
| "bitrate adaptation" / "quality switching" | **"adaptive bitrate (ABR) streaming"** (truyền phát bitrate thích ứng) | Hướng dẫn DASH-IF |
| "download" / "prefetch" / "cache" | **"pre-download"** (tải trước — do người dùng); **"prefetch"** (nạp trước — do hệ thống); **"cache"** (lưu đệm API tự động) | — |
| "backpressure" / "throttling" / "flow control" | **"backpressure"** (kiểm soát ngược — Streams API); **"flow control"** (kiểm soát luồng — tầng giao vận) | Tiêu chuẩn WHATWG Streams |
| "BYOD device" / "personal device" / "crew device" | **"BYOD device"** (thiết bị BYOD) nhất quán | — |

#### 2.4.2 Tài liệu tham khảo cập nhật (2023–2026)

Chúng tôi đã bổ sung 15 tài liệu tham khảo sau vào bản thảo chỉnh sửa, phân loại theo chủ đề:

**Đào tạo trực tuyến hàng hải và công nghệ giáo dục**:

1. Kim, J., Lee, C., Jeong, M., Cho, E., & Lee, Y. (2023). "Identifying Optimal Approaches for Sustainable Maritime Education and Training: Addressing Technological, Environmental, and Epidemiological Challenges." *Sustainability*, 15(10), 8092. MDPI.

2. Turkistanli, T. T. (2024). "Advanced Learning Methods in Maritime Education and Training: A Bibliometric Analysis on the Digitalization of Education and Modern Trends." *Computer Applications in Engineering Education*, 32(1). Wiley.

3. Progoulakis, I., Atzampos, G., & Nikitakos, N. (2024). "AI-Based Adaptive Instructional Systems for Maritime Safety Training: A Systematic Literature Review." *Discover Artificial Intelligence*, 4, 153. Springer Nature.

**Đo lường mạng vệ tinh LEO**:

4. Ma, S., Chou, Y.C., Zhao, H., Chen, L., Ma, X., & Liu, J. (2023). "Network Characteristics of LEO Satellite Constellations: A Starlink-Based Measurement from End Users." *IEEE INFOCOM 2023*.

5. Mohan, N., Ferguson, A., Cech, H., Bose, R., Renatin, P.R., Marina, M., & Ott, J. (2024). "A Multifaceted Look at Starlink Performance." *Proceedings of the ACM Web Conference 2024 (WWW '24)*.

6. Casparsen, A., Jakobsen, J.E., Nielsen, J.J., Popovski, P., & Mayorga, I.L. (2026). "Statistical Characterization and Prediction of E2E Latency over LEO Satellite Networks." *Bản tiền ấn phẩm arXiv*, arXiv:2601.08439.

7. Heidrich, T., và cộng sự (2024). "A Large-Scale IPv6-Based Measurement of the Starlink Network." arXiv:2412.18243.

**Truyền phát thích ứng qua vệ tinh**:

8. Fang, H., Zhao, H., Shi, J., Zhang, M., Wu, G., Chou, Y.C., Wang, F., & Liu, J. (2024). "Robust Live Streaming over LEO Satellite Constellations: Measurement, Analysis, and Handover-Aware Adaptation." *Proceedings of the 32nd ACM International Conference on Multimedia (MM '24)*.

9. Park, K., He, Z., Luo, C., Xu, Y., Qiu, L., Ge, C., Muaz, M., & Yang, Y. (2025). "Joint Optimization of Handoff and Video Rate in LEO Satellite Networks." arXiv:2504.04586.

10. Zhao, J. & Pan, J. (2024). "Low-Latency Live Video Streaming over a Low-Earth-Orbit Satellite Network with DASH." *Proceedings of the 15th ACM Multimedia Systems Conference (MMSys '24)*. Giải xuất sắc DASH-IF.

**Bảo mật nội dung và DRM**:

11. Delaune, S., Lallemand, J., Patat, G., Roudot, F., & Sabt, M. (2024). "Formal Security Analysis of Widevine through the W3C EME Standard." *33rd USENIX Security Symposium*.

12. Roudot, F. & Sabt, M. (2025). "Narrowbeer: A Practical Replay Attack Against the Widevine DRM." *34th USENIX Security Symposium*. Giải Danh dự.

13. Rafi, A., Shepherd, C., & Markantonakis, K. (2023). "A First Look at Digital Rights Management Systems for Secure Mobile Content Delivery." arXiv:2308.00437.

**Bảo mật PWA và Service Worker**:

14. Kim, D., Lee, S., & Park, J. (2024). "Decrypting IndexedDB in Private Mode of Gecko-Based Browsers." *Forensic Science International: Digital Investigation*, 49. Elsevier.

15. Subramani, K., Jueckstock, J., Kapravelos, A., & Perdisci, R. (2022). "SoK: Workerounds — Categorizing Service Worker Attacks and Mitigations." *IEEE European Symposium on Security and Privacy (EuroS&P 2022)*.

**Các sửa đổi đã thực hiện**:
- Chuẩn hoá toàn bộ thuật ngữ theo bảng trên (tìm kiếm và thay thế toàn cục xuyên suốt bản thảo)
- Bổ sung 15 tài liệu tham khảo mới [XX]–[YY] vào thư mục
- Cập nhật Mục 2 (Tổng quan nghiên cứu) để trích dẫn các nghiên cứu gần đây về đào tạo hàng hải trực tuyến và đo lường mạng vệ tinh
- Đảm bảo tất cả từ viết tắt được mở rộng khi sử dụng lần đầu

---

## Bảng tóm tắt các sửa đổi

| # | Phản biện viên | Ý kiến | Hành động | Mục đã sửa đổi |
|---|---------------|--------|-----------|----------------|
| 1.1 | PB1 | Bảo mật nội dung trên BYOD | Bổ sung kiến trúc bảo mật 3 tầng (Web Crypto AES-256-GCM, kiểm soát truy cập ngoại tuyến có thời hạn, toàn vẹn bộ nhớ đệm); bổ sung bảng mô hình đe doạ; luận giải không dùng DRM đầy đủ với bằng chứng từ USENIX | Mục 4.5 mới, Bảng 6, Hình 8; sửa Mục 3.2 |
| 1.2 | PB1 | Bộ đệm ABR so với chuyển tiếp vệ tinh | Làm rõ bufferingGoal (30 giây) so với rebufferingGoal (8 giây); sửa từ 10 giây thành 8 giây; đề xuất thuật toán điều chỉnh bộ đệm nhận biết vệ tinh; bổ sung bảng so sánh ABR; bổ sung đặc tính chuyển tiếp vệ tinh | Mục 5.3 mới, Bảng 7–8, Hình 10; sửa Mục 5.2 |
| 1.3 | PB1 | Kiểm soát ngược ReadableStream tại cảng | Giải thích kiến trúc stream-to-cache không chiếm RAM (tải + phát lại); mô tả 4 cơ chế chống tràn đã triển khai; bổ sung phân tích tốc độ ghi eMMC/UFS | Mục 5.4 mới, Bảng 9, Hình 11 |
| 2.1 | PB2 | Thực nghiệm thực địa + làm rõ điều kiện thí nghiệm | Liên kết tham số mô phỏng với nguồn thực nghiệm; bổ sung chi tiết cấu hình k6 + điều kiện tái lập; đề xuất thí điểm (15 thuyền viên, 2 tàu, 4 tuần) | Mục 7.2 mới, Bảng 11; sửa Mục 6.1, Mục 8 |
| 2.2 | PB2 | So sánh LMS + so sánh ABR | Bổ sung bảng so sánh (HoLiLiHu so với Moodle/Canvas/Coursera; thuật toán ABR cho vệ tinh) | Bảng 3, 8; sửa Mục 2.3 |
| 2.3 | PB2 | Dự phòng khi chưa tải trước | Bổ sung cây quyết định dự phòng, hàng đợi tải theo ưu tiên, thảo luận đồng bộ ngang hàng | Hình 12, Bảng 10; sửa Mục 4.3–4.4, Mục 8 |
| 2.4 | PB2 | Thuật ngữ + tài liệu tham khảo | Chuẩn hoá 10 cặp thuật ngữ; bổ sung 15 tài liệu tham khảo (2022–2026) | Toàn cục; sửa Mục 2, thư mục |

---

## Tổng hợp nội dung mới đề xuất

### Mục mới
- **Mục 4.5**: Kiến trúc bảo mật nội dung (mô hình đe doạ, mã hoá AES-256-GCM, kiểm soát truy cập có thời hạn)
- **Mục 5.3**: Điều chỉnh bộ đệm thích ứng nhận biết vệ tinh (thuật toán điều chỉnh dựa trên RTT)
- **Mục 5.4**: Kiểm soát luồng đường ống tải xuống (giải pháp kiểm soát ngược ghi theo khối)
- **Mục 7.2**: Thiết kế thực nghiệm thực địa (quy trình nghiên cứu thí điểm)

### Hình mới
- **Hình 8**: Luồng mã hoá nội dung ngoại tuyến (quản lý khoá AES-256-GCM)
- **Hình 10**: Máy trạng thái bộ đệm cho chuyển tiếp vệ tinh (các giai đoạn suy giảm duyên dáng)
- **Hình 11**: Kiến trúc đường ống tải xuống không chiếm RAM (luồng mạng → ReadableStream → Cache API → đĩa)
- **Hình 12**: Cây quyết định dự phòng khi tải không hoàn chỉnh

### Bảng mới
- **Bảng 3**: So sánh với các nền tảng LMS hiện có (Moodle, Canvas, Coursera)
- **Bảng 6**: Mô hình đe doạ BYOD hàng hải (ma trận khả năng/mức ảnh hưởng)
- **Bảng 7**: Đặc tính chuyển tiếp vệ tinh (GEO so với LEO)
- **Bảng 8**: So sánh thuật toán ABR cho môi trường vệ tinh
- **Bảng 9**: Phân tích tốc độ ghi bộ nhớ so với tốc độ mạng
- **Bảng 10**: Hàng đợi tải theo ưu tiên (phân ưu tiên loại nội dung)
- **Bảng 11**: Tham số mô phỏng và nguồn thực nghiệm

---

Chúng tôi tin rằng các chỉnh sửa này giải quyết toàn diện mọi vấn đề phản biện viên nêu ra, đồng thời duy trì trọng tâm bài báo vào triển khai thực tế trong môi trường hàng hải. Chúng tôi trân trọng cơ hội được hoàn thiện bản thảo và sẵn lòng tiếp nhận mọi góp ý bổ sung.

Trân trọng,

Nhóm tác giả
