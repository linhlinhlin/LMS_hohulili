import { buildDefaultRubricLevels, buildRubricLevelPoints } from './rubric-form.defaults';

describe('rubric form defaults', () => {
  it('materializes default levels from the criterion weight', () => {
    const points = buildDefaultRubricLevels(30).map(level => level.points);

    expect(points).toEqual([30, 25.5, 21, 12]);
  });

  it('evenly redistributes the existing levels within the criterion weight', () => {
    expect(buildRubricLevelPoints(30, 4)).toEqual([30, 20, 10, 0]);
    expect(buildRubricLevelPoints(30, 3)).toEqual([30, 15, 0]);
  });

  it('keeps zero-weight criteria at zero points instead of falling back to a fake scale', () => {
    expect(buildDefaultRubricLevels(0).map(level => level.points)).toEqual([0, 0, 0, 0]);
    expect(buildRubricLevelPoints(0, 3)).toEqual([0, 0, 0]);
  });
});
