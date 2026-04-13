import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * Paste Handler — cleans Word HTML + handles clipboard/drag-drop images.
 *
 * Word cleanup: strips mso-* styles, MsoNormal classes, empty paragraphs,
 * normalizes Word headings → semantic <h2>/<h3>, fixes list formatting.
 *
 * Image handling: intercepts paste/drop events for image files,
 * uploads via provided upload function, inserts as Tiptap Image node.
 *
 * Pattern: Notion paste-cleanup + Google Docs paste-from-Word.
 */

// ── Word HTML Cleanup ──

const MSO_REGEX = /\s*(mso-[^:]+:[^;"]+;?)/gi;
const CLASS_MSO_REGEX = /\s*class\s*=\s*"[^"]*Mso[^"]*"/gi;
const STYLE_EMPTY_REGEX = /\s*style\s*=\s*"[\s;]*"/gi;
const COMMENT_REGEX = /<!--[\s\S]*?-->/g;
const XML_REGEX = /<\/?o:[^>]*>/g;
const NBSP_P_REGEX = /<p[^>]*>\s*(&nbsp;\s*)+<\/p>/gi;
const EMPTY_SPAN_REGEX = /<span[^>]*>\s*<\/span>/gi;
const FONT_TAGS_REGEX = /<\/?font[^>]*>/gi;
const COND_COMMENT_REGEX = /<!\[if[^>]*>[\s\S]*?<!\[endif\]>/gi;

/**
 * Fix escaped <video> tags in legacy content.
 * Old editor (without Video node) saved <video> as escaped text:
 * &lt;video src="..."&gt;&lt;/video&gt;
 * Convert back to proper HTML so Tiptap Video node can parse it.
 */
export function fixLegacyVideoTags(html: string): string {
  if (!html) return html;
  // Match escaped video tags: &lt;video src="..."...&gt;...&lt;/video&gt;
  return html.replace(
    /&lt;video\s+src=(?:&quot;|")([^"&]+)(?:&quot;|")[^&]*&gt;(?:&lt;\/video&gt;|<\/video>)/gi,
    '<video src="$1"></video>',
  );
}

export function cleanWordHTML(html: string): string {
  if (!html || !isWordHTML(html)) return html;

  let clean = html;

  // Remove Word conditional comments & XML namespaces
  clean = clean.replace(COND_COMMENT_REGEX, '');
  clean = clean.replace(COMMENT_REGEX, '');
  clean = clean.replace(XML_REGEX, '');

  // Strip mso-* inline styles
  clean = clean.replace(MSO_REGEX, '');

  // Remove MsoNormal and similar classes
  clean = clean.replace(CLASS_MSO_REGEX, '');

  // Remove empty style attributes left over
  clean = clean.replace(STYLE_EMPTY_REGEX, '');

  // Strip font tags
  clean = clean.replace(FONT_TAGS_REGEX, '');

  // Remove empty spans
  clean = clean.replace(EMPTY_SPAN_REGEX, '');

  // Remove empty &nbsp; paragraphs
  clean = clean.replace(NBSP_P_REGEX, '');

  // Normalize <b> → <strong>, <i> → <em>
  clean = clean.replace(/<b(\s|>)/gi, '<strong$1');
  clean = clean.replace(/<\/b>/gi, '</strong>');
  clean = clean.replace(/<i(\s|>)/gi, '<em$1');
  clean = clean.replace(/<\/i>/gi, '</em>');

  // Strip remaining junk inline styles (font-family, font-size from Word)
  clean = clean.replace(/\s*font-family:[^;"]+;?/gi, '');
  clean = clean.replace(/\s*font-size:[^;"]+;?/gi, '');
  clean = clean.replace(/\s*color:\s*(?:windowtext|black);?/gi, '');
  clean = clean.replace(/\s*background:\s*(?:white|transparent);?/gi, '');
  clean = clean.replace(/\s*line-height:\s*normal;?/gi, '');
  clean = clean.replace(/\s*text-indent:[^;"]+;?/gi, '');
  clean = clean.replace(/\s*margin-bottom:\s*\.0001pt;?/gi, '');
  clean = clean.replace(/\s*margin:[^;"]*0cm[^;"]*;?/gi, '');

  // Clean up empty style attributes again after all stripping
  clean = clean.replace(STYLE_EMPTY_REGEX, '');

  // Normalize Word heading styles → semantic headings
  // Word often uses <p class="MsoHeading1"> or <p style="..."> with specific font sizes
  clean = normalizeWordHeadings(clean);

  // Remove multiple consecutive <br>
  clean = clean.replace(/(<br\s*\/?>){3,}/gi, '<br><br>');

  // Trim whitespace between tags
  clean = clean.replace(/>\s+</g, '> <');

  return clean.trim();
}

function isWordHTML(html: string): boolean {
  return /class\s*=\s*"[^"]*Mso/i.test(html) ||
    /xmlns:o\s*=/i.test(html) ||
    /xmlns:w\s*=/i.test(html) ||
    /mso-/i.test(html) ||
    /<o:p>/i.test(html);
}

function normalizeWordHeadings(html: string): string {
  // Convert Word heading paragraphs to semantic headings
  // <p class="MsoTitle..."> → <h1>
  // <p class="MsoHeading1"> → <h2>  (we use h2 as top-level in content)
  // <p class="MsoHeading2"> → <h3>
  let result = html;

  // Title → h2 (top-level content heading)
  result = result.replace(
    /<p[^>]*class="[^"]*MsoTitle[^"]*"[^>]*>([\s\S]*?)<\/p>/gi,
    '<h2>$1</h2>',
  );

  // Heading 1 → h2
  result = result.replace(
    /<p[^>]*class="[^"]*MsoHeading1[^"]*"[^>]*>([\s\S]*?)<\/p>/gi,
    '<h2>$1</h2>',
  );

  // Heading 2 → h3
  result = result.replace(
    /<p[^>]*class="[^"]*MsoHeading2[^"]*"[^>]*>([\s\S]*?)<\/p>/gi,
    '<h3>$1</h3>',
  );

  // Heading 3 → h4
  result = result.replace(
    /<p[^>]*class="[^"]*MsoHeading3[^"]*"[^>]*>([\s\S]*?)<\/p>/gi,
    '<h4>$1</h4>',
  );

  return result;
}

// ── Tiptap Extension ──

export interface PasteHandlerOptions {
  uploadImage?: (file: File) => Promise<string>;
}

export const PasteHandler = Extension.create<PasteHandlerOptions>({
  name: 'pasteHandler',

  addOptions() {
    return { uploadImage: undefined };
  },

  addProseMirrorPlugins() {
    const uploadImage = this.options.uploadImage;

    return [
      new Plugin({
        key: new PluginKey('pasteHandler'),
        props: {
          // ── Word HTML cleanup on paste ──
          transformPastedHTML(html) {
            return cleanWordHTML(html);
          },

          // ── Clipboard image paste (Ctrl+V) ──
          handlePaste(view, event) {
            if (!uploadImage) return false;

            const items = event.clipboardData?.items;
            if (!items) return false;

            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.type.startsWith('image/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (!file) continue;

                // Insert placeholder
                const { tr, schema } = view.state;
                const placeholder = schema.text('Đang tải ảnh...');
                const italicMark = schema.marks['italic']?.create();
                const node = italicMark
                  ? placeholder.mark([italicMark])
                  : placeholder;
                const insertPos = tr.selection.from;
                view.dispatch(tr.replaceSelectionWith(
                  schema.nodes['paragraph'].create(null, node),
                ));

                // Upload and replace placeholder
                uploadImage(file).then((url) => {
                  if (!url) return;
                  const { tr: tr2 } = view.state;
                  const imageNode = schema.nodes['resizableImage']?.create({ src: url });
                  if (!imageNode) return;

                  // Find and replace placeholder
                  view.state.doc.descendants((n, pos) => {
                    if (n.isText && n.text === 'Đang tải ảnh...') {
                      const parent = view.state.doc.resolve(pos).parent;
                      const parentPos = pos - 1;
                      view.dispatch(
                        tr2.replaceWith(parentPos, parentPos + parent.nodeSize, imageNode),
                      );
                      return false;
                    }
                    return true;
                  });
                });

                return true;
              }
            }

            return false;
          },

          // ── Drag-drop image ──
          handleDrop(view, event) {
            if (!uploadImage) return false;

            const files = event.dataTransfer?.files;
            if (!files || files.length === 0) return false;

            const imageFiles = Array.from(files).filter((f) =>
              f.type.startsWith('image/'),
            );
            if (imageFiles.length === 0) return false;

            event.preventDefault();

            // Get drop position
            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (!coordinates) return false;

            // Upload each image
            for (const file of imageFiles) {
              uploadImage(file).then((url) => {
                if (!url) return;
                const { schema } = view.state;
                const imageNode = schema.nodes['resizableImage']?.create({ src: url });
                if (!imageNode) return;
                const tr = view.state.tr.insert(coordinates.pos, imageNode);
                view.dispatch(tr);
              });
            }

            return true;
          },
        },
      }),
    ];
  },
});
