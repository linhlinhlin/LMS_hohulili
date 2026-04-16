/**
 * PageDataExtractorService — Sprint 223: Rich Structured Data Extraction
 *
 * Extracts structured data from the current page's DOM.
 * Each page type has a dedicated extractor that reads visible data
 * (tables, cards, progress bars) and returns typed structured data.
 *
 * Used by WiiiContextService to include structured data in PostMessage
 * so the AI knows EXACTLY what the user sees.
 */
import { Injectable } from '@angular/core';

export interface GradesPageData {
  _type: 'grades';
  courses: Array<{
    code: string;
    name: string;
    progress: number;
    status: string;
    grade?: number;
  }>;
  summary: { total: number; completed: number; avg_progress: number };
}

export interface AssignmentListData {
  _type: 'assignment_list';
  assignments: Array<{
    name: string;
    course_name: string;
    due_date: string;
    status: string;
  }>;
  summary: { total: number; pending: number; overdue: number };
}

export interface AssignmentWorkData {
  _type: 'assignment';
  title: string;
  course_name: string;
  due_date: string;
  status: string;
  instructions: string;
  max_score?: number;
}

export interface LessonPageData {
  _type: 'lesson';
  course_name: string;
  chapter_name: string;
  lesson_title: string;
  content_text: string;
  media_types: string[];
  progress: number;
}

export interface QuizPageData {
  _type: 'quiz';
  quiz_title: string;
  question_number: number;
  total_questions: number;
  question_text: string;
  options: string[];
  time_remaining_seconds?: number;
  attempts_used: number;
}

export interface QuizResultPageData {
  _type: 'quiz_result';
  quiz_title: string;
  score: number | null;
  max_score: number | null;
  score_percent: number;
  passing_score: number | null;
  passed: boolean | null;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  show_correct_answers: boolean;
  questions: Array<{
    index: number;
    question_text: string;
    selected_option: string;
    correct_option?: string;
    is_correct: boolean | null;
  }>;
}

export interface CourseOverviewData {
  _type: 'course_overview';
  course_name: string;
  course_code: string;
  instructor: string;
  chapters: Array<{ name: string; lesson_count: number; completed: number }>;
  total_progress: number;
}

export type PageStructuredData =
  | GradesPageData
  | AssignmentListData
  | AssignmentWorkData
  | LessonPageData
  | QuizPageData
  | QuizResultPageData
  | CourseOverviewData
  | null;

@Injectable({ providedIn: 'root' })
export class PageDataExtractorService {

  /**
   * Extract structured data from the current page.
   * Reads from DOM as component state is not always accessible.
   */
  extract(pageType: string): PageStructuredData {
    switch (pageType) {
      case 'grades':
        return this.extractGrades();
      case 'assignment':
        return this.extractAssignmentWork();
      case 'assignment_list':
        return this.extractAssignments();
      case 'lesson':
        return this.extractLesson();
      case 'quiz':
        return this.extractQuiz();
      case 'course_overview':
        return this.extractCourseOverview();
      default:
        return null;
    }
  }

  private extractGrades(): GradesPageData {
    const tableRows = document.querySelectorAll('table tbody tr, table tr:not(:first-child)');
    const courses: GradesPageData['courses'] = [];

    tableRows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 3) {
        const code = cells[0]?.textContent?.trim() || '';
        const name = cells[1]?.textContent?.trim() || '';
        const progressText = cells[2]?.textContent?.trim() || '0';
        const progress = parseInt(progressText.replace('%', ''), 10) || 0;
        const status = cells[3]?.textContent?.trim() || 'active';
        if (name) {
          courses.push({ code, name, progress, status });
        }
      }
    });

    const total = courses.length;
    const completed = courses.filter(
      c => c.status === 'Ho\u00E0n th\u00E0nh' || c.status === 'completed',
    ).length;
    const avg =
      total > 0 ? Math.round(courses.reduce((s, c) => s + c.progress, 0) / total) : 0;

    return {
      _type: 'grades',
      courses,
      summary: { total, completed, avg_progress: avg },
    };
  }

  private extractAssignments(): AssignmentListData {
    const cards = document.querySelectorAll(
      '.assignment-card, [class*="assignment"], .kanban-card',
    );
    const assignments: AssignmentListData['assignments'] = [];

    cards.forEach(card => {
      const name =
        card.querySelector('h3, .title, .assignment-name')?.textContent?.trim() || '';
      const dueEl = card.querySelector('.due-date, [class*="date"], time');
      const due_date = dueEl?.textContent?.trim() || dueEl?.getAttribute('datetime') || '';
      const statusEl = card.querySelector('.status, [class*="status"]');
      const status = statusEl?.textContent?.trim() || 'NOT_STARTED';
      if (name) {
        assignments.push({ name, course_name: '', due_date, status });
      }
    });

    const total = assignments.length;
    const pending = assignments.filter(
      a => a.status !== 'SUBMITTED' && a.status !== 'GRADED',
    ).length;
    const overdue = assignments.filter(
      a => a.status === 'OVERDUE' || a.status === 'Qu\u00E1 h\u1EA1n',
    ).length;

    return {
      _type: 'assignment_list',
      assignments,
      summary: { total, pending, overdue },
    };
  }

  private extractAssignmentWork(): AssignmentWorkData {
    const title = this.firstText('h1, .assignment-title, [class*="assignment"] h1');
    const courseName = this.firstText(
      '.mb-6 p.text-sm.text-gray-500, h1 + p, .assignment-course, [class*="course"] .text-sm',
    );
    const instructions = this.firstText(
      '.whitespace-pre-wrap, .assignment-instructions, [data-testid="assignment-instructions"]',
    );
    const badgeTexts = this.collectTexts(
      '.mb-6 span, .status, [class*="status"], [class*="badge"], [class*="chip"]',
    );

    return {
      _type: 'assignment',
      title: title || document.title,
      course_name: courseName,
      due_date: this.extractAssignmentDueDate(badgeTexts),
      status: this.extractAssignmentStatus(badgeTexts),
      instructions: instructions.slice(0, 3000),
      max_score: this.extractAssignmentMaxScore(badgeTexts),
    };
  }

  private extractLesson(): LessonPageData {
    const courseEl = document.querySelector(
      '.course-name, [class*="course"] h2, aside h2, aside .text-slate-800',
    );
    const chapterEl = document.querySelector(
      'app-lesson-content h3, .chapter-name, [class*="chapter"]',
    );
    const titleEl = document.querySelector(
      'app-lesson-content h1, .lesson-title, [class*="lesson"] h2, h1',
    );
    const contentEl = document.querySelector(
      'app-lesson-content .prose, .lesson-content, .content-area, main article',
    );
    const progressEl = document.querySelector('[class*="progress"] span, .progress-value');

    return {
      _type: 'lesson',
      course_name: courseEl?.textContent?.trim() || '',
      chapter_name: chapterEl?.textContent?.trim() || '',
      lesson_title: titleEl?.textContent?.trim() || document.title,
      content_text: (contentEl?.textContent?.trim() || '').slice(0, 3000),
      media_types: this.detectMediaTypes(),
      progress: parseInt(progressEl?.textContent?.replace('%', '') || '0', 10),
    };
  }

  private extractQuiz(): QuizPageData | QuizResultPageData {
    if (this.looksLikeQuizResultPage()) {
      return this.extractQuizResult();
    }

    const titleEl = document.querySelector('.quiz-title, h1, [class*="quiz"] h2');
    const questionEl = document.querySelector(
      '.question-text, .question, [class*="question"] p',
    );
    const optionEls = document.querySelectorAll(
      '.option, .answer-choice, [class*="option"], [class*="choice"]',
    );
    const options = Array.from(optionEls).map(el => el.textContent?.trim() || '');

    return {
      _type: 'quiz',
      quiz_title: titleEl?.textContent?.trim() || '',
      question_number: 1,
      total_questions: 1,
      question_text: questionEl?.textContent?.trim() || '',
      options: options.filter(o => o.length > 0),
      attempts_used: 0,
    };
  }

  private extractQuizResult(): QuizResultPageData {
    const title = this.firstText('nav span.font-medium, h1.text-sm.font-medium, h1');
    const badgeText = this.findText(
      'span, p',
      (value) => ['dat_yeu_cau', 'chua_dat', 'chua_cong_bo_diem'].includes(this.normalizeText(value)),
    );
    const score = this.parseNumber(this.firstText('span.text-3xl.font-bold.tabular-nums, span.text-3xl.font-bold'));
    const maxScore = this.parseNumber(
      this.findText('span', (value) => String(value || '').trim().startsWith('/')).replace('/', ''),
    );
    const scorePercent = this.parseNumber(
      this.findText('span', (value) => /^\d+(?:[.,]\d+)?%$/.test(String(value || '').trim())).replace('%', ''),
    ) ?? 0;
    const passingScore = this.parseNumber(
      this.findText('p, span', (value) => this.normalizeText(value).startsWith('can_')).replace(/[^\d.,-]+/g, ''),
    );

    const questionRows = Array.from(
      document.querySelectorAll('div.flex.items-start.gap-3.px-5.py-3'),
    );

    const questions = questionRows.map((row, index) => {
      const questionText = row.querySelector('p')?.textContent?.trim() || `Cau hoi ${index + 1}`;
      const answerValues = Array.from(row.querySelectorAll('span.font-medium'))
        .map((el) => el.textContent?.trim() || '')
        .filter((value) => value.length > 0);
      const selectedOption = answerValues[0] || '';
      const correctOption = answerValues[1] || undefined;
      const selectedEl = row.querySelector('span.font-medium');
      const isCorrect = selectedEl?.classList.contains('text-green-600')
        ? true
        : selectedEl?.classList.contains('text-red-500')
          ? false
          : null;

      return {
        index: index + 1,
        question_text: questionText,
        selected_option: selectedOption,
        correct_option: correctOption,
        is_correct: isCorrect,
      };
    });

    const summaryText = this.findText(
      'span, p',
      (value) => /\d+\s*\/\s*\d+/.test(value) && value.includes('%'),
    );
    const summaryMatch = /(\d+)\s*\/\s*(\d+)/.exec(summaryText);
    const totalQuestions = questions.length || (summaryMatch ? Number.parseInt(summaryMatch[2], 10) : 0);
    const correctAnswers =
      questions.filter((question) => question.is_correct === true).length
      || (summaryMatch ? Number.parseInt(summaryMatch[1], 10) : 0);
    const incorrectAnswers =
      questions.filter((question) => question.is_correct === false).length
      || Math.max(totalQuestions - correctAnswers, 0);

    return {
      _type: 'quiz_result',
      quiz_title: title || document.title,
      score: score ?? null,
      max_score: maxScore ?? null,
      score_percent: scorePercent,
      passing_score: passingScore ?? null,
      passed: badgeText
        ? this.normalizeText(badgeText) === 'dat_yeu_cau'
        : null,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      incorrect_answers: incorrectAnswers,
      show_correct_answers: questions.length > 0,
      questions,
    };
  }

  private extractCourseOverview(): CourseOverviewData {
    const nameEl = document.querySelector('h1, .course-title');
    const instructorEl = document.querySelector('.instructor, [class*="teacher"]');

    return {
      _type: 'course_overview',
      course_name: nameEl?.textContent?.trim() || '',
      course_code: '',
      instructor: instructorEl?.textContent?.trim() || '',
      chapters: [],
      total_progress: 0,
    };
  }

  private detectMediaTypes(): string[] {
    const types: string[] = [];
    if (document.querySelector('video')) types.push('video');
    if (document.querySelector('iframe[src*="youtube"], iframe[src*="vimeo"]'))
      types.push('video');
    if (document.querySelector('embed[type="application/pdf"], iframe[src*=".pdf"]'))
      types.push('pdf');
    if (document.querySelector('img:not([class*="icon"]):not([class*="avatar"])'))
      types.push('image');
    return types;
  }

  private firstText(selector: string): string {
    return document.querySelector(selector)?.textContent?.trim() || '';
  }

  private collectTexts(selector: string): string[] {
    return Array.from(document.querySelectorAll(selector))
      .map((el) => el.textContent?.trim() || '')
      .filter((value) => value.length > 0);
  }

  private findText(selector: string, predicate: (value: string) => boolean): string {
    return this.collectTexts(selector).find((value) => predicate(value)) || '';
  }

  private looksLikeQuizResultPage(): boolean {
    return this.collectTexts('h1, h2, nav span, p, span').some((value) => {
      const normalized = this.normalizeText(value);
      return normalized === 'chi_tiet_tung_cau' || normalized === 'ket_qua_bai_kiem_tra';
    });
  }

  private normalizeText(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private parseNumber(value: string): number | undefined {
    const normalized = String(value || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
    if (!normalized) {
      return undefined;
    }
    const parsed = Number.parseFloat(normalized[0]);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private extractAssignmentDueDate(values: string[]): string {
    const match = values.find(
      (value) => value.includes('Hạn:') || value.includes('Quá hạn') || value.includes('Qua han'),
    );
    return match || '';
  }

  private extractAssignmentStatus(values: string[]): string {
    const candidates = ['Đã chấm điểm', 'Đã nộp', 'Quá hạn', 'Chưa nộp'];
    return values.find((value) => candidates.some((candidate) => value.includes(candidate))) || '';
  }

  private extractAssignmentMaxScore(values: string[]): number | undefined {
    const match = values
      .map((value) => /Tối đa\s+(\d+)/i.exec(value))
      .find((result) => result);
    if (!match) {
      return undefined;
    }
    const parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
