import type { ExperienceItem } from '@/types';

/** Source: the author's CV (EN_CV_Tomasz_Opalka_Fullstack-AI.pdf). Keep the wording in sync with it. */
export const experience: readonly ExperienceItem[] = [
  {
    id: 'bcf',
    company: 'BCF',
    role: 'Junior Software Developer',
    period: '2025 - 2026',
    summary:
      'Grew from an internship to full involvement in commercial projects. Worked on several fullstack projects in parallel, delivering new features, performance improvements and fixes in a code-review-based workflow.',
    projects: [
      {
        id: 'video-monitoring',
        name: 'Live Video Monitoring and Virtual Guard Platform',
        summary:
          'A platform for 24/7 remote video surveillance, where operators monitor many customer sites from a single console. The web, desktop and mobile clients are built from one shared React codebase and stream live and recorded video from camera networks reached over secure tunnels.',
        achievements: [
          'New features and frontend views in React with TypeScript across web, desktop and mobile platforms.',
          'Responsive, theme-aware UI components with Mantine, SCSS Modules and dark mode support.',
          'REST API endpoints in Python/FastAPI for camera management, device status and user configurations.',
          'A snapshot-based rendering system replacing continuous camera streams, reducing system load and bandwidth.',
          'WebRTC integration for live camera views and HLS.js for recorded video playback.',
          'Application state with Recoil and server-state caching with TanStack React Query.',
          'JWT-based authentication via AWS Cognito.',
          'DynamoDB in a single-table design pattern.',
          'Automated testing with Vitest, Testing Library and Pytest.',
          'Mobile application development and releases for Android and iOS via Capacitor.',
        ],
        tech: [
          'React',
          'TypeScript',
          'Vite',
          'Mantine',
          'Electron',
          'Capacitor',
          'Python',
          'FastAPI',
          'DynamoDB',
          'AWS',
          'WebRTC',
          'Frigate',
          'Docker',
        ],
      },
      {
        id: 'diocese',
        name: 'Internal Communication and Workflow System for the Diocese of Bridgeport (USA)',
        summary:
          'An internal system that streamlines communication and administrative processes within the diocesan curia. It is integrated with Microsoft 365, so staff work with their existing accounts, mailboxes and documents.',
        achievements: [
          'New features and frontend views in React with TypeScript.',
          'Backend logic and API endpoints in Node.js with Prisma ORM, running as serverless functions.',
          'Microsoft 365 integration through the Microsoft Graph API.',
          'Single sign-on with Microsoft Entra ID (MSAL).',
          'Responsive, mobile-friendly versions of the application views.',
          'Performance improvements and refactoring of existing modules.',
          'Bug fixing and maintenance in a review-driven workflow.',
        ],
        tech: [
          'React',
          'TypeScript',
          'Node.js',
          'Prisma',
          'Microsoft Graph API',
          'Entra ID (MSAL)',
          'Azure Functions',
        ],
      },
      {
        id: 'husariabygg',
        name: 'Administrative Panel for Business Data Management (Husariabygg)',
        summary:
          'A server-side rendered (SSR) administrative CRUD panel connected to a backend-as-a-service, used by the client to manage its business data.',
        achievements: [
          'New features across the admin panel built with Remix and Refine.',
          'CRUD views, forms, data tables and filters.',
          'A complete gallery module with comments.',
          'Responsive, mobile-friendly versions of the admin panel views.',
          'Integration with Supabase (PostgreSQL): data models and queries.',
          'Performance and UX improvements of existing views.',
        ],
        tech: ['React', 'TypeScript', 'Remix', 'Refine', 'Supabase', 'PostgreSQL'],
      },
      {
        id: 'timesheet',
        name: 'Internal Time Tracking System (Timesheet)',
        summary:
          'A company-internal application for recording and reviewing employees’ working time.',
        achievements: [
          'Frontend views with React and MUI.',
          'Calendar-based time entry and overview built with FullCalendar.',
          'Responsive, mobile-friendly version of the application.',
          'Docker containerization and CI pipelines with Drone CI.',
          'New features and bug fixing.',
        ],
        tech: ['React', 'TypeScript', 'MUI', 'FullCalendar', 'Docker', 'Drone CI'],
      },
    ],
  },
  {
    id: 'sg-consulting',
    company: 'SG Consulting (Switzerland)',
    role: 'Freelance Web Developer',
    period: 'Commercial project',
    summary: 'Built on commission and sold to the client.',
    projects: [
      {
        id: 'sannagiulio',
        name: 'One-page website for a Swiss financial consulting firm',
        summary:
          'A responsive one-page website available in 5 languages (PL, EN, DE, IT, FR), with a client reviews carousel.',
        achievements: [],
        tech: ['React 18', 'Vite', 'react-i18next'],
        links: [{ label: 'sannagiulio.ch', url: 'https://sannagiulio.ch' }],
      },
    ],
  },
  {
    id: 'early-projects',
    company: 'Early frontend projects',
    role: 'Written by hand, before AI coding tools',
    summary: 'My first frontend projects, built before I started using AI coding tools.',
    projects: [
      {
        id: 'portfolio-1',
        name: 'Portfolio 1',
        summary: '',
        achievements: [],
        tech: [],
        links: [
          {
            label: 'portfolio1tomaszopalka.netlify.app',
            url: 'https://portfolio1tomaszopalka.netlify.app',
          },
        ],
      },
      {
        id: 'portfolio-2',
        name: 'Portfolio 2',
        summary: '',
        achievements: [],
        tech: [],
        links: [
          {
            label: 'portfolio2tomaszopalka.netlify.app',
            url: 'https://portfolio2tomaszopalka.netlify.app',
          },
        ],
      },
    ],
  },
  {
    id: 'part-time',
    company: 'Part-time jobs',
    role: 'Alongside studies and work',
    period: '2020 - 2026',
    summary: 'Courier, event and hostel staff, dental technician, manual labor.',
    projects: [],
  },
];
