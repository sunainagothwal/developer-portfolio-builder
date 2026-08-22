import { guessSkillCategory } from '../src/utils/skillCategory';

describe('guessSkillCategory', () => {
  it('classifies programming languages', () => {
    expect(guessSkillCategory('TypeScript')).toBe('language');
    expect(guessSkillCategory('python')).toBe('language');
    expect(guessSkillCategory('C++')).toBe('language');
  });

  it('classifies frameworks and libraries', () => {
    expect(guessSkillCategory('React Native')).toBe('framework');
    expect(guessSkillCategory('Django')).toBe('framework');
  });

  it('classifies databases, devops and tools', () => {
    expect(guessSkillCategory('PostgreSQL')).toBe('database');
    expect(guessSkillCategory('Kubernetes')).toBe('devops');
    expect(guessSkillCategory('Figma')).toBe('design');
    expect(guessSkillCategory('Jira')).toBe('tool');
    expect(guessSkillCategory('Mentoring')).toBe('soft-skill');
  });

  it('is case and whitespace insensitive', () => {
    expect(guessSkillCategory('  KUBERNETES  ')).toBe('devops');
  });

  it('falls back to substring matching for variants', () => {
    expect(guessSkillCategory('AWS Lambda')).toBe('devops');
    expect(guessSkillCategory('React Hooks')).toBe('framework');
  });

  it('returns "other" for unknown or empty input', () => {
    expect(guessSkillCategory('Underwater Basket Weaving')).toBe('other');
    expect(guessSkillCategory('')).toBe('other');
  });
});
