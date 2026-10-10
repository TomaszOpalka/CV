import type { PortfolioLink } from '@/types';

/** Links revealed by the explosion: the author's other portfolios and code (from the CV). */
export const portfolioLinks: readonly PortfolioLink[] = [
  {
    id: 'portfolio-1',
    name: 'Portfolio 1',
    url: 'https://portfolio1tomaszopalka.netlify.app',
    description: 'An early frontend project, written by hand before AI coding tools.',
  },
  {
    id: 'portfolio-2',
    name: 'Portfolio 2',
    url: 'https://portfolio2tomaszopalka.netlify.app',
    description: 'A second early frontend project, also written by hand.',
  },
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com/TomaszOpalka',
    description: 'Code and repositories.',
  },
];
