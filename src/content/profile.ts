import type { Profile } from '@/types';

/**
 * Photo: optimised copy of the author's picture in public/assets/portrait/ (see docs/ASSETS.md for how to swap it).
 */
export const profile: Profile = {
  name: 'Tomasz Opałka',
  role: 'Fullstack Developer',
  about: [
    'Hi, I’m Tomasz Opałka. I’m a Full-Stack Developer based in Wrocław. I build modern web applications by combining engineering precision with the speed provided by AI tools.',
    'I specialize in TypeScript, React, Next.js, and Node.js, drawing on my commercial experience. While I use AI to significantly accelerate my workflow, I personally verify every line of code and ensure its quality. I can help you build a high-performance sales page or an advanced system for your business.',
  ],
  portrait: {
    src: '/assets/portrait/portrait.webp',
    alt: 'Portrait of Tomasz Opałka smiling in the Swiss mountains, a turquoise lake behind him',
    width: 800,
    height: 1067,
    focalY: 0.3,
  },
};
