import type { SkillGroup } from '@/types';

/** PLACEHOLDER CONTENT: replace with the real stack, where each technology was used and since when. */
export const skillGroups: readonly SkillGroup[] = [
  {
    id: 'frontend',
    title: 'Frontend',
    items: [
      { id: 'typescript', name: 'TypeScript', usedAt: 'Company A, Company B', since: '2020' },
      { id: 'react', name: 'React', usedAt: 'Company A, Company B', since: '2020' },
      { id: 'nextjs', name: 'Next.js', usedAt: 'Company A, this portfolio', since: '2022' },
      { id: 'scss', name: 'SCSS', usedAt: 'Company B, this portfolio', since: '2019' },
    ],
  },
  {
    id: 'backend',
    title: 'Backend',
    items: [
      { id: 'nodejs', name: 'Node.js', usedAt: 'Company A', since: '2021' },
      { id: 'rest', name: 'REST APIs', usedAt: 'Company A, Company B', since: '2021' },
    ],
  },
  {
    id: 'databases',
    title: 'Databases',
    items: [{ id: 'postgresql', name: 'PostgreSQL', usedAt: 'Company A', since: '2022' }],
  },
  {
    id: 'devops',
    title: 'DevOps and cloud',
    items: [
      {
        id: 'github-actions',
        name: 'GitHub Actions',
        usedAt: 'Company A, this portfolio',
        since: '2021',
      },
      { id: 'netlify', name: 'Netlify', usedAt: 'This portfolio', since: '2026' },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    items: [
      { id: 'git', name: 'Git', usedAt: 'Everywhere', since: '2018' },
      { id: 'playwright', name: 'Playwright', usedAt: 'Company A, this portfolio', since: '2023' },
      { id: 'vitest', name: 'Vitest', usedAt: 'This portfolio', since: '2024' },
    ],
  },
];
