import type { PortfolioLink } from '@/types';

/** The three portfolio cards revealed by the explosion (sannagiulio.ch lives in the Experience section instead). */
export const portfolioLinks: readonly PortfolioLink[] = [
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
    id: 'broniu',
    name: 'broniu.com',
    url: 'https://broniu.com',
    description: 'A website built with three.js.',
    tech: ['three.js'],
  },
];
