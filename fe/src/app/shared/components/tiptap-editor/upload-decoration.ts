import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * Upload Decoration — inline placeholder widget at cursor while uploading.
 *
 * Pattern: FloGeez/angular-tiptap-editor UploadProgress extension.
 * Instead of an overlay on the whole editor, shows a skeleton card
 * exactly where the uploaded image/video will appear.
 *
 * Usage: call `showUploadDecoration(editor, message)` to show,
 *        `hideUploadDecoration(editor)` to remove.
 */

const UPLOAD_PLUGIN_KEY = new PluginKey('uploadDecoration');

// ── Public API ──

export function showUploadDecoration(editor: any, message: string, pos?: number): void {
  const { tr } = editor.state;
  tr.setMeta(UPLOAD_PLUGIN_KEY, {
    action: 'show',
    message,
    pos: pos ?? tr.selection.from,
  });
  editor.view.dispatch(tr);
}

export function hideUploadDecoration(editor: any): void {
  const { tr } = editor.state;
  tr.setMeta(UPLOAD_PLUGIN_KEY, { action: 'hide' });
  editor.view.dispatch(tr);
}

// ── Extension ──

export const UploadDecoration = Extension.create({
  name: 'uploadDecoration',

  addProseMirrorPlugins() {
    // Inject styles once
    if (typeof document !== 'undefined' && !document.querySelector('#tt-upload-deco-styles')) {
      const style = document.createElement('style');
      style.id = 'tt-upload-deco-styles';
      style.textContent = `
        .tt-upload-deco {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 8px 0;
          padding: 14px 16px;
          background: #f8fafc;
          border: 2px dashed #cbd5e1;
          border-radius: 10px;
          animation: tt-deco-pulse 1.8s ease-in-out infinite;
          max-width: 360px;
        }
        .tt-upload-deco__spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #e2e8f0;
          border-top-color: #0056D2;
          border-radius: 50%;
          animation: ttSpin 0.7s linear infinite;
          flex-shrink: 0;
        }
        .tt-upload-deco__text {
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          line-height: 1.4;
        }
        @keyframes tt-deco-pulse {
          0%, 100% { background: #f8fafc; }
          50% { background: #f1f5f9; }
        }
        @keyframes ttSpin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    return [
      new Plugin({
        key: UPLOAD_PLUGIN_KEY,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, decoSet) {
            const meta = tr.getMeta(UPLOAD_PLUGIN_KEY);
            if (meta?.action === 'show') {
              const el = document.createElement('div');
              el.className = 'tt-upload-deco';
              el.innerHTML = `
                <div class="tt-upload-deco__spinner"></div>
                <span class="tt-upload-deco__text">${meta.message}</span>
              `;
              const deco = Decoration.widget(meta.pos, el, {
                side: 1,
                key: 'upload-progress',
              });
              return DecorationSet.create(tr.doc, [deco]);
            }
            if (meta?.action === 'hide') {
              return DecorationSet.empty;
            }
            // Map existing decorations through document changes
            return decoSet.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return UPLOAD_PLUGIN_KEY.getState(state);
          },
        },
      }),
    ];
  },
});
