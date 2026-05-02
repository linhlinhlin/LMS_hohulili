import {
  DistributableLesson,
  distributeByFilenamePrefix,
  distributeEvenly,
  extractFilenameTitle,
} from './batch-distribution.util';

const FOUR_LESSONS: DistributableLesson[] = [
  { id: 'L1', orderIndex: 1 },
  { id: 'L2', orderIndex: 2 },
  { id: 'L3', orderIndex: 3 },
  { id: 'L4', orderIndex: 4 },
];

const THREE_LESSONS: DistributableLesson[] = [
  { id: 'L1', orderIndex: 1 },
  { id: 'L2', orderIndex: 2 },
  { id: 'L3', orderIndex: 3 },
];

function fileNamed(name: string): File {
  return new File([''], name, { type: 'video/mp4' });
}

describe('distributeEvenly', () => {
  it('user case: 23 video / 4 bài → [6, 6, 6, 5]', () => {
    const items = Array.from({ length: 23 }, (_, i) => `v${i}`);
    const result = distributeEvenly(items, FOUR_LESSONS);
    expect(result.get('L1')?.length).toBe(6);
    expect(result.get('L2')?.length).toBe(6);
    expect(result.get('L3')?.length).toBe(6);
    expect(result.get('L4')?.length).toBe(5);
    const total = [...result.values()].reduce((sum, arr) => sum + arr.length, 0);
    expect(total).toBe(23);
  });

  it('chia chẵn: 12 / 4 → [3, 3, 3, 3]', () => {
    const result = distributeEvenly(
      Array.from({ length: 12 }, (_, i) => i),
      FOUR_LESSONS
    );
    expect([...result.values()].map((a) => a.length)).toEqual([3, 3, 3, 3]);
  });

  it('chia chẵn: 100 / 10 → mỗi bài 10', () => {
    const lessons: DistributableLesson[] = Array.from({ length: 10 }, (_, i) => ({
      id: `L${i}`,
      orderIndex: i + 1,
    }));
    const result = distributeEvenly(
      Array.from({ length: 100 }, (_, i) => i),
      lessons
    );
    expect([...result.values()].every((a) => a.length === 10)).toBe(true);
  });

  it('N < M: bài cuối có 0 video', () => {
    const result = distributeEvenly([1, 2], FOUR_LESSONS);
    expect(result.get('L1')?.length).toBe(1);
    expect(result.get('L2')?.length).toBe(1);
    expect(result.get('L3')?.length).toBe(0);
    expect(result.get('L4')?.length).toBe(0);
  });

  it('items rỗng → mỗi bài có mảng rỗng', () => {
    const result = distributeEvenly([], FOUR_LESSONS);
    expect(result.size).toBe(4);
    expect([...result.values()].every((a) => a.length === 0)).toBe(true);
  });

  it('lessons rỗng → Map rỗng', () => {
    const result = distributeEvenly([1, 2, 3], []);
    expect(result.size).toBe(0);
  });

  it('respect orderIndex bất kể input order', () => {
    const reordered: DistributableLesson[] = [
      { id: 'Z', orderIndex: 1 },
      { id: 'A', orderIndex: 2 },
      { id: 'M', orderIndex: 3 },
    ];
    const result = distributeEvenly([1, 2, 3, 4, 5, 6, 7], reordered);
    expect(result.get('Z')).toEqual([1, 2, 3]);
    expect(result.get('A')).toEqual([4, 5]);
    expect(result.get('M')).toEqual([6, 7]);
  });

  it('1 lesson nhận hết khi M=1', () => {
    const oneLesson: DistributableLesson[] = [{ id: 'X', orderIndex: 1 }];
    const result = distributeEvenly([1, 2, 3, 4, 5], oneLesson);
    expect(result.get('X')).toEqual([1, 2, 3, 4, 5]);
  });

  it('không mutate input array', () => {
    const items = [1, 2, 3, 4, 5];
    const lessons = [{ id: 'L1', orderIndex: 2 }, { id: 'L2', orderIndex: 1 }];
    distributeEvenly(items, lessons);
    expect(items).toEqual([1, 2, 3, 4, 5]);
    expect(lessons[0].id).toBe('L1');
  });
});

describe('distributeByFilenamePrefix', () => {
  it('match đầy đủ: "01_x", "02_x", "03_x" → group đúng theo prefix', () => {
    const files = [
      fileNamed('01_intro.mp4'),
      fileNamed('01_part2.mp4'),
      fileNamed('02_drill.mp4'),
      fileNamed('03_quiz.mp4'),
    ];
    const result = distributeByFilenamePrefix(files, THREE_LESSONS);
    expect(result?.get('L1')?.map((f) => f.name)).toEqual(['01_intro.mp4', '01_part2.mp4']);
    expect(result?.get('L2')?.map((f) => f.name)).toEqual(['02_drill.mp4']);
    expect(result?.get('L3')?.map((f) => f.name)).toEqual(['03_quiz.mp4']);
  });

  it('separator đa dạng: "1-", "01.", "01 ", "01_" đều detect', () => {
    const files = [
      fileNamed('1-intro.mp4'),
      fileNamed('01.test.mp4'),
      fileNamed('2 video.mp4'),
      fileNamed('02_lesson.mp4'),
    ];
    const result = distributeByFilenamePrefix(files, THREE_LESSONS);
    expect(result?.get('L1')?.length).toBe(2);
    expect(result?.get('L2')?.length).toBe(2);
    expect(result?.get('L3')?.length).toBe(0);
  });

  it('< 50% match prefix → trả undefined để caller fallback', () => {
    const files = [
      fileNamed('01_intro.mp4'),
      fileNamed('hello.mp4'),
      fileNamed('world.mp4'),
      fileNamed('video.mp4'),
    ];
    expect(distributeByFilenamePrefix(files, THREE_LESSONS)).toBeUndefined();
  });

  it('exactly 50% match → vẫn detect', () => {
    const files = [fileNamed('01_a.mp4'), fileNamed('02_b.mp4'), fileNamed('x.mp4'), fileNamed('y.mp4')];
    const result = distributeByFilenamePrefix(files, THREE_LESSONS);
    expect(result).toBeDefined();
    expect(result?.get('L3')?.map((f) => f.name).sort()).toEqual(['x.mp4', 'y.mp4']);
  });

  it('không có file → undefined', () => {
    expect(distributeByFilenamePrefix([], THREE_LESSONS)).toBeUndefined();
  });

  it('không có lesson → undefined', () => {
    expect(distributeByFilenamePrefix([fileNamed('01.mp4')], [])).toBeUndefined();
  });

  it('số prefix > số bài → prefixes thừa dồn vào bài cuối', () => {
    const files = [
      fileNamed('01.mp4'),
      fileNamed('02.mp4'),
      fileNamed('03.mp4'),
      fileNamed('04.mp4'),
      fileNamed('05.mp4'),
    ];
    const result = distributeByFilenamePrefix(files, THREE_LESSONS);
    expect(result?.get('L1')?.map((f) => f.name)).toEqual(['01.mp4']);
    expect(result?.get('L2')?.map((f) => f.name)).toEqual(['02.mp4']);
    expect(result?.get('L3')?.map((f) => f.name)).toEqual(['03.mp4', '04.mp4', '05.mp4']);
  });

  it('unmatched files dồn vào bài cuối', () => {
    const files = [
      fileNamed('01_a.mp4'),
      fileNamed('02_b.mp4'),
      fileNamed('03_c.mp4'),
      fileNamed('extra.mp4'),
    ];
    const result = distributeByFilenamePrefix(files, THREE_LESSONS);
    expect(result?.get('L3')?.map((f) => f.name)).toEqual(['03_c.mp4', 'extra.mp4']);
  });

  it('digits liền chữ vẫn detect: "01video.mp4"', () => {
    const files = [fileNamed('01video.mp4'), fileNamed('02clip.mp4')];
    const result = distributeByFilenamePrefix(files, THREE_LESSONS);
    expect(result?.get('L1')?.length).toBe(1);
    expect(result?.get('L2')?.length).toBe(1);
  });

  it('digit ở giữa tên KHÔNG match: "video01.mp4"', () => {
    const files = [fileNamed('video01.mp4'), fileNamed('clip02.mp4')];
    expect(distributeByFilenamePrefix(files, THREE_LESSONS)).toBeUndefined();
  });
});

describe('extractFilenameTitle', () => {
  it('strip MP4 extension', () => {
    expect(extractFilenameTitle('intro.mp4')).toBe('intro');
  });

  it('strip MOV extension (case-preserve)', () => {
    expect(extractFilenameTitle('video.MOV')).toBe('video');
  });

  it('preserve dots trong tên', () => {
    expect(extractFilenameTitle('my.video.with.dots.mp4')).toBe('my.video.with.dots');
  });

  it('trim whitespace ở đầu/cuối', () => {
    expect(extractFilenameTitle('  hello.mp4  ')).toBe('hello');
  });

  it('không có extension → giữ nguyên', () => {
    expect(extractFilenameTitle('README')).toBe('README');
  });

  it('hidden file → không strip (extension là cả tên)', () => {
    expect(extractFilenameTitle('.gitignore')).toBe('.gitignore');
  });

  it('empty string → empty', () => {
    expect(extractFilenameTitle('')).toBe('');
  });

  it('Vietnamese diacritics preserved', () => {
    expect(extractFilenameTitle('Bài giảng số 1.mp4')).toBe('Bài giảng số 1');
  });
});
