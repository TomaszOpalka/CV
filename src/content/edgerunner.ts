/** Which hero illustration the Edgerunner look shows: the red night city or the blue day forest. */
export type EdgerunnerHero = 'night' | 'day';
export const EDGERUNNER_HERO: EdgerunnerHero = 'night';

const base = '/assets/edgerunner';

/** Files of the "Edgerunner" look (see docs/EDGERUNNER-ASSETS.md). */
export const edgerunnerAssets = {
  logo: { src: `${base}/logo/edgerunner.webp`, width: 520, height: 245 },
  heroDesktop: `${base}/images/hero-${EDGERUNNER_HERO}-pc.webp`,
  heroMobile: `${base}/images/hero-${EDGERUNNER_HERO}-mobile.webp`,
  experience: `${base}/images/bg-experience.svg`,
  stack: `${base}/images/bg-stack.svg`,
  education: `${base}/images/bg-education.webp`,
  contact: `${base}/images/bg-contact.webp`,
} as const;

export const edgerunnerHeroAlt =
  EDGERUNNER_HERO === 'night'
    ? 'Illustration of Tomasz Opałka in a cyberpunk city at night: a checked shirt, a hat and a utility harness under a swirling red sky'
    : 'Illustration of Tomasz Opałka in a checked shirt and a hat, standing in a pine forest under a swirling anime sky';

/** At or below this width the hero uses the tall phone illustration. */
export const EDGERUNNER_MOBILE_MAX = 767;
