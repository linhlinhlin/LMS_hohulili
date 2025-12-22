/**
 * MessageSource Value Object
 * Represents a source citation from AI response
 */
import { MessageSource } from '../types';

/**
 * Create a MessageSource
 */
export function createMessageSource(
  title: string,
  content: string,
  url?: string
): MessageSource {
  return {
    title,
    content,
    url,
  };
}

/**
 * Check if source has URL
 */
export function hasSourceUrl(source: MessageSource): boolean {
  return !!source.url;
}

/**
 * Get truncated content for preview
 */
export function getSourcePreview(
  source: MessageSource,
  maxLength: number = 100
): string {
  if (source.content.length <= maxLength) {
    return source.content;
  }
  return source.content.substring(0, maxLength) + '...';
}

/**
 * Validate MessageSource has required fields
 */
export function isValidSource(source: unknown): source is MessageSource {
  if (!source || typeof source !== 'object') return false;
  const s = source as Record<string, unknown>;
  return (
    typeof s['title'] === 'string' &&
    typeof s['content'] === 'string' &&
    (s['url'] === undefined || typeof s['url'] === 'string')
  );
}

/**
 * Sort sources by title
 */
export function sortSourcesByTitle(sources: MessageSource[]): MessageSource[] {
  return [...sources].sort((a, b) => a.title.localeCompare(b.title));
}

// Re-export type
export type { MessageSource };

