import { Injectable } from '@angular/core';
import { Source } from '../../domain/types';

/**
 * Map source from AI Service (snake_case) to Frontend (camelCase)
 * AI Service returns: image_url, page_number, document_id, bounding_boxes
 * Frontend expects: imageUrl, pageNumber, documentId, boundingBoxes
 */
export function mapSourceToFrontend(source: any): Source {
  return {
    title: source.title || '',
    content: source.content || '',
    url: source.url || source.image_url,
    imageUrl: source.imageUrl || source.image_url,
    pageNumber: source.pageNumber ?? source.page_number,
    documentId: source.documentId || source.document_id,
    boundingBoxes: (source.boundingBoxes || source.bounding_boxes || []).map((box: any) => ({
      x0: box.x0,
      y0: box.y0,
      x1: box.x1,
      y1: box.y1
    }))
  };
}

/**
 * ContentClassifierService - Classifies streaming content into categories
 *
 * Extracted from ChatService to improve testability and separation of concerns.
 * Handles detection of:
 * - Status messages (e.g., "Đang phân tích...")
 * - Real thinking content (AI reasoning process)
 * - Source mapping (snake_case → camelCase)
 */
@Injectable({ providedIn: 'root' })
export class ContentClassifierService {

  /**
   * Patterns that indicate STATUS messages (not real thinking or answer).
   * These are short status updates like "Đang phân tích...", "Đang tra cứu..."
   * They should NOT be shown in thinking panel or answer, just SKIPPED.
   */
  private readonly STATUS_PATTERNS: RegExp[] = [
    /^Đang phân tích/,
    /^Đang tra cứu/,
    /^Đang tìm kiếm/,
    /^Đang xử lý/,
    /^Đang tổng hợp/,
    /^Đang bắt đầu/,
    /^Đang tổng hợp câu trả lời/,
    /^Đang kiểm tra/,
    /^Đang truy vấn/,
    /^Đang kết nối/,
    /^Đang đọc/,
    /^Đang chuẩn bị/,
    /^Analyzing/i,
    /^Searching/i,
    /^Processing/i,
    /^Starting/i,
    /^Checking/i,
    /^Querying/i,
    /^Connecting/i,
    /^Reading/i,
    /^Preparing/i,
  ];

  /**
   * Patterns that indicate REAL THINKING content (AI reasoning process).
   * These should be stored in thinking panel, not in main answer.
   */
  private readonly REAL_THINKING_PATTERNS: RegExp[] = [
    /^Người dùng/,
    /^Tôi cần/,
    /^Tôi sẽ/,
    /^Tôi nhận thấy/,
    /^Tôi hiểu/,
    /^Tôi đang/,
    /^Câu hỏi này/,
    /^Đây là/,
    /^Để trả lời/,
    /^Theo như/,
    /^Dựa trên/,
    /^Với câu hỏi/,
    /^Xem xét/,
    /^Phân tích:/,
    /^Suy nghĩ:/,
    /^The user/i,
    /^I need to/i,
    /^I will/i,
    /^I understand/i,
    /^This question/i,
    /^Let me/i,
    /^Thinking:/i,
  ];

  /** Track if we're in status phase (receiving status messages before real content) */
  inStatusPhase = false;

  /** Track if we're receiving real thinking content */
  private isReceivingThinking = false;

  /**
   * Check if content is a STATUS message (not real thinking or answer).
   * Status messages are short updates about what AI is doing.
   * They should be SKIPPED, not added to thinking or answer.
   */
  isStatusMessage(content: string): boolean {
    if (!content) return false;
    const trimmed = content.trim();

    if (trimmed.length > 200) return false;

    const matchesStatus = this.STATUS_PATTERNS.some(pattern => pattern.test(trimmed));
    if (matchesStatus) {
      this.inStatusPhase = true;
      return true;
    }

    if (this.inStatusPhase && trimmed.length < 100 && trimmed.includes('...')) {
      return true;
    }

    return false;
  }

  /**
   * Check if content is REAL THINKING (AI reasoning process).
   * This should be stored in thinking panel.
   */
  isRealThinkingContent(content: string): boolean {
    if (!content) return false;
    const trimmed = content.trim();

    if (this.isReceivingThinking) {
      if (trimmed.length < 30) return true;

      const matchesThinking = this.REAL_THINKING_PATTERNS.some(p => p.test(trimmed));
      if (matchesThinking) return true;

      if (trimmed.startsWith('Tôi ') || trimmed.startsWith('Người ') ||
        trimmed.startsWith('Để ') || trimmed.startsWith('Theo ')) {
        return true;
      }

      this.isReceivingThinking = false;
      return false;
    }

    const matchesThinking = this.REAL_THINKING_PATTERNS.some(pattern => pattern.test(trimmed));
    if (matchesThinking) {
      this.isReceivingThinking = true;
      return true;
    }

    return false;
  }

  /** Reset status/thinking phase trackers (call at start of new message) */
  resetPhase(): void {
    this.inStatusPhase = false;
    this.isReceivingThinking = false;
  }

  /** Map sources from AI Service (snake_case) to Frontend (camelCase) */
  mapSourcesToFrontend(sources: any[]): Source[] {
    if (!sources || !Array.isArray(sources)) return [];
    return sources.map(mapSourceToFrontend);
  }
}
