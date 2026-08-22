import { skillSchema } from '@lib/validators/skillSchema';

describe('skillSchema', () => {
  it('accepts a valid skill payload', () => {
    const result = skillSchema.safeParse({
      name: 'TypeScript',
      category: 'language',
      level: 'expert',
      featured: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a skill with an empty name', () => {
    const result = skillSchema.safeParse({
      name: '',
      category: 'language',
      level: 'expert',
      featured: false,
    });
    expect(result.success).toBe(false);
  });

  it('coerces yearsOfExperience from a string input', () => {
    const result = skillSchema.safeParse({
      name: 'Go',
      category: 'language',
      level: 'intermediate',
      featured: false,
      yearsOfExperience: '3' as unknown as number,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.yearsOfExperience).toBe(3);
  });
});
