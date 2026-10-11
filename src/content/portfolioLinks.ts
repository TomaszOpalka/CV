import type { PortfolioLink } from '@/types';

/** The portfolio carousel, revealed by the explosion: live sites and code of the author (from the CV and the author's notes). */
export const portfolioLinks: readonly PortfolioLink[] = [
  {
    id: 'sannagiulio',
    name: 'sannagiulio.ch',
    url: 'https://sannagiulio.ch',
    description:
      'A responsive one-page website for a Swiss financial consulting firm, available in 5 languages (PL, EN, DE, IT, FR), with a client reviews carousel and a contact form that sends email. Built on commission and sold to the client.',
    tech: ['React 18', 'Vite', 'react-i18next', 'EmailJS'],
  },
  {
    id: 'broniu',
    name: 'broniu.com',
    url: 'https://broniu.com',
    description: 'A website built with three.js.',
    tech: ['three.js'],
  },
  {
    id: 'portfolio-1',
    name: 'Portfolio 1',
    url: 'https://portfolio1tomaszopalka.netlify.app',
    description: 'An early frontend project, written by hand before AI coding tools.',
    tech: ['Netlify'],
  },
  {
    id: 'portfolio-2',
    name: 'Portfolio 2',
    url: 'https://portfolio2tomaszopalka.netlify.app',
    description: 'A second early frontend project, also written by hand.',
    tech: ['Netlify'],
  },
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com/TomaszOpalka',
    description: 'Code and repositories.',
  },
];
