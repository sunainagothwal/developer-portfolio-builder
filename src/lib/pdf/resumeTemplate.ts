import type { Profile, Skill, Project, WorkExperience, Education, Certificate } from '@models/models';
import { formatDate } from '@utils/date';

export interface ResumeData {
  profile: Profile | null;
  skills: Skill[];
  experience: WorkExperience[];
  education: Education[];
  projects: Project[];
  certificates: Certificate[];
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Renders a clean, single-column, ATS-friendly resume as an HTML string.
 * Used both for the in-app preview (WebView-free, rendered via Print) and
 * the final PDF export via expo-print.
 */
export function buildResumeHtml(data: ResumeData, accentColor = '#5B4CF0'): string {
  const { profile, skills, experience, education, projects, certificates } = data;

  const featuredSkills = skills.filter((s) => s.featured).length > 0 ? skills.filter((s) => s.featured) : skills;
  const featuredProjects = projects.filter((p) => p.featured).length > 0 ? projects.filter((p) => p.featured) : projects.slice(0, 4);

  const skillsByCategory = featuredSkills.reduce<Record<string, Skill[]>>((acc, s) => {
    acc[s.category] = acc[s.category] ?? [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, Helvetica, Arial, sans-serif;
          color: #1B1B22;
          padding: 32px 40px;
          font-size: 12.5px;
          line-height: 1.5;
        }
        h1 { font-size: 26px; margin: 0 0 4px 0; color: ${accentColor}; }
        h2 {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: ${accentColor};
          border-bottom: 2px solid ${accentColor};
          padding-bottom: 4px;
          margin: 20px 0 10px 0;
        }
        .headline { font-size: 15px; color: #444; margin-bottom: 6px; }
        .contact { font-size: 11.5px; color: #555; margin-bottom: 4px; }
        .entry { margin-bottom: 12px; }
        .entry-title { font-weight: 700; font-size: 13px; }
        .entry-sub { font-size: 12px; color: #444; }
        .entry-date { font-size: 11px; color: #777; float: right; }
        .desc { margin-top: 4px; font-size: 12px; color: #333; }
        ul { margin: 4px 0 0 18px; padding: 0; }
        li { margin-bottom: 2px; }
        .tags { margin-top: 4px; }
        .tag {
          display: inline-block;
          background: #F0EFFA;
          color: ${accentColor};
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10.5px;
          margin: 2px 4px 2px 0;
        }
        .skills-cat { margin-bottom: 6px; }
        .skills-cat b { text-transform: capitalize; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(profile?.fullName || 'Your Name')}</h1>
      <div class="headline">${escapeHtml(profile?.headline || '')}</div>
      <div class="contact">
        ${[profile?.email, profile?.phone, profile?.location, profile?.website]
          .filter((v): v is string => Boolean(v))
          .map(escapeHtml)
          .join(' &nbsp;|&nbsp; ')}
      </div>

      ${profile?.bio ? `<h2>Summary</h2><div class="desc">${escapeHtml(profile.bio)}</div>` : ''}

      ${
        experience.length
          ? `<h2>Experience</h2>${experience
              .map(
                (e) => `
        <div class="entry">
          <span class="entry-date">${formatDate(e.startDate)} - ${e.isCurrent ? 'Present' : formatDate(e.endDate)}</span>
          <div class="entry-title">${escapeHtml(e.role)}</div>
          <div class="entry-sub">${escapeHtml(e.company)}${e.location ? ` · ${escapeHtml(e.location)}` : ''}</div>
          ${e.description ? `<div class="desc">${escapeHtml(e.description)}</div>` : ''}
          ${
            e.achievements.length
              ? `<ul>${e.achievements.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
              : ''
          }
          ${
            e.techStack.length
              ? `<div class="tags">${e.techStack.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
              : ''
          }
        </div>`
              )
              .join('')}`
          : ''
      }

      ${
        featuredProjects.length
          ? `<h2>Projects</h2>${featuredProjects
              .map(
                (p) => `
        <div class="entry">
          <div class="entry-title">${escapeHtml(p.title)}</div>
          ${p.summary ? `<div class="desc">${escapeHtml(p.summary)}</div>` : ''}
          ${
            p.techStack.length
              ? `<div class="tags">${p.techStack.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
              : ''
          }
        </div>`
              )
              .join('')}`
          : ''
      }

      ${
        education.length
          ? `<h2>Education</h2>${education
              .map(
                (e) => `
        <div class="entry">
          <span class="entry-date">${formatDate(e.startDate)} - ${e.isCurrent ? 'Present' : formatDate(e.endDate)}</span>
          <div class="entry-title">${escapeHtml(e.degree)}</div>
          <div class="entry-sub">${escapeHtml(e.institution)}${e.fieldOfStudy ? ` · ${escapeHtml(e.fieldOfStudy)}` : ''}</div>
        </div>`
              )
              .join('')}`
          : ''
      }

      ${
        Object.keys(skillsByCategory).length
          ? `<h2>Skills</h2>${Object.entries(skillsByCategory)
              .map(
                ([cat, list]) =>
                  `<div class="skills-cat"><b>${escapeHtml(cat.replace('-', ' '))}:</b> ${list
                    .map((s) => escapeHtml(s.name))
                    .join(', ')}</div>`
              )
              .join('')}`
          : ''
      }

      ${
        certificates.length
          ? `<h2>Certificates</h2>${certificates
              .map(
                (c) => `
        <div class="entry">
          <span class="entry-date">${formatDate(c.issueDate)}</span>
          <div class="entry-title">${escapeHtml(c.name)}</div>
          <div class="entry-sub">${escapeHtml(c.issuingOrg)}</div>
        </div>`
              )
              .join('')}`
          : ''
      }
    </body>
  </html>`;
}
