import type { Profile } from '@/types';

/**
 * PLACEHOLDER CONTENT: replace with the real text and photo.
 * Photo: drop the file into public/assets/portrait/ and change `portrait.src` (see docs/ASSETS.md).
 */
export const profile: Profile = {
  name: 'Tomasz Opalka',
  role: 'Fullstack Developer',
  about: [
    'Hi, I’m Tomasz Opałka. I’m a Full-Stack Developer based in Wrocław. I build modern web applications by combining engineering precision with the speed provided by AI tools.',
    'I specialize in TypeScript, React, Next.js, and Node.js, drawing on my commercial experience. While I use AI to significantly accelerate my workflow, I personally verify every line of code and ensure its quality. I can help you build a high-performance sales page or an advanced system for your business.',
  ],
  portrait: {
    src: '/assets/portrait/portrait-placeholder.svg',
    alt: 'Portret autora strony (zdjęcie tymczasowe)',
    width: 800,
    height: 1000,
    focalY: 0.35,
  },
};
