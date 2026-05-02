/**
 * Pure distribution algorithms for batch video upload.
 *
 * Strategies:
 *  - distributeEvenly: chia N item cho M bucket theo công thức floor + remainder
 *  - distributeByFilenamePrefix: detect tiền tố số ở đầu tên file (Coursera pattern)
 *  - extractFilenameTitle: strip extension cho default section title
 */

export interface DistributableLesson {
  id: string;
  orderIndex: number;
}

/**
 * Chia N item cho M bucket. Bucket đầu nhận thêm 1 nếu N mod M > 0.
 * Sort theo orderIndex để output ổn định bất kể input order của lessons.
 *
 * Ví dụ: N=23, M=4 → [6, 6, 6, 5]
 *        N=10, M=4 → [3, 3, 2, 2]
 *        N=2,  M=4 → [1, 1, 0, 0]   (bài cuối có thể trống)
 *
 * Lessons rỗng → Map rỗng (caller phải xử lý: tạo bài mới hoặc báo lỗi).
 */
export function distributeEvenly<T>(items: T[], lessons: DistributableLesson[]): Map<string, T[]> {
  const result = new Map<string, T[]>();
  if (lessons.length === 0) return result;

  const sorted = [...lessons].sort((a, b) => a.orderIndex - b.orderIndex);
  const n = items.length;
  const m = sorted.length;
  const base = Math.floor(n / m);
  const extra = n % m;

  let cursor = 0;
  for (let i = 0; i < m; i++) {
    const count = base + (i < extra ? 1 : 0);
    result.set(sorted[i].id, items.slice(cursor, cursor + count));
    cursor += count;
  }
  return result;
}

/**
 * Detect filename prefix dạng "01_xx", "1-xx", "01.xx", "01 xx" (Coursera pattern).
 * Group files theo prefix, assign vào lessons theo thứ tự prefix tăng dần.
 *
 * Trả undefined nếu < 50% file match prefix (signal cho caller fallback sang
 * distributeEvenly). Quy ước này tránh assign tệ khi user chỉ vô tình đặt 1-2
 * file có tiền tố số.
 *
 * Files không match prefix → dồn vào bài cuối cùng.
 * Số prefix > số bài → prefixes thừa dồn vào bài cuối.
 */
export function distributeByFilenamePrefix(
  files: File[],
  lessons: DistributableLesson[]
): Map<string, File[]> | undefined {
  if (lessons.length === 0 || files.length === 0) return undefined;

  const matched: Array<{ file: File; prefix: number }> = [];
  const unmatched: File[] = [];

  for (const file of files) {
    const m = file.name.match(/^(\d+)/);
    if (m) {
      matched.push({ file, prefix: parseInt(m[1], 10) });
    } else {
      unmatched.push(file);
    }
  }

  if (matched.length < files.length / 2) return undefined;

  const sortedLessons = [...lessons].sort((a, b) => a.orderIndex - b.orderIndex);
  const result = new Map<string, File[]>();
  for (const lesson of sortedLessons) result.set(lesson.id, []);

  const byPrefix = new Map<number, File[]>();
  for (const { file, prefix } of matched) {
    const bucket = byPrefix.get(prefix);
    if (bucket) {
      bucket.push(file);
    } else {
      byPrefix.set(prefix, [file]);
    }
  }

  const prefixesAsc = [...byPrefix.keys()].sort((a, b) => a - b);
  for (let i = 0; i < prefixesAsc.length; i++) {
    const lessonIdx = Math.min(i, sortedLessons.length - 1);
    const bucket = result.get(sortedLessons[lessonIdx].id)!;
    bucket.push(...byPrefix.get(prefixesAsc[i])!);
  }

  if (unmatched.length > 0) {
    const lastLesson = sortedLessons[sortedLessons.length - 1];
    result.get(lastLesson.id)!.push(...unmatched);
  }

  return result;
}

/**
 * Strip extension cho section title default. Trim whitespace.
 * Hidden file (".gitignore") → giữ nguyên (extension là toàn bộ tên).
 */
export function extractFilenameTitle(filename: string): string {
  const trimmed = filename.trim();
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot <= 0) return trimmed;
  return trimmed.substring(0, lastDot);
}
