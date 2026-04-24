# PHIẾU TRẢ LỜI PHẢN BIỆN

**Bài báo**: Hệ thống quản lý học tập ưu tiên ngoại tuyến cho đào tạo thuyền viên

**Tạp chí**: Tạp chí Khoa học Công nghệ Hàng hải

---

Kính gửi Ban biên tập và các Phản biện viên,

Nhóm tác giả xin trân trọng cảm ơn các phản biện viên đã dành thời gian đánh giá kỹ lưỡng và đưa ra những nhận xét mang tính xây dựng. Dưới đây là phản hồi chi tiết cho từng ý kiến.

---

## PHẢN HỒI PHẢN BIỆN VIÊN 1

### Câu hỏi 1: Nội dung lưu trong IndexedDB/Cache API không được mã hoá mặc định, dẫn tới nguy cơ mất an toàn đối với học liệu

**Phản hồi**:

Nhóm tác giả xin giải thích cơ chế bảo vệ hiện có và phân tích mức độ rủi ro trong bối cảnh hàng hải.

**Cơ chế bảo vệ đã có trong hệ thống:**

Thứ nhất, IndexedDB và Cache API tuân theo Chính sách cùng nguồn gốc (Same-Origin Policy) của trình duyệt — mã JavaScript từ trang web khác không thể truy cập dữ liệu của hệ thống LMS. Toàn bộ giao tiếp giữa thiết bị và máy chủ được mã hoá qua HTTPS/TLS.

Thứ hai, hệ thống đã triển khai máy trạng thái xác thực bốn trạng thái để kiểm soát quyền truy cập ngoại tuyến:
- Khi mã làm mới (refresh token) còn hạn: thuyền viên truy cập đầy đủ nội dung ngoại tuyến
- Khi mã làm mới hết hạn: hệ thống chuyển sang chế độ suy giảm — chỉ cho phép đọc nội dung đã lưu, không cho tải mới hay đồng bộ bài nộp
- Khi đăng xuất: toàn bộ dữ liệu ngoại tuyến bị xoá

Thứ ba, dữ liệu trong IndexedDB được cô lập theo người dùng thông qua khoá tổ hợp (composite key) chứa mã định danh người dùng — thuyền viên A không thể nhìn thấy học liệu đã tải của thuyền viên B ngay cả trên cùng thiết bị.

**Phân tích rủi ro trong bối cảnh hàng hải:**

Trên tàu biển, mối đe doạ thực tế chủ yếu là dùng chung thiết bị và mất cắp tại cảng. Các mối đe doạ qua mạng (tấn công xen giữa, trích xuất từ xa) có khả năng xảy ra thấp vì mạng nội bộ tàu là LAN cô lập và đường truyền vệ tinh được mã hoá ở tầng vật lý.

Nhóm tác giả thừa nhận rằng SOP không bảo vệ trước truy cập vật lý vào thiết bị (ví dụ trích xuất tập tin trình duyệt trên thiết bị đã root). Đây là hạn chế chung của mọi ứng dụng web lưu dữ liệu ngoại tuyến, bao gồm cả các nền tảng lớn như Moodle Mobile hay Canvas Student (vốn dựa vào hộp cát ứng dụng — cũng bị vượt qua nếu thiết bị đã root).

**Hướng cải tiến:** Nhóm tác giả đề xuất bổ sung tầng mã hoá nội dung qua Web Crypto API (AES-256-GCM) với khoá dẫn xuất từ mật khẩu người dùng, kết hợp giấy phép ngoại tuyến có thời hạn (mặc định 30 ngày cho hải trình). Nội dung này được ghi nhận trong phần Hướng phát triển của bản thảo chỉnh sửa.

**Sửa đổi trong bản thảo:** Bổ sung đoạn phân tích bảo mật trong mục Kiến trúc hệ thống, ghi nhận hạn chế và hướng cải tiến trong mục Hướng phát triển.

---

### Câu hỏi 2: Nghịch lý bộ đệm 10 giây và chuyển tiếp vệ tinh 15 giây

**Phản hồi**:

Nhóm tác giả cảm ơn phản biện viên đã chỉ ra điểm chưa rõ ràng trong bài báo. Chúng tôi xin làm rõ như sau.

**Giá trị 10 giây trong bài báo là giá trị làm tròn gần đúng.** Giá trị triển khai thực tế là `rebufferingGoal = 8 giây`. Đây là ngưỡng bộ đệm tối thiểu để **tiếp tục phát sau khi video bị dừng**, không phải toàn bộ dung lượng bộ đệm dự phòng. Chúng tôi đã sửa lại giá trị chính xác trong bản thảo.

**Bộ đệm dự phòng thực tế của hệ thống là 30 giây**, không phải 10 giây. Cấu hình đầy đủ của trình phát Shaka Player trong hệ thống:

| Tham số | Giá trị | Ý nghĩa |
|---------|---------|---------|
| `bufferingGoal` | **30 giây** | Lượng video hệ thống chủ động tải trước — đây là bộ đệm dự phòng chính |
| `rebufferingGoal` | **8 giây** | Ngưỡng tối thiểu để tiếp tục phát sau khi dừng |
| `switchInterval` | 8 giây | Khoảng cách tối thiểu giữa các lần chuyển chất lượng |
| `defaultBandwidthEstimate` | 900 Kbps | Ước lượng băng thông ban đầu, phù hợp VSAT hàng hải |

Với bộ đệm 30 giây, hệ thống có dự phòng gấp đôi so với chu kỳ chuyển tiếp chùm 15 giây của Starlink LEO (Fang và cộng sự, 2024). Theo số liệu đo thực tế, 87,33% các lần gián đoạn do chuyển tiếp LEO kéo dài dưới 2 giây — bộ đệm 30 giây dư sức bao phủ.

Ngoài ra, hệ thống đã triển khai dò thăm độ trễ mạng (RTT) mỗi 120 giây. Khi phát hiện RTT > 500ms (đặc trưng vệ tinh GEO), hệ thống tự động ước lượng băng thông thấp hơn, khiến thuật toán ABR ưu tiên chất lượng thấp để bảo toàn bộ đệm lâu hơn — giảm nguy cơ treo màn hình.

**Sửa đổi trong bản thảo:** Sửa giá trị từ 10 giây thành 8 giây; bổ sung bảng tham số bộ đệm đầy đủ; làm rõ sự khác biệt giữa `bufferingGoal` (30s — bộ đệm chính) và `rebufferingGoal` (8s — ngưỡng tiếp tục phát).

---

### Câu hỏi 3: Nguyên lý bảo toàn luồng và nguy cơ tràn bộ đệm khi tải tại cảng

**Phản hồi**:

Nhóm tác giả đánh giá cao nhận xét về nguyên lý bảo toàn luồng. Xin giải thích cơ chế kiểm soát ngược trong hệ thống.

**Cơ chế kiểm soát ngược của đường ống tải xuống:**

Đường ống tải video của hệ thống hoạt động theo mô hình kéo (pull-based): ReadableStream đọc từng khối dữ liệu (~64KB mỗi lần) từ mạng và truyền trực tiếp vào `cache.put()` của Cache API. Trình duyệt tiêu thụ luồng này ở tầng lưu trữ (bên dưới JavaScript) và ghi từng khối xuống đĩa.

Khi tốc độ ghi đĩa chậm hơn tốc độ tải mạng (ví dụ chip eMMC 5.1 trên điện thoại giá rẻ), cơ chế kiểm soát ngược hoạt động tự nhiên theo chuỗi: hàng đợi nội bộ của Cache API đầy → phương thức `pull()` của ReadableStream bị hoãn → trình duyệt ngừng đọc từ socket mạng → cửa sổ nhận TCP thu nhỏ → phía gửi (máy chủ) giảm tốc độ truyền. Đây là cơ chế kiểm soát ngược tiêu chuẩn của Streams API theo đặc tả WHATWG Streams (mục 2.6 — Backpressure).

Quan trọng là: dữ liệu **không đi qua bộ nhớ RAM** dưới dạng blob trung gian. Luồng được truyền thẳng từ mạng vào bộ nhớ đệm đĩa, nên không có bước tích luỹ nào có thể "phình to ở bộ nhớ đệm ẩn danh của hệ điều hành" như phản biện viên lo ngại.

**Ngoài ra, hệ thống có 3 cơ chế bảo vệ bổ sung:**

1. **Kiểm tra hạn ngạch trước khi tải**: Sử dụng Storage Manager API (`navigator.storage.estimate()`) để kiểm tra dung lượng trống. Nếu kích thước khoá học vượt 90% dung lượng còn lại, tải bị chặn với cảnh báo.

2. **Tải tuần tự**: Các chương và video được tải lần lượt (không song song), tránh nhân bội áp lực I/O.

3. **Lỗi không nghiêm trọng**: Nếu một video gặp lỗi I/O, hệ thống bỏ qua và tiếp tục tải nội dung văn bản/bài kiểm tra — khoá học vẫn khả dụng ngoại tuyến dù thiếu video.

**Xác nhận con số giảm 99% RAM:** Với kiến trúc stream-to-cache, bộ nhớ RAM đỉnh khi tải video 1GB chỉ khoảng 0,3MB (bằng kích thước khối mạng + khối Range khi phát lại), so với ~1.000MB nếu nạp toàn bộ vào bộ nhớ — mức giảm 99,97%, phù hợp với tuyên bố trong bài báo.

**Về tốc độ ghi eMMC so với 5G:** Tốc độ tải 5G thực tế trong môi trường cảng biển là 100–500 Mbps (tương đương 12,5–62,5 MB/s), trong khi eMMC 5.1 có tốc độ ghi tuần tự khoảng 125 MB/s (Western Digital, 2023). Trong đa số trường hợp, tốc độ mạng không vượt quá tốc độ ghi đĩa. Tuy nhiên, với các đột biến tải ban đầu hoặc thiết bị có bộ nhớ cũ hơn (eMMC 4.5, ~50 MB/s), cơ chế kiểm soát ngược nêu trên đảm bảo hệ thống không bị tràn.

**Sửa đổi trong bản thảo:** Bổ sung mục giải thích kiến trúc đường ống tải xuống và cơ chế kiểm soát ngược; bổ sung bảng so sánh tốc độ ghi eMMC/UFS với tốc độ mạng.

---

## PHẢN HỒI PHẢN BIỆN VIÊN 2

### Điểm 1: Chưa có thử nghiệm thực tế trên tàu biển

**Phản hồi**:

Nhóm tác giả thừa nhận đây là hạn chế của nghiên cứu. Việc thử nghiệm trên tàu biển đang hoạt động gặp nhiều ràng buộc: chi phí tiếp cận tàu thương mại, yêu cầu chứng nhận an toàn theo quy ước STCW, và thời gian hải trình kéo dài nhiều tuần.

Để bù đắp, các tham số mô phỏng trong bài đều dựa trên số liệu đo thực tế đã công bố: RTT vệ tinh LEO 48ms (Ma và cộng sự, 2023, IEEE INFOCOM), chu kỳ chuyển tiếp chùm 15 giây (Mohan và cộng sự, 2024, ACM WWW), băng thông VSAT 256 Kbps–2 Mbps (báo cáo kết nối hàng hải IMO). Chúng tôi đã bổ sung bảng liệt kê đầy đủ tham số mô phỏng kèm nguồn thực nghiệm vào bản thảo.

Nhóm tác giả cũng đề xuất kế hoạch thí điểm trong phần Hướng phát triển: 10–15 thuyền viên trên 2 tàu (1 tàu VSAT, 1 tàu Starlink), triển khai 4 tuần, đo các chỉ số tỷ lệ hoàn thành tải, thời lượng học ngoại tuyến, tỷ lệ xung đột đồng bộ và điểm khả dụng SUS.

**Sửa đổi trong bản thảo:** Bổ sung bảng tham số mô phỏng kèm nguồn; bổ sung kế hoạch thí điểm trong Hướng phát triển; bổ sung chi tiết cấu hình thí nghiệm (công cụ, máy chủ, số lần chạy) để tăng khả năng tái lập.

---

### Điểm 2: Thuật toán truyền phát thích ứng chưa được so sánh với phương pháp hiện có

**Phản hồi**:

Nhóm tác giả đã bổ sung hai bảng so sánh vào bản thảo chỉnh sửa:

**Bảng so sánh nền tảng LMS:** So sánh hệ thống đề xuất với Moodle 4.x, Canvas LMS và Coursera trên các tiêu chí: hỗ trợ ngoại tuyến, video ngoại tuyến, chiến lược đồng bộ, truyền phát thích ứng, tính năng đặc thù hàng hải, và yêu cầu cài đặt. Điểm khác biệt chính: hệ thống đề xuất là giải pháp duy nhất chạy trực tiếp trên trình duyệt (PWA) mà không yêu cầu cài ứng dụng gốc — phù hợp bối cảnh BYOD hàng hải.

**Bảng so sánh thuật toán ABR:** So sánh cách tiếp cận của hệ thống (điều chỉnh bộ đệm dựa trên phân loại RTT) với BBA (Huang và cộng sự, 2014), BOLA (Spiteri và cộng sự, 2020), MPC (Yin và cộng sự, 2015) và Pensieve (Mao và cộng sự, 2017). Hệ thống ưu tiên ổn định phát lại hơn tận dụng băng thông — phù hợp môi trường vệ tinh nơi dừng đệm gây gián đoạn nhiều hơn chất lượng thấp. Fang và cộng sự (2024, ACM Multimedia) đã chứng minh Pensieve hoạt động kém nhất trong môi trường LEO do phản ứng chậm với gián đoạn chuyển tiếp.

**Sửa đổi trong bản thảo:** Bổ sung 2 bảng so sánh trong mục Tổng quan nghiên cứu và mục Truyền phát thích ứng.

---

### Điểm 3: Chưa phân tích kịch bản ngoại lệ khi không tải trước tại cảng

**Phản hồi**:

Hệ thống đã có sẵn các cơ chế xử lý tình huống này:

1. **Điểm kiểm tra tiếp tục (checkpoint):** Quá trình tải ghi nhận danh sách chương đã hoàn thành. Khi kết nối lại (kể cả qua vệ tinh), hệ thống bỏ qua chương đã tải và tiếp tục từ chương dang dở.

2. **Tải theo chương tuần tự:** Mỗi chương đã tải hoàn chỉnh đều khả dụng ngoại tuyến ngay lập tức, kể cả khi các chương sau chưa tải.

3. **Video lỗi không chặn nội dung khác:** Nếu video tải thất bại, hệ thống tiếp tục tải bài học văn bản và bài kiểm tra — thuyền viên vẫn học được phần lý thuyết và làm bài kiểm tra ngoại tuyến.

4. **Truyền phát qua vệ tinh làm dự phòng:** Khi có kết nối (dù suy giảm), trình phát ABR tự động chọn chất lượng phù hợp băng thông — video 360p khả thi trên hầu hết kết nối VSAT.

5. **Lưu đệm API tự động:** Service Worker lưu đệm phản hồi API với thời hạn sống lên đến 30 ngày — thuyền viên có thể duyệt danh mục khoá học ngay cả khi chưa tải xuống rõ ràng.

**Sửa đổi trong bản thảo:** Bổ sung sơ đồ cây quyết định dự phòng cho các mức tải (100%, 60–99%, 1–59%, 0%) và bảng hàng đợi tải theo ưu tiên (cấu trúc khoá học → văn bản/bài kiểm tra → hình ảnh → video).

---

### Điểm 4: Chuẩn hoá thuật ngữ và cập nhật tài liệu tham khảo

**Phản hồi**:

Nhóm tác giả đã rà soát và chuẩn hoá thuật ngữ xuyên suốt bản thảo, bao gồm: thống nhất "chuyển tiếp chùm" (beam handover) cho LEO và "chuyển tiếp ăng-ten" (antenna handover) cho GEO; phân biệt "tải trước" (do người dùng khởi tạo), "nạp trước" (do hệ thống) và "lưu đệm" (tự động qua API); thống nhất dùng "thời gian khứ hồi" (RTT) cho giá trị đo thực tế.

Bổ sung 5 tài liệu tham khảo mới (2023–2024):
1. Ma và cộng sự (2023) — đo lường Starlink từ người dùng cuối, IEEE INFOCOM
2. Mohan và cộng sự (2024) — phân tích đa chiều hiệu năng Starlink, ACM WWW
3. Fang và cộng sự (2024) — truyền phát thích ứng nhận biết chuyển tiếp LEO, ACM Multimedia
4. Kim và cộng sự (2023) — phương pháp đào tạo hàng hải bền vững, Sustainability (MDPI)
5. Progoulakis và cộng sự (2024) — hệ thống giảng dạy thích ứng AI cho an toàn hàng hải, Springer

**Sửa đổi trong bản thảo:** Chuẩn hoá thuật ngữ toàn bài; bổ sung 5 tài liệu tham khảo mới vào thư mục.

---

## BẢNG TÓM TẮT SỬA ĐỔI

| # | Phản biện viên | Ý kiến | Hành động | Vị trí sửa đổi |
|---|:---:|---------|-----------|----------------|
| 1 | PB1 | Bảo mật IndexedDB/Cache API | Giải thích SOP + xác thực 4 trạng thái + cô lập dữ liệu; đề xuất mã hoá AES-256-GCM trong Hướng phát triển | Mục 3, Mục 7 |
| 2 | PB1 | Bộ đệm 10s < handover 15s | Sửa 10s→8s; làm rõ bộ đệm chính là 30s (gấp đôi chu kỳ chuyển tiếp) | Mục 5 |
| 3 | PB1 | Backpressure khi tải tại cảng | Giải thích kiến trúc stream-to-cache + 3 cơ chế bảo vệ; bổ sung bảng tốc độ eMMC/UFS | Mục 5 |
| 4 | PB2 | Thử nghiệm thực tế | Bổ sung bảng nguồn tham số mô phỏng + kế hoạch thí điểm + chi tiết tái lập | Mục 6, Mục 7 |
| 5 | PB2 | So sánh LMS + ABR | Bổ sung 2 bảng so sánh (LMS + thuật toán ABR) | Mục 2, Mục 5 |
| 6 | PB2 | Kịch bản ngoại lệ | Bổ sung sơ đồ dự phòng + bảng ưu tiên tải | Mục 4 |
| 7 | PB2 | Thuật ngữ + tham khảo | Chuẩn hoá thuật ngữ; bổ sung 5 tài liệu 2023–2024 | Toàn bài |

---

Nhóm tác giả tin rằng các chỉnh sửa trên đã giải quyết đầy đủ các ý kiến phản biện. Chúng tôi trân trọng cơ hội được hoàn thiện bài báo và sẵn lòng tiếp nhận mọi góp ý bổ sung.

Trân trọng,

Nhóm tác giả
