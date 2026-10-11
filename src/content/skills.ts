import type { SkillGroup } from '@/types';

/**
 * Source: the SKILLS block of the author's CV plus the author's notes. `usedAt` only where it is known.
 * Order is the order of importance for a recruiter: groups and tiles run from the core of the profile outwards.
 */
export const skillGroups: readonly SkillGroup[] = [
  {
    id: 'frontend',
    title: 'Languages & Frontend',
    items: [
      { id: 'typescript', name: 'TypeScript', core: true },
      { id: 'javascript', name: 'JavaScript (ES6+)', core: true },
      { id: 'react', name: 'React 19', core: true },
      { id: 'nextjs', name: 'Next.js 15', core: true },
      { id: 'tanstack-query', name: 'TanStack Query', usedAt: 'BCF, live video monitoring' },
      { id: 'zustand', name: 'Zustand' },
      { id: 'recoil', name: 'Recoil', usedAt: 'BCF, live video monitoring' },
      { id: 'remix', name: 'Remix', usedAt: 'BCF, Husariabygg' },
      { id: 'threejs', name: 'three.js', usedAt: 'broniu.com' },
      { id: 'capacitor', name: 'Capacitor (iOS / Android)', usedAt: 'BCF, live video monitoring' },
    ],
  },
  {
    id: 'ui',
    title: 'UI & Styling',
    items: [
      { id: 'scss', name: 'SCSS / SCSS Modules', core: true },
      { id: 'figma', name: 'Figma', core: true },
      { id: 'tailwind', name: 'Tailwind CSS' },
      { id: 'mantine', name: 'Mantine', usedAt: 'BCF, live video monitoring' },
      { id: 'mui', name: 'MUI', usedAt: 'BCF, Timesheet' },
      { id: 'fullcalendar', name: 'FullCalendar', usedAt: 'BCF, Timesheet' },
    ],
  },
  {
    id: 'backend',
    title: 'Backend & Integrations',
    items: [
      { id: 'nodejs', name: 'Node.js', core: true },
      { id: 'python', name: 'Python', core: true },
      { id: 'fastapi', name: 'FastAPI', usedAt: 'BCF, live video monitoring', core: true },
      { id: 'prisma', name: 'Prisma ORM', usedAt: 'BCF, Diocese of Bridgeport', core: true },
      { id: 'rest', name: 'REST APIs' },
      { id: 'oauth', name: 'OAuth 2.1' },
      { id: 'graph', name: 'Microsoft Graph API', usedAt: 'BCF, Diocese of Bridgeport' },
      { id: 'stripe', name: 'Stripe' },
      { id: 'emailjs', name: 'EmailJS', usedAt: 'sannagiulio.ch' },
    ],
  },
  {
    id: 'ai',
    title: 'AI & Agents',
    items: [
      { id: 'agents', name: 'LLM agent architecture', core: true },
      { id: 'sdks', name: 'Anthropic / OpenAI SDKs', core: true },
      { id: 'mcp', name: 'MCP', core: true },
      { id: 'tool-dispatch', name: 'Tool dispatch' },
      { id: 'prompt-caching', name: 'Prompt caching' },
      { id: 'pgvector', name: 'Semantic memory (pgvector)' },
    ],
  },
  {
    id: 'databases',
    title: 'Databases',
    items: [
      { id: 'postgresql', name: 'PostgreSQL', usedAt: 'BCF, Husariabygg', core: true },
      { id: 'sql', name: 'SQL', core: true },
      { id: 'tsql', name: 'T-SQL (Azure)', core: true },
      { id: 'dynamodb', name: 'DynamoDB', usedAt: 'BCF, live video monitoring' },
      { id: 'supabase', name: 'Supabase', usedAt: 'BCF, Husariabygg' },
      { id: 'mongoose', name: 'Mongoose (MongoDB)' },
    ],
  },
  {
    id: 'cloud',
    title: 'Cloud & DevOps',
    items: [
      { id: 'aws', name: 'AWS', usedAt: 'Cognito, S3, IoT Core, CloudFront', core: true },
      { id: 'azure', name: 'Azure', usedAt: 'BCF, Diocese of Bridgeport', core: true },
      { id: 'docker', name: 'Docker', core: true },
      { id: 'github-actions', name: 'GitHub Actions' },
      { id: 'gitlab', name: 'GitLab' },
      { id: 'vercel', name: 'Vercel' },
      { id: 'netlify', name: 'Netlify' },
      { id: 'ovh', name: 'OVH' },
      { id: 'drone', name: 'Drone CI', usedAt: 'BCF, Timesheet' },
    ],
  },
  {
    id: 'tools',
    title: 'Testing & Tools',
    items: [
      { id: 'git', name: 'Git', core: true },
      { id: 'playwright', name: 'Playwright', core: true },
      { id: 'vitest', name: 'Vitest', usedAt: 'BCF, live video monitoring', core: true },
      { id: 'pytest', name: 'Pytest', usedAt: 'BCF, live video monitoring' },
      { id: 'postman', name: 'Postman' },
    ],
  },
];
