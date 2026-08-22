/**
 * Global domain models for Developer Portfolio Builder.
 * These map 1:1 to SQLite tables (see src/lib/db/schema.ts).
 * Keep this file as the single source of truth for entity shapes.
 */

export type ID = string;

export interface BaseEntity {
  id: ID;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/* ------------------------------- Profile -------------------------------- */

export interface SocialLink {
  id: ID;
  label: string; // "GitHub", "LinkedIn", "Twitter/X", "Website"...
  url: string;
  icon?: string;
}

export interface Profile extends BaseEntity {
  fullName: string;
  headline: string; // e.g. "Senior Frontend Engineer"
  bio: string;
  email: string;
  phone?: string;
  location?: string;
  avatarUri?: string; // local file URI
  website?: string;
  socialLinks: SocialLink[];
  availability?: 'open-to-work' | 'open-to-freelance' | 'not-looking';
}

/* -------------------------------- Skills -------------------------------- */

export type SkillCategory =
  | 'language'
  | 'framework'
  | 'database'
  | 'devops'
  | 'design'
  | 'soft-skill'
  | 'tool'
  | 'other';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Skill extends BaseEntity {
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  yearsOfExperience?: number;
  featured: boolean;
  notes?: string;
}

/* ------------------------------- Projects -------------------------------- */

export type ProjectStatus = 'idea' | 'in-progress' | 'completed' | 'archived' | 'maintained';

export interface ProjectLink {
  label: string; // "Live Demo", "Source", "Case Study"
  url: string;
}

export interface Project extends BaseEntity {
  title: string;
  summary: string;
  description: string; // markdown
  status: ProjectStatus;
  techStack: string[];
  role?: string;
  startDate?: string;
  endDate?: string;
  links: ProjectLink[];
  images: string[]; // local URIs
  featured: boolean;
  skillIds: string[]; // linked skills
}

/* ---------------------------- Work Experience ----------------------------- */

export interface WorkExperience extends BaseEntity {
  company: string;
  role: string;
  location?: string;
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance';
  startDate: string;
  endDate?: string; // undefined = current
  isCurrent: boolean;
  description: string; // markdown, bullet responsibilities
  achievements: string[];
  techStack: string[];
}

/* ------------------------------- Education -------------------------------- */

export interface Education extends BaseEntity {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  grade?: string;
  description?: string;
}

/* ------------------------------ Certificates ------------------------------ */

export interface Certificate extends BaseEntity {
  name: string;
  issuingOrg: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  fileUri?: string; // attached PDF/image
}

/* ------------------------------ Achievements ------------------------------ */

export type AchievementCategory = 'award' | 'publication' | 'talk' | 'open-source' | 'competition' | 'other';

export interface Achievement extends BaseEntity {
  title: string;
  category: AchievementCategory;
  date: string;
  description?: string;
  url?: string;
}

/* -------------------------------- Notes ------------------------------------ */

export interface Note extends BaseEntity {
  title: string;
  content: string; // markdown
  tags: string[];
  pinned: boolean;
  color?: string;
}

/* ---------------------------- Learning Tracker ----------------------------- */

export type LearningStatus = 'planned' | 'in-progress' | 'completed' | 'paused';

export interface LearningItem extends BaseEntity {
  title: string;
  type: 'course' | 'book' | 'video' | 'article' | 'project' | 'other';
  status: LearningStatus;
  progress: number; // 0-100
  source?: string;
  url?: string;
  notes?: string;
  targetDate?: string;
}

/* --------------------------- Interview Tracker ----------------------------- */

export type InterviewStage =
  | 'applied'
  | 'phone-screen'
  | 'technical'
  | 'onsite'
  | 'offer'
  | 'rejected'
  | 'withdrawn'
  | 'accepted';

export interface InterviewRound {
  id: ID;
  stage: InterviewStage;
  date: string;
  notes?: string;
}

export interface InterviewEntry extends BaseEntity {
  company: string;
  role: string;
  stage: InterviewStage;
  appliedDate: string;
  location?: string;
  salaryRange?: string;
  rounds: InterviewRound[];
  notes?: string;
  jobUrl?: string;
}

/* ------------------------------- Timeline ---------------------------------- */

export type TimelineEventType =
  | 'job'
  | 'education'
  | 'certificate'
  | 'achievement'
  | 'project';

export interface TimelineEvent {
  id: ID;
  type: TimelineEventType;
  title: string;
  subtitle?: string;
  date: string;
  endDate?: string;
  sourceId: string; // id of the underlying entity
}

/* ------------------------------ Checklist ----------------------------------- */

export interface ChecklistItem {
  id: ID;
  label: string;
  description?: string;
  done: boolean;
  category: string;
}

/* -------------------------------- Settings ---------------------------------- */

export type ThemeMode = 'system' | 'light' | 'dark';

export type ThemePreset =
  | 'default'
  | 'github'
  | 'dracula'
  | 'nord'
  | 'tokyo-night'
  | 'one-dark'
  | 'catppuccin';

export interface AppSettings {
  themeMode: ThemeMode;
  onboardingComplete: boolean;
  lastBackupAt?: string;
}

/* --------------------------- Search / Aggregation ---------------------------- */

export type SearchableType =
  | 'project'
  | 'skill'
  | 'experience'
  | 'education'
  | 'certificate'
  | 'achievement'
  | 'note'
  | 'learning'
  | 'interview';

export interface SearchResult {
  id: ID;
  type: SearchableType;
  title: string;
  subtitle?: string;
  route: string;
}
