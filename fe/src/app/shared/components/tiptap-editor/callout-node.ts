import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Callout / Admonition block for Tiptap — Docusaurus/GitBook pattern.
 *
 * 4 types: info (Thông tin), warning (Lưu ý), tip (Mẹo hay), danger (Cảnh báo).
 * Renders as: <div data-callout-type="info" class="callout callout--info">
 *
 * Teacher chọn qua toolbar dropdown hoặc slash command "/".
 */

export type CalloutType = 'info' | 'warning' | 'tip' | 'danger';

export interface CalloutOptions {
  HTMLAttributes: Record<string, any>;
  types: CalloutType[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { type?: CalloutType }) => ReturnType;
      toggleCallout: (attrs?: { type?: CalloutType }) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: 'callout',

  group: 'block',

  content: 'block+',

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      types: ['info', 'warning', 'tip', 'danger'],
    };
  },

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-callout-type') || 'info',
        renderHTML: (attributes) => ({
          'data-callout-type': attributes['type'],
          class: `callout callout--${attributes['type']}`,
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-callout-type]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attrs),

      toggleCallout:
        (attrs) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, attrs),

      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      // Mod+Shift+C to toggle callout
      'Mod-Shift-c': () => this.editor.commands.toggleCallout({ type: 'info' }),
    };
  },
});
