/**
 * Value Object: Message Content
 * Immutable object representing message content with business rules
 */
export class MessageContent {
  private readonly value: string;

  constructor(content: string) {
    this.value = content.trim();
    this.validate();
  }

  /**
   * Business Rules Validation
   */
  private validate(): void {
    if (!this.value) {
      throw new Error('Message content cannot be empty');
    }

    if (this.value.length > 5000) {
      throw new Error('Message content cannot exceed 5000 characters');
    }

    // Check for excessive whitespace
    if (this.hasExcessiveWhitespace()) {
      throw new Error('Message content contains excessive whitespace');
    }

    // Check for potentially harmful content (basic validation)
    if (this.containsPotentiallyHarmfulContent()) {
      throw new Error('Message content contains potentially harmful content');
    }
  }

  /**
   * Business Logic Methods
   */

  /**
   * Get the content value
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * Get content length
   */
  public getLength(): number {
    return this.value.length;
  }

  /**
   * Check if content is short
   */
  public isShort(): boolean {
    return this.value.length < 50;
  }

  /**
   * Check if content is long
   */
  public isLong(): boolean {
    return this.value.length > 1000;
  }

  /**
   * Get word count
   */
  public getWordCount(): number {
    // Split by whitespace and filter out empty strings
    return this.value.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Check if content contains URLs
   */
  public containsUrls(): boolean {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return urlRegex.test(this.value);
  }

  /**
   * Extract URLs from content
   */
  public extractUrls(): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return this.value.match(urlRegex) || [];
  }

  /**
   * Check if content contains mentions (@username)
   */
  public containsMentions(): boolean {
    const mentionRegex = /@\w+(?:-\w+)*/g;
    return mentionRegex.test(this.value);
  }

  /**
   * Extract mentions from content
   */
  public extractMentions(): string[] {
    const mentionRegex = /@(\w+(?:-\w+)*)/g;
    const matches = this.value.match(mentionRegex);
    return matches ? matches.map(match => match.substring(1)) : [];
  }

  /**
   * Check if content contains hashtags
   */
  public containsHashtags(): boolean {
    const hashtagRegex = /#\w+(?:-\w+)*/g;
    return hashtagRegex.test(this.value);
  }

  /**
   * Extract hashtags from content
   */
  public extractHashtags(): string[] {
    const hashtagRegex = /#(\w+(?:-\w+)*)/g;
    const matches = this.value.match(hashtagRegex);
    return matches ? matches.map(match => match.substring(1)) : [];
  }

  /**
   * Get preview (truncated content)
   */
  public getPreview(maxLength: number = 100): string {
    if (this.value.length <= maxLength) {
      return this.value;
    }
    return this.value.substring(0, maxLength) + '...';
  }

  /**
   * Check if content is a question
   */
  public isQuestion(): boolean {
    return this.value.trim().endsWith('?');
  }

  /**
   * Check if content is all caps (shouting)
   */
  public isAllCaps(): boolean {
    const letters = this.value.replace(/[^a-zA-Z]/g, '');
    return letters.length > 5 && letters === letters.toUpperCase();
  }

  /**
   * Get content sentiment (basic analysis)
   */
  public getSentiment(): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'best', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disgusting', 'ugly', 'stupid', 'annoying'];

    const lowerContent = this.value.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Get content type classification
   */
  public getContentType(): 'question' | 'statement' | 'exclamation' | 'command' {
    if (this.isQuestion()) return 'question';
    if (this.value.includes('!')) return 'exclamation';
    if (this.value.startsWith('/') || this.value.toLowerCase().startsWith('please')) return 'command';
    return 'statement';
  }

  /**
   * Check for excessive whitespace
   */
  private hasExcessiveWhitespace(): boolean {
    // More than 4 consecutive spaces or more than 5 consecutive newlines
    return /\s{5,}/.test(this.value) || this.value.split('\n').length > 5;
  }

  /**
   * Check for potentially harmful content (basic validation)
   */
  private containsPotentiallyHarmfulContent(): boolean {
    const harmfulPatterns = [
      /<script/i,  // Script tags
      /javascript:/i,  // JavaScript URLs
      /on\w+\s*=/i,  // Event handlers
    ];

    return harmfulPatterns.some(pattern => pattern.test(this.value));
  }

  /**
   * Convert to string
   */
  public toString(): string {
    return this.value;
  }

  /**
   * Create MessageContent from string
   */
  public static fromString(content: string): MessageContent {
    return new MessageContent(content);
  }

  /**
   * Validate content without creating instance
   */
  public static isValidContent(content: string): boolean {
    try {
      new MessageContent(content);
      return true;
    } catch {
      return false;
    }
  }
}