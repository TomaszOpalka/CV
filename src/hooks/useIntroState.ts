'use client';

import { useSyncExternalStore } from 'react';

import type { IntroState } from '@/engine/intro/introMachine';
import { introStore } from '@/engine/intro/introStore';

/** The coarse intro state (`boot` ... `done`) for components that wait for the intro to finish. */
export function useIntroState(): IntroState {
  return useSyncExternalStore(introStore.subscribe, introStore.get, introStore.getServer);
}
