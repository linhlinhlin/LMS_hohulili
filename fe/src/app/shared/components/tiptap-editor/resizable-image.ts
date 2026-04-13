import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';

/**
 * Resizable Image — custom Tiptap node with drag-to-resize handles.
 *
 * Pattern: FloGeez/angular-tiptap-editor ResizableImage.
 * Features:
 * - Drag handles on left/right sides (E/W)
 * - Aspect ratio locked during resize
 * - Width/height saved to node attrs → persisted in HTML
 * - Click to select → shows resize controls
 * - Alt text support for accessibility
 *
 * Replaces basic @tiptap/extension-image.
 */

export interface ResizableImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setResizableImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: number;
        height?: number;
      }) => ReturnType;
    };
  }
}

export const ResizableImage = Node.create<ResizableImageOptions>({
  name: 'resizableImage',

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.getAttribute('width');
          return w ? parseInt(w, 10) : null;
        },
        renderHTML: (attrs) => (attrs['width'] ? { width: attrs['width'] } : {}),
      },
      height: {
        default: null,
        parseHTML: (el) => {
          const h = el.getAttribute('height');
          return h ? parseInt(h, 10) : null;
        },
        renderHTML: (attrs) => (attrs['height'] ? { height: attrs['height'] } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      setResizableImage:
        (options) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: options }, { updateSelection: true }),
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/,
        type: this.type,
        getAttributes: (match) => {
          const [, alt, src, title] = match;
          return { src, alt, title };
        },
      }),
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      // ── DOM structure ──
      const wrapper = document.createElement('div');
      wrapper.className = 'ri-wrapper';

      const container = document.createElement('div');
      container.className = 'ri-container';

      const img = document.createElement('img');
      img.src = node.attrs['src'];
      img.alt = node.attrs['alt'] || '';
      img.title = node.attrs['title'] || '';
      img.className = 'ri-img';
      if (node.attrs['width']) img.width = node.attrs['width'];
      if (node.attrs['height']) img.height = node.attrs['height'];

      container.appendChild(img);
      wrapper.appendChild(container);

      // ── Resize handles (E + W) ──
      const controls = document.createElement('div');
      controls.className = 'ri-controls';

      for (const dir of ['w', 'e']) {
        const handle = document.createElement('div');
        handle.className = `ri-handle ri-handle-${dir}`;
        handle.setAttribute('data-dir', dir);
        controls.appendChild(handle);
      }
      container.appendChild(controls);

      // ── Resize logic ──
      let isResizing = false;
      let startX = 0;
      let startWidth = 0;
      let aspectRatio = 1;

      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          aspectRatio = img.naturalWidth / img.naturalHeight;
        }
      };
      img.onerror = () => {
        // Fallback: use width/height from attrs if available
        if (node.attrs['width'] && node.attrs['height']) {
          aspectRatio = node.attrs['width'] / node.attrs['height'];
        }
      };

      const onMouseDown = (e: MouseEvent, dir: string) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        startWidth = parseInt(img.getAttribute('width') || '0') || node.attrs['width'] || img.naturalWidth;
        document.body.classList.add('ri-resizing');

        const onMouseMove = (e: MouseEvent) => {
          if (!isResizing) return;
          const dx = e.clientX - startX;
          let w = dir === 'e' ? startWidth + dx : startWidth - dx;
          w = Math.max(80, Math.min(1600, w));
          const h = Math.round(w / aspectRatio);
          img.setAttribute('width', String(Math.round(w)));
          img.setAttribute('height', String(h));
        };

        const onMouseUp = () => {
          isResizing = false;
          document.body.classList.remove('ri-resizing');
          const pos = typeof getPos === 'function' ? getPos() : undefined;
          if (typeof pos === 'number') {
            const w = parseInt(img.getAttribute('width') || '0');
            const h = parseInt(img.getAttribute('height') || '0');
            if (w && h) {
              editor.view.dispatch(
                editor.view.state.tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  width: w,
                  height: h,
                }),
              );
            }
          }
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };

      controls.addEventListener('mousedown', (e) => {
        const target = e.target as HTMLElement;
        const dir = target.getAttribute('data-dir');
        if (dir) onMouseDown(e, dir);
      });

      // ── Select/Deselect ──
      const selectNode = () => {
        wrapper.classList.add('ri-selected');
      };
      const deselectNode = () => {
        wrapper.classList.remove('ri-selected');
      };

      return {
        dom: wrapper,
        selectNode,
        deselectNode,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'resizableImage') return false;
          img.src = updatedNode.attrs['src'];
          img.alt = updatedNode.attrs['alt'] || '';
          img.title = updatedNode.attrs['title'] || '';
          if (updatedNode.attrs['width']) img.width = updatedNode.attrs['width'];
          if (updatedNode.attrs['height']) img.height = updatedNode.attrs['height'];
          return true;
        },
        stopEvent: (event: Event) => !!(event.target as HTMLElement).closest('.ri-controls'),
        ignoreMutation: () => true,
      };
    };
  },
});
