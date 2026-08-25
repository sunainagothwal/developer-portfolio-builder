import { generateMockInterviewQuestions, flattenInterviewQuestions } from '../src/lib/interview/mockInterviewQuestions';
import type { ParsedResume } from '../src/lib/import/resumeParser';

const baseResume: ParsedResume = {
  fullName: 'Jane Doe',
  headline: 'Senior Frontend Engineer',
  links: [],
  skills: [],
  education: [],
  certificates: [],
  projects: [],
  experience: [],
  achievements: [],
};

describe('generateMockInterviewQuestions', () => {
  it('includes a company-specific group naming the target company', () => {
    const groups = generateMockInterviewQuestions(baseResume, 'Acme Corp');
    const companyGroup = groups.find((g) => g.category.includes('Acme Corp'));
    expect(companyGroup).toBeDefined();
    expect(companyGroup!.questions.some((q) => q.includes('Acme Corp'))).toBe(true);
  });

  it('matches technical questions to skills found on the resume', () => {
    const resume: ParsedResume = { ...baseResume, skills: ['React', 'TypeScript'] };
    const groups = generateMockInterviewQuestions(resume, 'Acme Corp');
    const frontendGroup = groups.find((g) => g.category.startsWith('Frontend'));
    expect(frontendGroup).toBeDefined();
    expect(frontendGroup!.questions.some((q) => q.includes('React'))).toBe(true);
  });

  it('falls back to general technical questions when no known skills are present', () => {
    const groups = generateMockInterviewQuestions(baseResume, 'Acme Corp');
    const technicalGroup = groups.find((g) => g.category === 'Technical technical');
    expect(technicalGroup).toBeDefined();
    expect(technicalGroup!.questions.length).toBeGreaterThan(0);
  });

  it('adds an experience-based group when the resume has work history', () => {
    const resume: ParsedResume = {
      ...baseResume,
      experience: [
        {
          company: 'Globex',
          role: 'Frontend Engineer',
          isCurrent: true,
          description: '',
          techStack: [],
        },
      ],
    };
    const groups = generateMockInterviewQuestions(resume, 'Acme Corp');
    const experienceGroup = groups.find((g) => g.category === 'Your experience');
    expect(experienceGroup).toBeDefined();
    expect(experienceGroup!.questions.some((q) => q.includes('Globex'))).toBe(true);
  });

  it('always includes a behavioral question group', () => {
    const groups = generateMockInterviewQuestions(baseResume, 'Acme Corp');
    expect(groups.find((g) => g.category === 'Behavioral')).toBeDefined();
  });

  it('omits the company group when no company is given', () => {
    const groups = generateMockInterviewQuestions(baseResume, '');
    expect(groups.some((g) => g.category.startsWith('About'))).toBe(false);
  });

  it('adds a role-specific group and weaves the role into other questions when a job role is given', () => {
    const groups = generateMockInterviewQuestions(baseResume, 'Acme Corp', 'Senior Frontend Engineer');

    const roleGroup = groups.find((g) => g.category.includes('Senior Frontend Engineer'));
    expect(roleGroup).toBeDefined();
    expect(roleGroup!.questions.some((q) => q.includes('Senior Frontend Engineer'))).toBe(true);

    const companyGroup = groups.find((g) => g.category.includes('Acme Corp'));
    expect(companyGroup!.questions.some((q) => q.includes('Senior Frontend Engineer'))).toBe(true);
  });

  it('omits the role group when no job role is given', () => {
    const groups = generateMockInterviewQuestions(baseResume, 'Acme Corp');
    expect(groups.some((g) => g.category.startsWith('Fit for'))).toBe(false);
  });
});

describe('flattenInterviewQuestions', () => {
  it('produces one ordered item per question, tagged with its group category', () => {
    const groups = generateMockInterviewQuestions(baseResume, 'Acme Corp');
    const flat = flattenInterviewQuestions(groups);

    const totalQuestions = groups.reduce((sum, g) => sum + g.questions.length, 0);
    expect(flat.length).toBe(totalQuestions);
    expect(flat[0]).toEqual({ category: groups[0].category, question: groups[0].questions[0] });
  });

  it('returns an empty list for an empty group list', () => {
    expect(flattenInterviewQuestions([])).toEqual([]);
  });
});
