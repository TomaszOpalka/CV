import type { Profile } from '@/types';

/**
 * PLACEHOLDER CONTENT: replace with the real text and photo.
 * Photo: drop the file into public/assets/portrait/ and change `portrait.src` (see docs/ASSETS.md).
 */
export const profile: Profile = {
  name: 'Tomasz Opalka',
  role: 'Frontend Developer',
  about: [
    'To jest miejsce na krótki opis o mnie: kim jestem, czym się zajmuję i jakie projekty lubię budować.',
    'Tu pojawią się dwa, trzy zdania o doświadczeniu, technologiach i tym, w czym mogę pomóc przy Twojej stronie.',
  ],
  portrait: {
    src: '/assets/portrait/portrait-placeholder.svg',
    alt: 'Portret autora strony (zdjęcie tymczasowe)',
    width: 800,
    height: 1000,
    focalY: 0.35,
  },
};
