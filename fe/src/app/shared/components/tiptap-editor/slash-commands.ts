import { Extension } from '@tiptap/core';
import { Suggestion, type SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';

/**
 * Slash Commands — Notion-style "/" menu for Tiptap.
 *
 * Gõ "/" bất kỳ đâu → dropdown phân loại hiện ra.
 * Gõ tiếp để lọc: "/meo" → chỉ còn "Mẹo hay".
 * Keyboard: ↑↓ + Enter để chọn.
 *
 * Categories:
 * - Cơ bản: headings, lists, blockquote, divider
 * - Hộp nội dung: callout types + details toggle
 * - Media: image, youtube, table, code
 * - Mẫu bài giảng (C4L): pre-configured templates
 */

export interface SlashCommandItem {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string; // SVG string
  command: (editor: Editor) => void;
  aliases?: string[];
}

// ── SVG Icons (16×16, stroke-based, professional) ──

const ICONS = {
  h2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>',
  h3: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 01-2 2m2 0a2 2 0 01-2 2c-1.7 0-3-1.5-3.5-2.5"/></svg>',
  bulletList: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="5" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="5" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>',
  orderedList: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="4" y="8" font-size="8" fill="currentColor" stroke="none" font-weight="600">1</text><text x="4" y="14" font-size="8" fill="currentColor" stroke="none" font-weight="600">2</text><text x="4" y="20" font-size="8" fill="currentColor" stroke="none" font-weight="600">3</text></svg>',
  blockquote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
  divider: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="13" y2="6" opacity="0.3"/><line x1="3" y1="18" x2="16" y2="18" opacity="0.3"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  tip: '<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>',
  danger: '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M3.44 19.79L11.12 3.47a1 1 0 011.76 0l7.68 16.32A1 1 0 0119.68 21H4.32a1 1 0 01-.88-1.21z"/></svg>',
  toggle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/><rect x="3" y="3" width="18" height="18" rx="3" stroke-opacity="0.3"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>',
  table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  concept: '<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
  objective: '<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  safety: '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
  exercise: '<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="13" y2="11"/></svg>',
  readMore: '<svg viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
};

// ── Slash Command Items ──

export function getSlashCommandItems(): SlashCommandItem[] {
  return [
    // ── Cơ bản ──
    {
      id: 'heading2',
      title: 'Tiêu đề lớn',
      description: 'Tiêu đề mục chính',
      category: 'Cơ bản',
      icon: ICONS.h2,
      aliases: ['h2', 'heading', 'tieu de'],
      command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'heading3',
      title: 'Tiêu đề nhỏ',
      description: 'Tiêu đề mục phụ',
      category: 'Cơ bản',
      icon: ICONS.h3,
      aliases: ['h3', 'subheading', 'tieu de nho'],
      command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: 'bulletList',
      title: 'Danh sách',
      description: 'Danh sách không thứ tự',
      category: 'Cơ bản',
      icon: ICONS.bulletList,
      aliases: ['ul', 'bullet', 'danh sach'],
      command: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'orderedList',
      title: 'Danh sách số',
      description: 'Danh sách có thứ tự',
      category: 'Cơ bản',
      icon: ICONS.orderedList,
      aliases: ['ol', 'numbered', 'so thu tu'],
      command: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'blockquote',
      title: 'Trích dẫn',
      description: 'Đoạn trích dẫn nổi bật',
      category: 'Cơ bản',
      icon: ICONS.blockquote,
      aliases: ['quote', 'trich dan'],
      command: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'divider',
      title: 'Đường ngăn cách',
      description: 'Chia tách nội dung thành phần',
      category: 'Cơ bản',
      icon: ICONS.divider,
      aliases: ['hr', 'line', 'ngan cach'],
      command: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },

    // ── Hộp nội dung ──
    {
      id: 'callout-info',
      title: 'Thông tin',
      description: 'Hộp thông tin quan trọng',
      category: 'Hộp nội dung',
      icon: ICONS.info,
      aliases: ['info', 'thong tin', 'note'],
      command: (editor) => editor.chain().focus().setCallout({ type: 'info' }).run(),
    },
    {
      id: 'callout-warning',
      title: 'Lưu ý',
      description: 'Hộp lưu ý, nhắc nhở',
      category: 'Hộp nội dung',
      icon: ICONS.warning,
      aliases: ['warning', 'luu y', 'caution'],
      command: (editor) => editor.chain().focus().setCallout({ type: 'warning' }).run(),
    },
    {
      id: 'callout-tip',
      title: 'Mẹo hay',
      description: 'Hộp mẹo, gợi ý hữu ích',
      category: 'Hộp nội dung',
      icon: ICONS.tip,
      aliases: ['tip', 'meo', 'hint', 'goi y'],
      command: (editor) => editor.chain().focus().setCallout({ type: 'tip' }).run(),
    },
    {
      id: 'callout-danger',
      title: 'Cảnh báo',
      description: 'Hộp cảnh báo nguy hiểm',
      category: 'Hộp nội dung',
      icon: ICONS.danger,
      aliases: ['danger', 'canh bao', 'error', 'nguy hiem'],
      command: (editor) => editor.chain().focus().setCallout({ type: 'danger' }).run(),
    },
    {
      id: 'details',
      title: 'Ẩn/hiện nội dung',
      description: 'Nội dung mở rộng khi nhấn',
      category: 'Hộp nội dung',
      icon: ICONS.toggle,
      aliases: ['toggle', 'details', 'accordion', 'an hien', 'mo rong'],
      command: (editor) =>
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'details',
            content: [
              { type: 'detailsSummary', content: [{ type: 'text', text: 'Nhấn để xem thêm' }] },
              { type: 'detailsContent', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nội dung chi tiết...' }] }] },
            ],
          })
          .run(),
    },

    // ── Media ──
    {
      id: 'image',
      title: 'Hình ảnh',
      description: 'Tải ảnh lên từ máy tính',
      category: 'Media',
      icon: ICONS.image,
      aliases: ['img', 'photo', 'hinh anh', 'anh'],
      command: (editor) => {
        // Trigger file input — handled by component
        (editor.view.dom.closest('app-tiptap-editor') as any)
          ?.__triggerImageUpload?.();
      },
    },
    {
      id: 'youtube',
      title: 'Video YouTube',
      description: 'Nhúng video YouTube',
      category: 'Media',
      icon: ICONS.youtube,
      aliases: ['video', 'yt'],
      command: (editor) => {
        // Trigger YouTube input bar via component method
        (editor.view.dom.closest('app-tiptap-editor') as any)
          ?.__triggerYoutubeInput?.();
      },
    },
    {
      id: 'table',
      title: 'Bảng',
      description: 'Bảng dữ liệu có hàng và cột',
      category: 'Media',
      icon: ICONS.table,
      aliases: ['bang', 'grid'],
      command: (editor) =>
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      id: 'codeBlock',
      title: 'Code',
      description: 'Khối mã nguồn với tô màu cú pháp',
      category: 'Media',
      icon: ICONS.code,
      aliases: ['ma nguon', 'pre'],
      command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    },

    // ── Mẫu bài giảng (C4L) ──
    {
      id: 'tpl-concept',
      title: 'Khái niệm chính',
      description: 'Nêu bật khái niệm cần ghi nhớ',
      category: 'Mẫu bài giảng',
      icon: ICONS.concept,
      aliases: ['khai niem', 'concept', 'dinh nghia'],
      command: (editor) =>
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'callout',
            attrs: { type: 'info' },
            content: [
              { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '📖 Khái niệm chính' }] },
              { type: 'paragraph', content: [{ type: 'text', text: 'Nhập khái niệm quan trọng mà học viên cần ghi nhớ...' }] },
            ],
          })
          .run(),
    },
    {
      id: 'tpl-objective',
      title: 'Mục tiêu bài học',
      description: 'Liệt kê kết quả học tập',
      category: 'Mẫu bài giảng',
      icon: ICONS.objective,
      aliases: ['muc tieu', 'objective', 'ket qua'],
      command: (editor) =>
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'callout',
            attrs: { type: 'info' },
            content: [
              { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '🎯 Mục tiêu bài học' }] },
              { type: 'paragraph', content: [{ type: 'text', text: 'Sau bài học này, học viên sẽ:' }] },
              { type: 'bulletList', content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hiểu được...' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Áp dụng được...' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Phân tích được...' }] }] },
              ]},
            ],
          })
          .run(),
    },
    {
      id: 'tpl-safety',
      title: 'Cảnh báo an toàn',
      description: 'Quy tắc an toàn khi thực hành',
      category: 'Mẫu bài giảng',
      icon: ICONS.safety,
      aliases: ['an toan', 'safety', 'nguy hiem'],
      command: (editor) =>
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'callout',
            attrs: { type: 'danger' },
            content: [
              { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '⚠️ Lưu ý an toàn' }] },
              { type: 'paragraph', content: [{ type: 'text', text: 'Khi thực hành, học viên cần tuân thủ:' }] },
              { type: 'bulletList', content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mang đầy đủ thiết bị bảo hộ' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Không thao tác khi chưa được hướng dẫn' }] }] },
              ]},
            ],
          })
          .run(),
    },
    {
      id: 'tpl-exercise',
      title: 'Bài tập thực hành',
      description: 'Hướng dẫn thực hành từng bước',
      category: 'Mẫu bài giảng',
      icon: ICONS.exercise,
      aliases: ['bai tap', 'thuc hanh', 'exercise', 'lab'],
      command: (editor) =>
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'callout',
            attrs: { type: 'tip' },
            content: [
              { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '✏️ Bài tập thực hành' }] },
              { type: 'paragraph', content: [{ type: 'text', text: 'Thực hiện theo các bước sau:' }] },
              { type: 'orderedList', content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bước 1: ...' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bước 2: ...' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bước 3: ...' }] }] },
              ]},
            ],
          })
          .run(),
    },
    {
      id: 'tpl-readmore',
      title: 'Đọc thêm',
      description: 'Tài liệu tham khảo bổ sung',
      category: 'Mẫu bài giảng',
      icon: ICONS.readMore,
      aliases: ['doc them', 'tai lieu', 'reference', 'read more'],
      command: (editor) =>
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'details',
            content: [
              { type: 'detailsSummary', content: [{ type: 'text', text: '📚 Tài liệu đọc thêm' }] },
              { type: 'detailsContent', content: [
                { type: 'paragraph', content: [{ type: 'text', text: '• Tên tài liệu — Tác giả (Năm)' }] },
                { type: 'paragraph', content: [{ type: 'text', text: '• Link tham khảo: ...' }] },
              ]},
            ],
          })
          .run(),
    },
  ];
}

// ── Slash Command Extension ──

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        pluginKey: new PluginKey('slashCommands'),
        command: ({ editor, range, props }: { editor: Editor; range: any; props: SlashCommandItem }) => {
          // Delete the "/" trigger text
          editor.chain().focus().deleteRange(range).run();
          // Execute the command
          props.command(editor);
        },
        items: ({ query }: { query: string }) => {
          const allItems = getSlashCommandItems();
          if (!query) return allItems;

          const q = query.toLowerCase();
          return allItems.filter(
            (item) =>
              item.title.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q) ||
              item.aliases?.some((a) => a.includes(q)),
          );
        },
      } as Partial<SuggestionOptions<SlashCommandItem>>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
