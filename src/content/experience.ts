import type { ExperienceItem } from '@/types';

/** PLACEHOLDER CONTENT: replace with the real CV (see docs/plan/faza-4-podstrony-i-tresci.md). */
export const experience: readonly ExperienceItem[] = [
  {
    id: 'company-a',
    company: 'Company A',
    role: 'Full-Stack Developer',
    period: '2023 - present',
    summary:
      'Building and maintaining customer-facing web applications end to end, from the database to the interface.',
    achievements: [
      'Shipped features across a TypeScript, React and Node.js code base.',
      'Raised test coverage and cut the release cycle with automated pipelines.',
      'Reviewed code and mentored teammates on performance and accessibility.',
    ],
    tech: ['TypeScript', 'React', 'Next.js', 'Node.js'],
  },
  {
    id: 'company-b',
    company: 'Company B',
    role: 'Frontend Developer',
    period: '2021 - 2023',
    summary: 'Worked on the design system and the main product interface of a SaaS platform.',
    achievements: [
      'Built a reusable component library used by several teams.',
      'Improved Core Web Vitals on the main landing pages.',
    ],
    tech: ['TypeScript', 'React', 'SCSS'],
  },
  {
    id: 'company-c',
    company: 'Company C',
    role: 'Junior Developer',
    period: '2019 - 2021',
    summary: 'First commercial role: small client projects, bug fixing and internal tools.',
    achievements: ['Delivered landing pages and internal dashboards for small businesses.'],
    tech: ['JavaScript', 'HTML', 'CSS'],
  },
];
