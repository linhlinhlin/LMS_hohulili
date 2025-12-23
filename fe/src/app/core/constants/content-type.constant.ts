/**
 * SOTA 2025 Maritime Theme - Content Type Configuration
 * Bảng màu chuẩn ngành Hàng hải với độ bão hòa vừa phải
 * 
 * Ý nghĩa màu sắc:
 * - Blue (Sea): Video/Bài giảng - Đại dương / Tin cậy
 * - Amber (Manual): Tài liệu/PDF - Phao tiêu cảnh báo / Chỉ dẫn  
 * - Rose (Critical): Bài thi/Kiểm tra - Nguy hiểm / Cần chứng chỉ
 * - Emerald (Safe): Thực hành/Mô phỏng - An toàn / Luồng xanh
 * - Indigo (Tech): SCORM/Tương tác - Công nghệ / Thiết bị điện tử
 * - Slate: Text/Văn bản - Nội dung cơ bản
 */
export const CONTENT_TYPE_CONFIG = {
    // Text/Văn bản - Nội dung cơ bản
    TEXT: {
        color: 'bg-slate-500',
        label: 'Văn bản bài giảng',
        icon: 'file-text',
        indicatorColor: 'bg-slate-500',
        hoverBg: 'hover:bg-slate-50',
        borderColor: 'border-slate-200'
    },
    // Video - Đại dương / Tin cậy
    VIDEO: {
        color: 'bg-blue-500',
        label: 'Video bài giảng',
        icon: 'play-circle',
        indicatorColor: 'bg-blue-500',
        hoverBg: 'hover:bg-blue-50',
        borderColor: 'border-blue-200'
    },
    // File/Tài liệu - Phao tiêu cảnh báo / Chỉ dẫn
    FILE: {
        color: 'bg-amber-500',
        label: 'Tài liệu kỹ thuật',
        icon: 'file-text',
        indicatorColor: 'bg-amber-500',
        hoverBg: 'hover:bg-amber-50',
        borderColor: 'border-amber-200'
    },
    DOCUMENT: {
        color: 'bg-amber-500',
        label: 'Tài liệu hướng dẫn',
        icon: 'file-text',
        indicatorColor: 'bg-amber-500',
        hoverBg: 'hover:bg-amber-50',
        borderColor: 'border-amber-200'
    },
    PDF: {
        color: 'bg-amber-500',
        label: 'Tài liệu PDF',
        icon: 'file-text',
        indicatorColor: 'bg-amber-500',
        hoverBg: 'hover:bg-amber-50',
        borderColor: 'border-amber-200'
    },
    // Quiz - Nguy hiểm / Cần chứng chỉ
    QUIZ: {
        color: 'bg-rose-500',
        label: 'Đánh giá năng lực',
        icon: 'clipboard-check',
        indicatorColor: 'bg-rose-500',
        hoverBg: 'hover:bg-rose-50',
        borderColor: 'border-rose-200'
    },
    // Practice - An toàn / Luồng xanh
    PRACTICE: {
        color: 'bg-emerald-500',
        label: 'Thực hành mô phỏng',
        icon: 'anchor',
        indicatorColor: 'bg-emerald-500',
        hoverBg: 'hover:bg-emerald-50',
        borderColor: 'border-emerald-200'
    },
    // SCORM - Công nghệ / Thiết bị điện tử
    SCORM: {
        color: 'bg-indigo-500',
        label: 'Bài học tương tác',
        icon: 'cpu',
        indicatorColor: 'bg-indigo-500',
        hoverBg: 'hover:bg-indigo-50',
        borderColor: 'border-indigo-200'
    }
} as const;

export type ContentType = keyof typeof CONTENT_TYPE_CONFIG;

/**
 * Helper function to get content type configuration
 * @param type - Content type string (e.g., 'VIDEO', 'FILE', 'QUIZ')
 * @returns Configuration object with color, label, icon, etc.
 */
export function getContentTypeConfig(type: string | null | undefined) {
    const key = (type || 'TEXT').toUpperCase() as ContentType;
    return CONTENT_TYPE_CONFIG[key] || CONTENT_TYPE_CONFIG.TEXT;
}

/**
 * Helper function to get indicator color class for sidebar
 * @param type - Content type string
 * @returns Tailwind CSS class for indicator color
 */
export function getTypeIndicatorColor(type: string | null | undefined): string {
    return getContentTypeConfig(type).indicatorColor;
}

/**
 * Helper function to get content type label
 * @param type - Content type string
 * @returns Human-readable label
 */
export function getTypeLabel(type: string | null | undefined): string {
    return getContentTypeConfig(type).label;
}
