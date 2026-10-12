import type { gsap as Gsap } from 'gsap';
import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger';

export interface GsapKit {
  gsap: typeof Gsap;
  ScrollTrigger: typeof ScrollTriggerType;
}

let pending: Promise<GsapKit> | null = null;

/** Loads GSAP and ScrollTrigger once, on demand, so the first paint never waits for them. */
export function loadGsap(): Promise<GsapKit> {
  pending ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
    ([core, trigger]) => {
      core.gsap.registerPlugin(trigger.ScrollTrigger);
      return { gsap: core.gsap, ScrollTrigger: trigger.ScrollTrigger };
    },
  );
  return pending;
}
