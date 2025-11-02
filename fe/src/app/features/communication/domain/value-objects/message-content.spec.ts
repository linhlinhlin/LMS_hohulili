import { MessageContent } from './message-content';

describe('MessageContent Value Object', () => {
  describe('Creation and Validation', () => {
    it('should create a valid message content', () => {
      const content = new MessageContent('Hello, this is a test message!');
      expect(content.getValue()).toBe('Hello, this is a test message!');
    });

    it('should trim whitespace', () => {
      const content = new MessageContent('  Hello world!  ');
      expect(content.getValue()).toBe('Hello world!');
    });

    it('should throw error for empty content', () => {
      expect(() => new MessageContent('')).toThrowError('Message content cannot be empty');
      expect(() => new MessageContent('   ')).toThrowError('Message content cannot be empty');
    });

    it('should throw error for content too long', () => {
      const longContent = 'A'.repeat(5001);
      expect(() => new MessageContent(longContent)).toThrowError('Message content cannot exceed 5000 characters');
    });

    it('should throw error for excessive whitespace', () => {
      const excessiveWhitespace = 'A'.repeat(10) + ' '.repeat(5) + 'B'.repeat(10);
      expect(() => new MessageContent(excessiveWhitespace)).toThrowError('Message content contains excessive whitespace');
    });

    it('should throw error for harmful content', () => {
      expect(() => new MessageContent('<script>alert("hack")</script>')).toThrowError('Message content contains potentially harmful content');
      expect(() => new MessageContent('javascript:alert("hack")')).toThrowError('Message content contains potentially harmful content');
      expect(() => new MessageContent('<img src=x onerror=alert("hack")>')).toThrowError('Message content contains potentially harmful content');
    });
  });

  describe('Content Analysis', () => {
    let content: MessageContent;

    beforeEach(() => {
      content = new MessageContent('Hello @john! Check this link: https://example.com and #hashtag. How are you?');
    });

    it('should get content length', () => {
      expect(content.getLength()).toBe(76);
    });

    it('should get word count', () => {
      expect(content.getWordCount()).toBe(11);
    });

    it('should check if content is short', () => {
      const shortContent = new MessageContent('Hi!');
      expect(shortContent.isShort()).toBe(true);
      expect(content.isShort()).toBe(false);
    });

    it('should check if content is long', () => {
      const longContent = new MessageContent('A'.repeat(1001));
      expect(longContent.isLong()).toBe(true);
      expect(content.isLong()).toBe(false);
    });

    it('should detect URLs', () => {
      expect(content.containsUrls()).toBe(true);
      const noUrlContent = new MessageContent('Hello world!');
      expect(noUrlContent.containsUrls()).toBe(false);
    });

    it('should extract URLs', () => {
      const urls = content.extractUrls();
      expect(urls).toContain('https://example.com');
      expect(urls.length).toBe(1);
    });

    it('should detect mentions', () => {
      expect(content.containsMentions()).toBe(true);
      const noMentionContent = new MessageContent('Hello world!');
      expect(noMentionContent.containsMentions()).toBe(false);
    });

    it('should extract mentions', () => {
      const mentions = content.extractMentions();
      expect(mentions).toContain('john');
      expect(mentions.length).toBe(1);
    });

    it('should detect hashtags', () => {
      expect(content.containsHashtags()).toBe(true);
      const noHashtagContent = new MessageContent('Hello world!');
      expect(noHashtagContent.containsHashtags()).toBe(false);
    });

    it('should extract hashtags', () => {
      const hashtags = content.extractHashtags();
      expect(hashtags).toContain('hashtag');
      expect(hashtags.length).toBe(1);
    });

    it('should detect questions', () => {
      expect(content.isQuestion()).toBe(true);
      const statement = new MessageContent('Hello world!');
      expect(statement.isQuestion()).toBe(false);
    });

    it('should detect all caps (shouting)', () => {
      const shouting = new MessageContent('HELLO WORLD!');
      expect(shouting.isAllCaps()).toBe(true);
      expect(content.isAllCaps()).toBe(false);
    });

    it('should analyze sentiment', () => {
      const positiveContent = new MessageContent('This is amazing! I love it!');
      const negativeContent = new MessageContent('This is terrible! I hate it!');
      const neutralContent = new MessageContent('Hello world.');

      expect(positiveContent.getSentiment()).toBe('positive');
      expect(negativeContent.getSentiment()).toBe('negative');
      expect(neutralContent.getSentiment()).toBe('neutral');
    });

    it('should classify content type', () => {
      expect(content.getContentType()).toBe('question');

      const statement = new MessageContent('Hello world.');
      expect(statement.getContentType()).toBe('statement');

      const exclamation = new MessageContent('Wow!');
      expect(exclamation.getContentType()).toBe('exclamation');

      const command = new MessageContent('Please help me.');
      expect(command.getContentType()).toBe('command');
    });

    it('should provide preview', () => {
      const longContent = new MessageContent('A'.repeat(200));
      const preview = longContent.getPreview(50);
      expect(preview.length).toBe(53); // 50 chars + '...'
      expect(preview.endsWith('...')).toBe(true);
    });

    it('should return full content for short messages', () => {
      const shortContent = new MessageContent('Hi!');
      expect(shortContent.getPreview(50)).toBe('Hi!');
    });
  });

  describe('Static Methods', () => {
    it('should create content from string', () => {
      const content = MessageContent.fromString('Hello world!');
      expect(content).toBeInstanceOf(MessageContent);
      expect(content.getValue()).toBe('Hello world!');
    });

    it('should validate content without creating instance', () => {
      expect(MessageContent.isValidContent('Hello world!')).toBe(true);
      expect(MessageContent.isValidContent('')).toBe(false);
      expect(MessageContent.isValidContent('A'.repeat(5001))).toBe(false);
      expect(MessageContent.isValidContent('<script>hack</script>')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum valid content', () => {
      const minContent = new MessageContent('A');
      expect(minContent.getValue()).toBe('A');
      expect(minContent.getLength()).toBe(1);
    });

    it('should handle maximum valid content', () => {
      const maxContent = new MessageContent('A'.repeat(5000));
      expect(maxContent.getLength()).toBe(5000);
    });

    it('should handle content with only whitespace between words', () => {
      const content = new MessageContent('Hello   world   !');
      expect(content.getValue()).toBe('Hello   world   !');
      expect(content.getWordCount()).toBe(3);
    });

    it('should handle content with newlines', () => {
      const content = new MessageContent('Hello\nworld\n!');
      expect(content.getValue()).toBe('Hello\nworld\n!');
    });

    it('should handle content with tabs', () => {
      const content = new MessageContent('Hello\tworld\t!');
      expect(content.getValue()).toBe('Hello\tworld\t!');
    });

    it('should handle content with mixed whitespace', () => {
      const content = new MessageContent('Hello \t\n world \t\n !');
      expect(content.getValue()).toBe('Hello \t\n world \t\n !');
    });

    it('should handle content with unicode characters', () => {
      const content = new MessageContent('Hello 世界! 🌟');
      expect(content.getValue()).toBe('Hello 世界! 🌟');
      expect(content.getLength()).toBe(12);
    });

    it('should handle content with emojis', () => {
      const content = new MessageContent('Hello 😀👍!');
      expect(content.getValue()).toBe('Hello 😀👍!');
      expect(content.getLength()).toBe(11);
    });

    it('should handle content with multiple URLs', () => {
      const content = new MessageContent('Check https://example.com and https://test.com');
      const urls = content.extractUrls();
      expect(urls).toContain('https://example.com');
      expect(urls).toContain('https://test.com');
      expect(urls.length).toBe(2);
    });

    it('should handle content with multiple mentions', () => {
      const content = new MessageContent('Hello @john and @jane!');
      const mentions = content.extractMentions();
      expect(mentions).toContain('john');
      expect(mentions).toContain('jane');
      expect(mentions.length).toBe(2);
    });

    it('should handle content with multiple hashtags', () => {
      const content = new MessageContent('Check #angular and #typescript!');
      const hashtags = content.extractHashtags();
      expect(hashtags).toContain('angular');
      expect(hashtags).toContain('typescript');
      expect(hashtags.length).toBe(2);
    });

    it('should handle content with special characters in mentions and hashtags', () => {
      const content = new MessageContent('Hello @user_name and #tag-name!');
      const mentions = content.extractMentions();
      const hashtags = content.extractHashtags();
      expect(mentions).toContain('user_name');
      expect(hashtags).toContain('tag-name');
    });

    it('should handle content with URLs at the end', () => {
      const content = new MessageContent('Check this: https://example.com');
      const urls = content.extractUrls();
      expect(urls).toContain('https://example.com');
    });

    it('should handle content with URLs without protocol', () => {
      const content = new MessageContent('Visit example.com for more info');
      expect(content.containsUrls()).toBe(false); // Only detects URLs with protocol
    });
  });

  describe('Security and Validation', () => {
    it('should reject script tags', () => {
      expect(() => new MessageContent('<script>alert("xss")</script>')).toThrow();
      expect(() => new MessageContent('<SCRIPT>alert("xss")</SCRIPT>')).toThrow();
    });

    it('should reject javascript URLs', () => {
      expect(() => new MessageContent('javascript:alert("xss")')).toThrow();
      expect(() => new MessageContent('JavaScript:alert("xss")')).toThrow();
    });

    it('should reject event handlers', () => {
      expect(() => new MessageContent('<img src=x onerror=alert("xss")>')).toThrow();
      expect(() => new MessageContent('<div onclick=alert("xss")>')).toThrow();
    });

    it('should reject excessive consecutive spaces', () => {
      const spaces = 'A' + ' '.repeat(5) + 'B';
      expect(() => new MessageContent(spaces)).toThrowError('Message content contains excessive whitespace');
    });

    it('should reject excessive consecutive newlines', () => {
      const newlines = 'A\n\n\n\n\nB';
      expect(() => new MessageContent(newlines)).toThrowError('Message content contains excessive whitespace');
    });

    it('should allow reasonable whitespace', () => {
      const reasonable = 'Hello\n\nWorld\n!';
      expect(() => new MessageContent(reasonable)).not.toThrow();
    });
  });
});