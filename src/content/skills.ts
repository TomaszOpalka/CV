import type { SkillGroup } from '@/types';

/** Source: the SKILLS block of the author's CV. `usedAt` only where the CV names the project. */
export const skillGroups: readonly SkillGroup[] = [
  {
    id: 'frontend',
    title: 'Languages & Frontend',
    items: [
      { id: 'typescript', name: 'TypeScript' },
      { id: 'javascript', name: 'JavaScript (ES6+)' },
      { id: 'python', name: 'Python' },
      { id: 'react', name: 'React 19' },
      { id: 'nextjs', name: 'Next.js 15' },
      { id: 'nodejs', name: 'Node.js' },
      { id: 'tailwind', name: 'Tailwind CSS' },
      { id: 'mantine', name: 'Mantine', usedAt: 'BCF, live video monitoring' },
      { id: 'zustand', name: 'Zustand' },
      { id: 'tanstack-query', name: 'TanStack Query', usedAt: 'BCF, live video monitoring' },
    ],
  },
  {
    id: 'ai',
    title: 'AI & Agents',
    items: [
      { id: 'agents', name: 'LLM agent architecture' },
      { id: 'sdks', name: 'Anthropic / OpenAI SDKs' },
      { id: 'mcp', name: 'MCP' },
      { id: 'tool-dispatch', name: 'Tool dispatch' },
      { id: 'prompt-caching', name: 'Prompt caching' },
      { id: 'pgvector', name: 'Semantic memory (pgvector)' },
    ],
  },
  {
    id: 'backend',
    title: 'Backend & Integrations',
    items: [
      { id: 'prisma', name: 'Prisma ORM', usedAt: 'BCF, Diocese of Bridgeport' },
      { id: 'fastapi', name: 'FastAPI', usedAt: 'BCF, live video monitoring' },
      { id: 'postgresql', name: 'PostgreSQL', usedAt: 'BCF, Husariabygg' },
      { id: 'dynamodb', name: 'DynamoDB', usedAt: 'BCF, live video monitoring' },
      { id: 'rest', name: 'REST APIs' },
      { id: 'oauth', name: 'OAuth 2.1' },
      { id: 'stripe', name: 'Stripe' },
      { id: 'aws', name: 'AWS (Cognito, S3, IoT Core, CloudFront)' },
    ],
  },
  {
    id: 'tools',
    title: 'Tools, Testing & Cloud',
    items: [
      { id: 'git', name: 'Git' },
      { id: 'github-actions', name: 'GitHub Actions' },
      { id: 'docker', name: 'Docker' },
      { id: 'vercel', name: 'Vercel' },
      { id: 'playwright', name: 'Playwright' },
      { id: 'vitest', name: 'Vitest', usedAt: 'BCF, live video monitoring' },
      { id: 'pytest', name: 'Pytest', usedAt: 'BCF, live video monitoring' },
      { id: 'capacitor', name: 'Capacitor', usedAt: 'BCF, live video monitoring' },
    ],
  },
];
