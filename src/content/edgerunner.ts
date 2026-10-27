/** Files of the "Edgerunner" look (see docs/EDGERUNNER-ASSETS.md). */
export const edgerunnerAssets = {
  logo: { src: '/assets/edgerunner/logo/edgerunner.webp', width: 520, height: 245 },
  heroDesktop: '/assets/edgerunner/images/hero-pc.webp',
  heroMobile: '/assets/edgerunner/images/hero-mobile.webp',
} as const;

export const edgerunnerHeroAlt =
  'Illustration of Tomasz Opałka in a checked shirt and a hat, standing in a pine forest under a swirling anime sky';

/** At or below this width the hero uses the tall phone illustration. */
export const EDGERUNNER_MOBILE_MAX = 767;
