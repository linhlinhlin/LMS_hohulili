Chào bạn, thông tin Payload (file (binary) và type TEMP_QUIZ_ASSET) chính là "chìa khóa" để giải quyết vấn đề. Dựa trên phân tích chuyên sâu của một Lead Fullstack Architect, tôi đã tìm thấy sự đứt gãy trong "Hợp đồng giao tiếp" giữa Frontend và Backend của bạn.

Dưới đây là phân tích Chain-of-Thought (CoT) và giải pháp sửa lỗi triệt để:

1. Phân tích nguyên nhân lỗi 400 (The "Contract" Mismatch)

Bạn gửi lên 2 tham số trong FormData:

file: (binary)

type: TEMP_QUIZ_ASSET

Lý do bạn bị 400 Bad Request:
Backend của bạn (Controller) có lẽ chỉ đang khai báo để nhận @RequestParam("file") mà không khai báo để nhận thêm tham số type. Khi Spring Boot nhận được một tham số "thừa" (unrecognized parameter) trong một request Multipart mà nó không mong đợi, nó sẽ từ chối ngay lập tức bằng lỗi 400 trước khi vào đến code logic của bạn.

2. Phân tích lỗi DB: Tại sao HTML lại trống [{"data": {"html": ""}, "type": "text"}]?

Đây là lỗi Logic chuyển đổi Block ở Frontend:

Hệ thống đang hoạt động theo cơ chế: Tải ảnh lên -> Nhận về URL -> Chèn vào danh sách Blocks.

Hiện tại, khi có ảnh, Frontend lại đang tạo ra một Text Block với nội dung rỗng thay vì tạo ra một Image Block.

Nguyên tắc SOTA 2025: Một nội dung có cả chữ và ảnh phải là một mảng 2 phần tử (1 block image và 1 block text), không bao giờ được để ảnh "ký sinh" trong một text block rỗng.

3. Giải pháp sửa lỗi triệt để (Fullstack Fix)
Bước 1: Sửa Backend Controller (Hợp nhất tham số)

Bạn phải cập nhật Controller để chấp nhận cả tham số type.

code
Java
download
content_copy
expand_less
// FileController.java
@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public ResponseEntity<FileResponse> uploadFile(
    @RequestParam("file") MultipartFile file,
    @RequestParam("type") String type // THÊM DÒNG NÀY ĐỂ TRÁNH LỖI 400
) {
    log.info("Upload type: {}", type); // TEMP_QUIZ_ASSET
    return ResponseEntity.ok(fileUploadService.upload(file, type));
}
Bước 2: Sửa Frontend Logic (Tạo Block đúng chuẩn)

Trong Component xử lý câu trả lời (Option), sau khi upload ảnh thành công, bạn phải tạo đúng loại Block.

Logic đề xuất (Angular):

code
TypeScript
download
content_copy
expand_less
onImageUploaded(response: any) {
  // 1. Lấy kết quả từ server (giả sử server trả về fileId và url)
  const newImageBlock = {
    type: 'image',
    data: {
      fileId: response.id,
      url: response.url,
      caption: 'Ảnh minh họa'
    }
  };

  // 2. Cập nhật vào mảng blocks của câu trả lời
  // ĐỪNG ghi đè vào text block, hãy THÊM MỚI vào mảng
  const currentBlocks = this.option.blocks();
  this.option.blocks.set([...currentBlocks, newImageBlock]);
}
Bước 3: Cấu trúc DB sau khi sửa (Mẫu chuẩn SOTA)

Đối với một câu trả lời có ảnh và chữ "Đáp án A", dữ liệu trong DB phải trông như thế này:

code
JSON
download
content_copy
expand_less
[
  { "type": "image", "data": { "fileId": "uuid-123", "url": "..." } },
  { "type": "text", "data": { "html": "Đáp án A" } }
]
4. Kế hoạch hành động Khẩn cấp (Action Plan)

Backend: Kiểm tra ngay file FileController.java. Nếu thiếu @RequestParam("type"), hãy thêm vào và restart server. Đây là nguyên nhân gây lỗi 400.

Frontend: Kiểm tra hàm saveQuestion. Đảm bảo rằng trước khi gửi lên Backend, mảng blocks của bạn không chứa các object text có html: "". Hãy thực hiện một bước Filter trước khi gửi:

code
TypeScript
download
content_copy
expand_less
const cleanBlocks = blocks.filter(b => b.type !== 'text' || b.data.html !== "");

Kiểm tra PWA: Vì bạn sẽ dùng PWA, hãy đảm bảo API trả về cả fileId. Sau này PWA sẽ dùng fileId để tìm ảnh trong IndexedDB thay vì dùng url.

Lời khuyên của chuyên gia:

Việc bạn dùng TEMP_QUIZ_ASSET là rất chuyên nghiệp. Nó giúp hệ thống biết đây là ảnh tạm của Quiz để có thể dọn dẹp định kỳ. Tuy nhiên, hãy cực kỳ cẩn thận với "Hợp đồng tham số". Trong Multipart, thiếu hay thừa một @RequestParam đều dẫn đến 400.

Bạn hãy thực hiện Bước 1 (Sửa Controller) ngay. Tôi tin chắc lỗi 400 sẽ biến mất. Sau đó chúng ta sẽ xử lý tiếp phần hiển thị ảnh trong danh sách đáp án nhé!