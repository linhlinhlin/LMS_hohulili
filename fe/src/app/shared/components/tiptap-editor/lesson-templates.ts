/**
 * Lesson Page Templates — Canvas/Moodle C4L pattern.
 *
 * Teacher chọn template khi tạo section TEXT mới → scaffold
 * sẵn cấu trúc bài giảng với headings + callouts + placeholder.
 *
 * Tất cả text tiếng Việt có dấu, viết cho giảng viên đọc.
 */

export interface LessonTemplate {
  id: string;
  title: string;
  description: string;
  icon: string; // SVG 24×24
  content: string; // HTML content for Tiptap
}

export const LESSON_TEMPLATES: LessonTemplate[] = [
  {
    id: 'blank',
    title: 'Trang trống',
    description: 'Bắt đầu từ đầu, tự do sáng tạo',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7" opacity="0.3"/><line x1="8" y1="11" x2="14" y2="11" opacity="0.3"/></svg>',
    content: '',
  },
  {
    id: 'theory',
    title: 'Bài giảng lý thuyết',
    description: 'Lý thuyết + khái niệm + ví dụ + câu hỏi ôn tập',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#0056D2" stroke-width="1.5"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
    content: `
      <h2>Tiêu đề bài giảng</h2>
      <p>Giới thiệu ngắn gọn về chủ đề bài giảng — tại sao nội dung này quan trọng và liên quan gì đến thực tế.</p>

      <div data-callout-type="info" class="callout callout--info">
        <p><strong>🎯 Mục tiêu bài học</strong></p>
        <p>Sau bài học này, học viên sẽ:</p>
        <ul>
          <li>Hiểu được...</li>
          <li>Áp dụng được...</li>
          <li>Phân tích được...</li>
        </ul>
      </div>

      <h3>1. Khái niệm cơ bản</h3>
      <p>Trình bày khái niệm đầu tiên tại đây...</p>

      <div data-callout-type="info" class="callout callout--info">
        <p><strong>📖 Khái niệm chính</strong></p>
        <p>Định nghĩa hoặc công thức quan trọng cần ghi nhớ.</p>
      </div>

      <h3>2. Phân tích chi tiết</h3>
      <p>Giải thích sâu hơn, kèm ví dụ minh họa...</p>

      <h3>3. Ví dụ thực tế</h3>
      <p>Đưa ra ví dụ cụ thể để học viên dễ hình dung...</p>

      <div data-callout-type="tip" class="callout callout--tip">
        <p><strong>💡 Mẹo ghi nhớ</strong></p>
        <p>Cách nhớ nhanh hoặc mẹo áp dụng trong thực tế.</p>
      </div>

      <h3>Câu hỏi ôn tập</h3>
      <ol>
        <li>Câu hỏi kiểm tra hiểu biết cơ bản?</li>
        <li>Câu hỏi yêu cầu phân tích, so sánh?</li>
        <li>Câu hỏi liên hệ thực tế?</li>
      </ol>
    `.trim().replace(/\n      /g, '\n'),
  },
  {
    id: 'lab',
    title: 'Thực hành / Lab',
    description: 'Hướng dẫn từng bước + cảnh báo an toàn + báo cáo',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1.5"><path d="M9 3h6v4H9z"/><path d="M7 7l-3 12a2 2 0 002 2h12a2 2 0 002-2L17 7"/><path d="M12 11v4"/><circle cx="12" cy="17" r="1"/></svg>',
    content: `
      <h2>Thực hành: Tên bài thực hành</h2>
      <p>Mô tả ngắn gọn mục đích và nội dung bài thực hành.</p>

      <div data-callout-type="info" class="callout callout--info">
        <p><strong>🎯 Mục tiêu thực hành</strong></p>
        <ul>
          <li>Thực hiện được...</li>
          <li>Vận hành đúng quy trình...</li>
          <li>Ghi nhận và báo cáo kết quả...</li>
        </ul>
      </div>

      <div data-callout-type="danger" class="callout callout--danger">
        <p><strong>⚠️ Lưu ý an toàn</strong></p>
        <ul>
          <li>Mang đầy đủ thiết bị bảo hộ cá nhân</li>
          <li>Không thao tác khi chưa được hướng dẫn</li>
          <li>Báo ngay cho giảng viên nếu gặp sự cố</li>
        </ul>
      </div>

      <h3>Dụng cụ và thiết bị cần chuẩn bị</h3>
      <ul>
        <li>Thiết bị 1</li>
        <li>Thiết bị 2</li>
        <li>Tài liệu tham khảo: ...</li>
      </ul>

      <h3>Các bước thực hành</h3>

      <div data-callout-type="tip" class="callout callout--tip">
        <p><strong>✏️ Bước 1: Chuẩn bị</strong></p>
        <p>Mô tả chi tiết bước chuẩn bị...</p>
      </div>

      <div data-callout-type="tip" class="callout callout--tip">
        <p><strong>✏️ Bước 2: Thực hiện</strong></p>
        <p>Mô tả chi tiết bước thực hiện...</p>
      </div>

      <div data-callout-type="tip" class="callout callout--tip">
        <p><strong>✏️ Bước 3: Kiểm tra kết quả</strong></p>
        <p>Mô tả cách kiểm tra và đánh giá kết quả...</p>
      </div>

      <h3>Báo cáo kết quả</h3>
      <p>Học viên ghi nhận kết quả thực hành theo mẫu sau:</p>
      <table>
        <tr><th>Hạng mục</th><th>Kết quả</th><th>Ghi chú</th></tr>
        <tr><td>Bước 1</td><td></td><td></td></tr>
        <tr><td>Bước 2</td><td></td><td></td></tr>
        <tr><td>Bước 3</td><td></td><td></td></tr>
      </table>
    `.trim().replace(/\n      /g, '\n'),
  },
  {
    id: 'case-study',
    title: 'Tình huống / Case study',
    description: 'Bối cảnh + phân tích + thảo luận + bài học rút ra',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
    content: `
      <h2>Tình huống: Tên tình huống</h2>
      <p>Giới thiệu tổng quan về tình huống sẽ phân tích.</p>

      <h3>Bối cảnh</h3>
      <p>Mô tả chi tiết bối cảnh tình huống: thời gian, địa điểm, các bên liên quan, điều kiện ban đầu...</p>

      <div data-callout-type="warning" class="callout callout--warning">
        <p><strong>📋 Thông tin tình huống</strong></p>
        <ul>
          <li><strong>Thời gian:</strong> ...</li>
          <li><strong>Địa điểm:</strong> ...</li>
          <li><strong>Các bên liên quan:</strong> ...</li>
          <li><strong>Kết quả:</strong> ...</li>
        </ul>
      </div>

      <h3>Diễn biến sự việc</h3>
      <p>Trình bày diễn biến theo trình tự thời gian...</p>

      <h3>Câu hỏi phân tích</h3>
      <ol>
        <li>Nguyên nhân chính dẫn đến tình huống này là gì?</li>
        <li>Những quyết định nào đã được đưa ra? Đúng hay sai?</li>
        <li>Nếu bạn là người ra quyết định, bạn sẽ làm gì khác?</li>
        <li>Bài học rút ra cho thực tiễn công việc?</li>
      </ol>

      <h3>Thảo luận nhóm</h3>
      <p>Chia nhóm 4-5 người, thảo luận các câu hỏi trên trong 15 phút, sau đó trình bày trước lớp.</p>

      <div data-callout-type="info" class="callout callout--info">
        <p><strong>📝 Bài học rút ra</strong></p>
        <p>Tóm tắt những bài học quan trọng từ tình huống này...</p>
      </div>
    `.trim().replace(/\n      /g, '\n'),
  },
];
