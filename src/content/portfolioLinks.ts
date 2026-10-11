import type { PortfolioLink } from '@/types';

/** The three portfolio cards revealed by the explosion (from the CV and the author's notes). */
export const portfolioLinks: readonly PortfolioLink[] = [
  {
    id: 'sannagiulio',
    name: 'sannagiulio.ch',
    url: 'https://sannagiulio.ch',
    description:
      'A responsive one-page website for a Swiss financial consulting firm in 5 languages, with a reviews carousel and an email contact form. Built on commission.',
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
];
