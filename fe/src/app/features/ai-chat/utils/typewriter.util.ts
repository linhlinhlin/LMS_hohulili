/**
 * Typewriter Utility
 * Simulates streaming text effect like ChatGPT/Claude
 * 
 * This is a temporary solution while waiting for real streaming API.
 * When AI Service supports SSE, this can be replaced with real streaming.
 * 
 * Created: 10/12/2025
 */

export interface TypewriterOptions {
  /** Characters per chunk (default: 3-5 random) */
  chunkSize?: number;
  /** Delay between chunks in ms (default: 20-40 random) */
  delayMs?: number;
  /** Callback for each chunk */
  onChunk: (text: string, isComplete: boolean) => void;
  /** Callback when complete */
  onComplete?: () => void;
  /** Callback for thinking section */
  onThinking?: (text: string) => void;
}

/**
 * Typewriter class for streaming text effect
 */
export class Typewriter {
  private abortController: AbortController | null = null;
  private isRunning = false;

  /**
   * Start typewriter effect
   * @param fullText - Complete text to stream
   * @param options - Typewriter options
   */
  async start(fullText: string, options: TypewriterOptions): Promise<void> {
    // Abort any existing animation
    this.stop();

    this.abortController = new AbortController();
    this.isRunning = true;

    const { onChunk, onComplete, onThinking } = options;

    // Parse thinking tags first
    const { thinking, mainAnswer } = this.parseThinkingTags(fullText);

    // Stream thinking section first (if exists)
    if (thinking && onThinking) {
      await this.streamText(thinking, {
        ...options,
        onChunk: (text, isComplete) => {
          onThinking(text);
        }
      });
      
      // Small pause between thinking and answer
      await this.delay(300);
    }

    // Stream main answer
    await this.streamText(mainAnswer, options);

    this.isRunning = false;
    onComplete?.();
  }

  /**
   * Stream text with typewriter effect
   */
  private async streamText(text: string, options: TypewriterOptions): Promise<void> {
    const { chunkSize = 0, delayMs = 0, onChunk } = options;
    
    let currentText = '';
    let index = 0;

    while (index < text.length && !this.abortController?.signal.aborted) {
      // Random chunk size for natural feel (3-8 chars)
      const size = chunkSize || Math.floor(Math.random() * 6) + 3;
      const chunk = text.slice(index, index + size);
      
      currentText += chunk;
      index += size;

      const isComplete = index >= text.length;
      onChunk(currentText, isComplete);

      if (!isComplete) {
        // Random delay for natural feel (15-35ms)
        const delay = delayMs || Math.floor(Math.random() * 20) + 15;
        await this.delay(delay);
      }
    }
  }

  /**
   * Parse thinking tags from response
   */
  private parseThinkingTags(text: string): { thinking: string | null; mainAnswer: string } {
    const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    const thinking = thinkingMatch ? thinkingMatch[1].trim() : null;
    const mainAnswer = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
    
    return { thinking, mainAnswer };
  }

  /**
   * Stop typewriter animation
   */
  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isRunning = false;
  }

  /**
   * Check if typewriter is running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, ms);
      
      // Handle abort
      this.abortController?.signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
}

/**
 * Create a typewriter instance
 */
export function createTypewriter(): Typewriter {
  return new Typewriter();
}

/**
 * Simple typewriter function for one-off use
 */
export async function typewriterEffect(
  text: string,
  onUpdate: (currentText: string) => void,
  onComplete?: () => void
): Promise<void> {
  const typewriter = new Typewriter();
  await typewriter.start(text, {
    onChunk: (currentText) => onUpdate(currentText),
    onComplete
  });
}

