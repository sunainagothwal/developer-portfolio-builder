import type { Profile, Skill, Project, WorkExperience, Education, Achievement } from '@models/models';
import { formatDate } from '@utils/date';

export interface PortfolioSiteData {
  profile: Profile | null;
  skills: Skill[];
  experience: WorkExperience[];
  education: Education[];
  projects: Project[];
  achievements: Achievement[];
}

function escapeHtml(input = ''): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Generates a complete, dependency-free static portfolio website as a single
 * HTML file (inline CSS + vanilla JS). No build step, no server — the user
 * can host it anywhere (GitHub Pages, Netlify, Vercel, S3, or just open it locally).
 */
export function buildPortfolioSiteHtml(data: PortfolioSiteData): string {
  const { profile, skills, experience, education, projects, achievements } = data;
  const featuredProjects = projects.filter((p) => p.featured).length ? projects.filter((p) => p.featured) : projects;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(profile?.fullName || 'Developer Portfolio')}</title>
<meta name="description" content="${escapeHtml(profile?.headline || 'Developer Portfolio')}" />
<style>
  :root {
    --bg: #0B0E14; --surface: #12151D; --text: #E6E8EE; --muted: #9AA0AC;
    --accent: #6C5CE7; --accent2: #00B4D8; --border: #232733;
  }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, Inter, Segoe UI, Roboto, sans-serif; background: var(--bg); color: var(--text); line-height:1.6; }
  .container { max-width: 880px; margin: 0 auto; padding: 0 24px; }
  header.hero { padding: 100px 0 60px; text-align:center; background: radial-gradient(circle at top, rgba(108,92,231,0.18), transparent 60%); }
  .avatar { width:112px; height:112px; border-radius:50%; object-fit:cover; margin-bottom:20px; border:3px solid var(--accent); }
  h1 { font-size: 2.4rem; margin: 0 0 6px; background: linear-gradient(90deg, var(--accent), var(--accent2)); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .headline { color: var(--muted); font-size:1.1rem; margin-bottom: 16px; }
  .bio { max-width: 620px; margin: 0 auto 24px; color: #C7CBD4; }
  .links { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
  .links a { color: var(--text); text-decoration:none; padding:8px 16px; border:1px solid var(--border); border-radius:999px; font-size:0.9rem; transition: 0.2s; }
  .links a:hover { border-color: var(--accent); color: var(--accent); }
  section { padding: 48px 0; border-top: 1px solid var(--border); }
  h2.section-title { font-size:0.85rem; text-transform:uppercase; letter-spacing:2px; color: var(--accent2); margin-bottom:28px; }
  .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:20px; }
  .card { background: var(--surface); border:1px solid var(--border); border-radius:14px; padding:22px; }
  .card img { width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:14px; }
  .card h3 { margin: 0 0 6px; font-size:1.05rem; }
  .card p { color: var(--muted); font-size:0.9rem; margin: 0 0 10px; }
  .tags { display:flex; flex-wrap:wrap; gap:6px; }
  .tag { font-size:0.72rem; background: rgba(108,92,231,0.15); color: var(--accent); padding:3px 10px; border-radius:999px; }
  .timeline-item { padding-left: 20px; border-left: 2px solid var(--border); margin-bottom: 28px; position:relative; }
  .timeline-item::before { content:''; position:absolute; left:-7px; top:4px; width:12px; height:12px; border-radius:50%; background: var(--accent); }
  .timeline-item .date { font-size:0.78rem; color: var(--muted); }
  .timeline-item h3 { margin: 4px 0 2px; }
  .timeline-item .sub { color: var(--muted); font-size:0.9rem; margin-bottom:6px; }
  .skills-wrap { display:flex; flex-wrap:wrap; gap:10px; }
  .skill-pill { background: var(--surface); border:1px solid var(--border); padding:8px 16px; border-radius:10px; font-size:0.85rem; }
  .skill-pill b { color: var(--accent2); }
  footer { text-align:center; padding: 40px 0; color: var(--muted); font-size:0.8rem; }
</style>
</head>
<body>
  <header class="hero">
    <div class="container">
      ${profile?.avatarUri ? `<img class="avatar" src="${profile.avatarUri}" alt="Avatar" />` : ''}
      <h1>${escapeHtml(profile?.fullName || 'Your Name')}</h1>
      <div class="headline">${escapeHtml(profile?.headline || '')}</div>
      ${profile?.bio ? `<p class="bio">${escapeHtml(profile.bio)}</p>` : ''}
      <div class="links">
        ${profile?.email ? `<a href="mailto:${escapeHtml(profile.email)}">Email</a>` : ''}
        ${profile?.website ? `<a href="${escapeHtml(profile.website)}" target="_blank" rel="noopener">Website</a>` : ''}
        ${(profile?.socialLinks ?? []).map((l) => `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`).join('')}
      </div>
    </div>
  </header>

  ${
    featuredProjects.length
      ? `<section><div class="container">
      <h2 class="section-title">Projects</h2>
      <div class="grid">
        ${featuredProjects
          .map(
            (p) => `
        <div class="card">
          ${p.images[0] ? `<img src="${p.images[0]}" alt="${escapeHtml(p.title)}" />` : ''}
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.summary)}</p>
          <div class="tags">${p.techStack.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
        </div>`
          )
          .join('')}
      </div>
    </div></section>`
      : ''
  }

  ${
    experience.length
      ? `<section><div class="container">
      <h2 class="section-title">Experience</h2>
      ${experience
        .map(
          (e) => `
      <div class="timeline-item">
        <div class="date">${formatDate(e.startDate)} — ${e.isCurrent ? 'Present' : formatDate(e.endDate)}</div>
        <h3>${escapeHtml(e.role)}</h3>
        <div class="sub">${escapeHtml(e.company)}</div>
        <p>${escapeHtml(e.description)}</p>
      </div>`
        )
        .join('')}
    </div></section>`
      : ''
  }

  ${
    skills.length
      ? `<section><div class="container">
      <h2 class="section-title">Skills</h2>
      <div class="skills-wrap">
        ${skills.map((s) => `<div class="skill-pill"><b>${escapeHtml(s.name)}</b> · ${escapeHtml(s.level)}</div>`).join('')}
      </div>
    </div></section>`
      : ''
  }

  ${
    education.length
      ? `<section><div class="container">
      <h2 class="section-title">Education</h2>
      ${education
        .map(
          (e) => `
      <div class="timeline-item">
        <div class="date">${formatDate(e.startDate)} — ${e.isCurrent ? 'Present' : formatDate(e.endDate)}</div>
        <h3>${escapeHtml(e.degree)}</h3>
        <div class="sub">${escapeHtml(e.institution)}</div>
      </div>`
        )
        .join('')}
    </div></section>`
      : ''
  }

  ${
    achievements.length
      ? `<section><div class="container">
      <h2 class="section-title">Achievements</h2>
      ${achievements
        .map(
          (a) => `
      <div class="timeline-item">
        <div class="date">${formatDate(a.date)}</div>
        <h3>${escapeHtml(a.title)}</h3>
        ${a.description ? `<p>${escapeHtml(a.description)}</p>` : ''}
      </div>`
        )
        .join('')}
    </div></section>`
      : ''
  }

  <footer>Built with Developer Portfolio Builder · ${new Date().getFullYear()}</footer>
</body>
</html>`;
}
