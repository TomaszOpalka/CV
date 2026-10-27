import { edgerunnerAssets, EDGERUNNER_MOBILE_MAX } from '@/content/edgerunner';

let started = false;

/**
 * Warms up everything the switch needs (the effects' code and the hero picture for this screen). Called when the
 * button is hovered, focused or touched, so visitors who never use it download nothing.
 */
export function preloadEdgerunner(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  void import('./LightningTransition');
  void import('./LaserCursor');
  const narrow = window.matchMedia(`(max-width: ${EDGERUNNER_MOBILE_MAX}px)`).matches;
  new Image().src = narrow ? edgerunnerAssets.heroMobile : edgerunnerAssets.heroDesktop;
}
