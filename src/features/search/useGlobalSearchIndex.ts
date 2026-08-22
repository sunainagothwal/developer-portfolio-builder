import { useMemo } from 'react';
import { useSkillsStore } from '@store/skillsStore';
import { useProjectsStore } from '@store/projectsStore';
import { useExperienceStore } from '@store/experienceStore';
import { useEducationStore } from '@store/educationStore';
import { useCertificatesStore } from '@store/certificatesStore';
import { useAchievementsStore } from '@store/achievementsStore';
import { useNotesStore } from '@store/notesStore';
import { useLearningStore } from '@store/learningStore';
import { useInterviewStore } from '@store/interviewStore';
import { ROUTES } from '@constants/routes';
import type { SearchResult } from '@models/models';

/**
 * Builds a flattened, searchable index across every entity store in the app.
 * Kept as a hook (not a store) since it's a derived read-only projection.
 */
export function useGlobalSearchIndex(query: string): { results: SearchResult[]; loading: boolean } {
  const skills = useSkillsStore((s) => s.items);
  const projects = useProjectsStore((s) => s.items);
  const experience = useExperienceStore((s) => s.items);
  const education = useEducationStore((s) => s.items);
  const certificates = useCertificatesStore((s) => s.items);
  const achievements = useAchievementsStore((s) => s.items);
  const notes = useNotesStore((s) => s.items);
  const learning = useLearningStore((s) => s.items);
  const interviews = useInterviewStore((s) => s.items);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const all: SearchResult[] = [
      ...skills.map((s) => ({ id: s.id, type: 'skill' as const, title: s.name, subtitle: s.category, route: ROUTES.skillForm(s.id) })),
      ...projects.map((p) => ({ id: p.id, type: 'project' as const, title: p.title, subtitle: p.summary, route: ROUTES.projectDetail(p.id) })),
      ...experience.map((e) => ({ id: e.id, type: 'experience' as const, title: e.role, subtitle: e.company, route: ROUTES.experienceForm(e.id) })),
      ...education.map((e) => ({ id: e.id, type: 'education' as const, title: e.degree, subtitle: e.institution, route: ROUTES.educationForm(e.id) })),
      ...certificates.map((c) => ({ id: c.id, type: 'certificate' as const, title: c.name, subtitle: c.issuingOrg, route: ROUTES.certificateForm(c.id) })),
      ...achievements.map((a) => ({ id: a.id, type: 'achievement' as const, title: a.title, subtitle: a.category, route: ROUTES.achievementForm(a.id) })),
      ...notes.map((n) => ({ id: n.id, type: 'note' as const, title: n.title, subtitle: n.tags.join(', '), route: ROUTES.noteEditor(n.id) })),
      ...learning.map((l) => ({ id: l.id, type: 'learning' as const, title: l.title, subtitle: l.type, route: ROUTES.learningForm(l.id) })),
      ...interviews.map((i) => ({ id: i.id, type: 'interview' as const, title: i.role, subtitle: i.company, route: ROUTES.interviewForm(i.id) })),
    ];

    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(q) || (item.subtitle ?? '').toLowerCase().includes(q)
    );
  }, [query, skills, projects, experience, education, certificates, achievements, notes, learning, interviews]);

  return { results, loading: false };
}
