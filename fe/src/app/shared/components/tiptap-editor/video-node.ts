import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Video Node — custom Tiptap node for embedded video player.
 *
 * Renders <video> with controls, responsive container, and proper styling.
 * Supports: src, controls, poster attributes.
 * NodeView: custom DOM with play overlay + responsive wrapper.
 */

export interface VideoOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: { src: string; poster?: string }) => ReturnType;
    };
  }
}

export const Video = Node.create<VideoOptions>({
  name: 'video',

  group: 'block',

  atom: true, // Not editable content inside

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      poster: { default: null },
    };
  },

  parseHTML() {
    return [
      { tag: 'video[src]' },
      {
        tag: 'video',
        getAttrs: (el: HTMLElement) => {
          // Also match <video><source src="..."></video>
          const source = el.querySelector('source[src]');
          if (source) return { src: source.getAttribute('src') };
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        controls: true,
      }),
    ];
  },

  addCommands() {
    return {
      setVideo:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: options,
          }),
    };
  },

  addNodeView() {
    return ({ node, editor }) => {
      // ── Wrapper ──
      const wrapper = document.createElement('div');
      wrapper.className = 'vid-wrapper';

      const video = document.createElement('video');
      video.src = node.attrs['src'];
      video.controls = true;
      video.preload = 'metadata';
      video.className = 'vid-player';
      if (node.attrs['poster']) video.poster = node.attrs['poster'];

      wrapper.appendChild(video);

      // ── Select/Deselect ──
      const selectNode = () => wrapper.classList.add('vid-selected');
      const deselectNode = () => wrapper.classList.remove('vid-selected');

      return {
        dom: wrapper,
        selectNode,
        deselectNode,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'video') return false;
          video.src = updatedNode.attrs['src'];
          if (updatedNode.attrs['poster']) video.poster = updatedNode.attrs['poster'];
          return true;
        },
        stopEvent: (event: Event) => {
          // Allow video controls to work
          return event.target === video;
        },
      };
    };
  },
});
