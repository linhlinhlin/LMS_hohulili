/**
 * MarkdownRenderer Utility
 * Renders Markdown content to sanitized HTML
 * Supports: headings, bold, italic, lists, code blocks, links
 * 
 * Updated: 10/12/2025 - Added parseAIResponse for <thinking> tags handling
 */

/**
 * Parsed AI response with thinking and main answer separated
 */
export interface ParsedAIResponse {
  thinking: string | null;
  mainAnswer: string;
}

/**
 * Parse AI response to extract <thinking> tags
 * AI responses may contain <thinking>...</thinking> tags for reasoning process
 * Similar to ChatGPT/Claude thinking display
 * 
 * @param answer - Raw AI response that may contain thinking tags
 * @returns Object with thinking content (if any) and main answer
 */
export function parseAIResponse(answer: string): ParsedAIResponse {
  if (!answer) {
    return { thinking: null, mainAnswer: '' };
  }

  // Match <thinking>...</thinking> tags (case insensitive, multiline)
  const thinkingMatch = answer.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  const thinking = thinkingMatch ? thinkingMatch[1].trim() : null;
  
  // Remove thinking tags from main answer
  const mainAnswer = answer.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
  
  return { thinking, mainAnswer };
}

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
    // Wrap in a relative container for the copy button
    return `<div class="code-block-wrapper"><pre><code${langClass}>${code.trim()}</code></pre></div>`;
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

  // Tables
  // 1. Match the whole table
  const tableRegex = /^\|(.+)\|\n\|([-:| ]+)\|\n((?:\|.*\|\n?)+)/gm;

  html = html.replace(tableRegex, (_match, headerStr, alignStr, bodyStr) => {
    const headers = headerStr.split('|').map((h: string) => h.trim()).filter((h: string) => h);
    const aligns = alignStr.split('|').map((a: string) => {
      a = a.trim();
      if (a.startsWith(':') && a.endsWith(':')) return 'center';
      if (a.endsWith(':')) return 'right';
      return 'left';
    }).filter((a: string) => a);

    const rows = bodyStr.trim().split('\n').map((row: string) => {
      return row.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell !== '');
    });

    let tableHtml = '<table><thead><tr>';
    headers.forEach((header: string, i: number) => {
      const align = aligns[i] || 'left';
      tableHtml += `<th style="text-align: ${align}">${header}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';

    rows.forEach((row: string[]) => {
      tableHtml += '<tr>';
      row.forEach((cell: string, i: number) => {
        const align = aligns[i] || 'left';
        tableHtml += `<td style="text-align: ${align}">${cell}</td>`;
      });
      tableHtml += '</tr>';
    });

    tableHtml += '</tbody></table>';
    return tableHtml;
  });

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
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    // Check if it was already wrapped in ul (simple heuristic)
    if (match.startsWith('<ul>')) return match;
    return `<ol>${match}</ol>`;
  });

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
  html = html.replace(/\n\n+/g, '</p><p>');
  
  // Single line breaks within paragraphs
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`;
  }

  // Clean up empty paragraphs and fix nesting
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>(<[huo])/g, '$1');
  html = html.replace(/(<\/[huo][l1-6]?>)<\/p>/g, '$1');
  html = html.replace(/<p>(<table)/g, '$1');
  html = html.replace(/(<\/table>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote)/g, '$1');
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
  html = html.replace(/<p>(<div)/g, '$1');
  html = html.replace(/(<\/div>)<\/p>/g, '$1');
  html = html.replace(/<p>(<hr)/g, '$1');
  html = html.replace(/(<hr>)<\/p>/g, '$1');
  
  // Remove <br> right after block elements
  html = html.replace(/(<\/h[1-6]>)<br>/g, '$1');
  html = html.replace(/(<\/ul>)<br>/g, '$1');
  html = html.replace(/(<\/ol>)<br>/g, '$1');
  html = html.replace(/(<\/table>)<br>/g, '$1');
  html = html.replace(/(<\/blockquote>)<br>/g, '$1');
  html = html.replace(/(<\/pre>)<br>/g, '$1');
  html = html.replace(/(<hr>)<br>/g, '$1');

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

