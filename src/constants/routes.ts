/**
 * Central registry of route paths (Expo Router). Import this instead of
 * hardcoding path strings so refactors only touch one file.
 */
export const ROUTES = {
  login: '/(auth)/login',
  resumeUpload: '/resume-upload',

  dashboard: '/(tabs)/dashboard',
  hub: '/(tabs)/hub',
  notes: '/(tabs)/notes',
  settings: '/(tabs)/settings',

  profile: '/profile',

  skills: '/skills',
  skillForm: (id?: string) => (id ? `/skills/form?id=${id}` : '/skills/form'),

  projects: '/projects',
  projectDetail: (id: string) => `/projects/${id}`,
  projectForm: (id?: string) => (id ? `/projects/form?id=${id}` : '/projects/form'),

  experience: '/experience',
  experienceForm: (id?: string) => (id ? `/experience/form?id=${id}` : '/experience/form'),

  education: '/education',
  educationForm: (id?: string) => (id ? `/education/form?id=${id}` : '/education/form'),

  certificates: '/certificates',
  certificateForm: (id?: string) => (id ? `/certificates/form?id=${id}` : '/certificates/form'),

  achievements: '/achievements',
  achievementForm: (id?: string) => (id ? `/achievements/form?id=${id}` : '/achievements/form'),

  noteEditor: (id?: string) => (id ? `/notes/${id}` : '/notes/new'),

  learning: '/learning',
  learningForm: (id?: string) => (id ? `/learning/form?id=${id}` : '/learning/form'),

  interviews: '/interviews',
  interviewForm: (id?: string) => (id ? `/interviews/form?id=${id}` : '/interviews/form'),

  timeline: '/timeline',
  checklist: '/checklist',
  search: '/search',
  backup: '/backup',
  resume: '/resume',
  portfolioExport: '/portfolio-export',
  componentGallery: '/component-gallery',
} as const;
