import type { Education, Certificate, Project, Skill, WorkExperience, Achievement } from '@models/models';
import { useEducationStore } from '@store/educationStore';
import { useCertificatesStore } from '@store/certificatesStore';
import { useProjectsStore } from '@store/projectsStore';
import { useSkillsStore } from '@store/skillsStore';
import { useExperienceStore } from '@store/experienceStore';
import { useAchievementsStore } from '@store/achievementsStore';
import { guessSkillCategory } from '@utils/skillCategory';
import type { ParsedResume } from './resumeParser';

export interface ImportSelection {
  education: boolean;
  certificates: boolean;
  projects: boolean;
  skills: boolean;
  experience: boolean;
  achievements: boolean;
}

export interface ImportSummary {
  education: number;
  certificates: number;
  projects: number;
  skills: number;
  experience: number;
  achievements: number;
  skipped: number;
  /**
   * Entries imported with no date, because the resume did not state one. They
   * are saved so nothing is lost, but the user has to fill the date in before
   * the entry validates.
   */
  missingDates: number;
  /** Ids created by this import, so the whole thing can be rolled back. */
  created: CreatedRef[];
}

export interface CreatedRef {
  store: 'education' | 'certificates' | 'projects' | 'skills' | 'experience' | 'achievements';
  id: string;
}

const STORES = {
  education: useEducationStore,
  certificates: useCertificatesStore,
  projects: useProjectsStore,
  skills: useSkillsStore,
  experience: useExperienceStore,
  achievements: useAchievementsStore,
} as const;

/**
 * Removes everything a previous import created. Entries the user already had
 * are untouched, because only ids created during that import are recorded.
 */
export async function undoImport(created: CreatedRef[]): Promise<number> {
  let removed = 0;
  for (const ref of created) {
    try {
      await STORES[ref.store].getState().remove(ref.id);
      removed += 1;
    } catch {
      // Already deleted by hand — nothing to roll back.
    }
  }
  return removed;
}

/** Case/whitespace-insensitive key used for duplicate detection. */
const key = (value: string | undefined) => (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Writes the selected sections of a parsed resume into the Manage stores.
 *
 * Existing entries are never modified or removed — anything that already
 * exists is skipped, so importing the same resume twice is safe.
 *
 * Dates are never invented. An entry whose date the resume did not state is
 * saved with an empty date and counted in `missingDates`; filling it in with
 * today's date, as this used to, silently wrote a wrong value into every such
 * record and made the Manage screens disagree with the resume.
 */
export async function importResumeSections(
  parsed: ParsedResume,
  selection: ImportSelection,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    education: 0, certificates: 0, projects: 0, skills: 0, experience: 0, achievements: 0,
    skipped: 0, missingDates: 0, created: [],
  };

  // Stores must be loaded before we can detect duplicates against them.
  await Promise.all(
    [
      useEducationStore.getState(),
      useCertificatesStore.getState(),
      useProjectsStore.getState(),
      useSkillsStore.getState(),
      useExperienceStore.getState(),
      useAchievementsStore.getState(),
    ].map((s) => (s.loaded ? Promise.resolve() : s.load())),
  );

  /** Records the new id so the whole import can be undone as one action. */
  const track = (store: CreatedRef['store'], created: unknown): void => {
    const id = (created as { id?: string } | undefined)?.id;
    if (typeof id === 'string') summary.created.push({ store, id });
  };

  if (selection.skills && parsed.skills.length) {
    const store = useSkillsStore.getState();
    const existing = new Set(store.items.map((s) => key(s.name)));
    for (const name of parsed.skills) {
      if (existing.has(key(name))) {
        summary.skipped += 1;
        continue;
      }
      existing.add(key(name));
      // No date fields: the Skill model has none and none are inferred.
      const created = await store.add({
        name: name.trim(),
        category: guessSkillCategory(name),
        level: 'intermediate',
        featured: false,
      } as Partial<Skill>);
      track('skills', created);
      summary.skills += 1;
    }
  }

  if (selection.education && parsed.education.length) {
    const store = useEducationStore.getState();
    // The start date is part of the key so two degrees from the same school
    // are both kept rather than the second being dropped as a duplicate.
    const idFor = (e: { institution: string; degree: string; startDate?: string }) =>
      `${key(e.institution)}|${key(e.degree)}|${key(e.startDate)}`;
    const existing = new Set(store.items.map(idFor));
    for (const entry of parsed.education) {
      const id = idFor(entry);
      if (existing.has(id)) {
        summary.skipped += 1;
        continue;
      }
      existing.add(id);
      if (!entry.startDate) summary.missingDates += 1;
      const created = await store.add({
        institution: entry.institution,
        degree: entry.degree,
        fieldOfStudy: entry.fieldOfStudy,
        startDate: entry.startDate ?? '',
        endDate: entry.endDate,
        isCurrent: entry.isCurrent,
        grade: entry.grade,
      } as Partial<Education>);
      track('education', created);
      summary.education += 1;
    }
  }

  if (selection.certificates && parsed.certificates.length) {
    const store = useCertificatesStore.getState();
    const idFor = (c: { name: string; issuingOrg?: string }) => `${key(c.name)}|${key(c.issuingOrg)}`;
    const existing = new Set(store.items.map(idFor));
    for (const entry of parsed.certificates) {
      const id = idFor(entry);
      if (existing.has(id)) {
        summary.skipped += 1;
        continue;
      }
      existing.add(id);
      if (!entry.issueDate) summary.missingDates += 1;
      const created = await store.add({
        name: entry.name,
        issuingOrg: entry.issuingOrg,
        issueDate: entry.issueDate ?? '',
        expiryDate: entry.expiryDate,
        credentialId: entry.credentialId,
        credentialUrl: entry.credentialUrl,
      } as Partial<Certificate>);
      track('certificates', created);
      summary.certificates += 1;
    }
  }

  if (selection.projects && parsed.projects.length) {
    const store = useProjectsStore.getState();
    const existing = new Set(store.items.map((p) => key(p.title)));
    for (const entry of parsed.projects) {
      if (existing.has(key(entry.title))) {
        summary.skipped += 1;
        continue;
      }
      existing.add(key(entry.title));
      const created = await store.add({
        title: entry.title,
        summary: entry.summary,
        description: entry.description,
        // A resume lists work already done; anything still running says so via
        // its own dates, which the user can correct on review.
        status: 'completed',
        techStack: entry.techStack,
        startDate: entry.startDate,
        endDate: entry.endDate,
        links: entry.links,
        images: [],
        featured: false,
        skillIds: [],
      } as Partial<Project>);
      track('projects', created);
      summary.projects += 1;
    }
  }

  if (selection.experience && parsed.experience.length) {
    const store = useExperienceStore.getState();
    const idFor = (e: { company: string; role: string; startDate?: string }) =>
      `${key(e.company)}|${key(e.role)}|${key(e.startDate)}`;
    const existing = new Set(store.items.map(idFor));
    for (const entry of parsed.experience) {
      const id = idFor(entry);
      if (existing.has(id)) {
        summary.skipped += 1;
        continue;
      }
      existing.add(id);
      if (!entry.startDate) summary.missingDates += 1;
      const created = await store.add({
        company: entry.company,
        role: entry.role,
        startDate: entry.startDate ?? '',
        endDate: entry.endDate,
        isCurrent: entry.isCurrent,
        description: entry.description,
        achievements: [],
        techStack: entry.techStack,
      } as Partial<WorkExperience>);
      track('experience', created);
      summary.experience += 1;
    }
  }

  if (selection.achievements && parsed.achievements.length) {
    const store = useAchievementsStore.getState();
    const existing = new Set(store.items.map((a) => key(a.title)));
    for (const entry of parsed.achievements) {
      if (existing.has(key(entry.title))) {
        summary.skipped += 1;
        continue;
      }
      existing.add(key(entry.title));
      if (!entry.date) summary.missingDates += 1;
      const created = await store.add({
        title: entry.title,
        category: entry.category,
        date: entry.date ?? '',
        description: entry.description,
      } as Partial<Achievement>);
      track('achievements', created);
      summary.achievements += 1;
    }
  }

  return summary;
}
