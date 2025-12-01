/**
 * MarkdownRenderer Utility
 * Renders Markdown content to sanitized HTML
 * Supports: headings, bold, italic, lists, code blocks, links
 */

/**
 * Render Markdown string to HTML
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // Escape HTML entities first (security)
  html = escapeHtml(html);

  // Code blocks (must be before inline code)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${langClass}>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headings (h1-h6)
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Bold and italic (order matters)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Unordered lists
  html = html.replace(/^[\*\-]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^\*\*\*$/gm, '<hr>');

  // Line breaks (double newline = paragraph)
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`;
  }

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<[huo])/g, '$1');
  html = html.replace(/(<\/[huo][l1-6]?>)<\/p>/g, '$1');

  return html;
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * Strip all Markdown formatting and return plain text
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return '';

  let text = markdown;

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');

  // Remove headings markers
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove bold/italic markers
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/___(.+?)___/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');

  // Remove strikethrough
  text = text.replace(/~~(.+?)~~/g, '$1');

  // Remove links, keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove list markers
  text = text.replace(/^[\*\-]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');

  // Remove blockquote markers
  text = text.replace(/^>\s+/gm, '');

  // Remove horizontal rules
  text = text.replace(/^---$/gm, '');
  text = text.replace(/^\*\*\*$/gm, '');

  return text.trim();
}

/**
 * Check if string contains Markdown syntax
 */
export function hasMarkdown(text: string): boolean {
  if (!text) return false;

  const markdownPatterns = [
    /```[\s\S]*?```/, // Code blocks
    /`[^`]+`/, // Inline code
    /^#{1,6}\s+/m, // Headings
    /\*\*[^*]+\*\*/, // Bold
    /\*[^*]+\*/, // Italic
    /__[^_]+__/, // Bold alt
    /_[^_]+_/, // Italic alt
    /\[[^\]]+\]\([^)]+\)/, // Links
    /^[\*\-]\s+/m, // Unordered lists
    /^\d+\.\s+/m, // Ordered lists
  ];

  return markdownPatterns.some((pattern) => pattern.test(text));
}

/**
 * Get preview text from Markdown (first N characters, stripped)
 */
export function getMarkdownPreview(markdown: string, maxLength: number = 100): string {
  const plainText = stripMarkdown(markdown);
  if (plainText.length <= maxLength) {
    return plainText;
  }
  return plainText.substring(0, maxLength).trim() + '...';
}
