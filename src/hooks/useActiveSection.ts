'use client';

import { useSyncExternalStore } from 'react';

import { sectionStore } from '@/engine/ui/sectionStore';

/** Id of the section that crosses the middle of the screen. */
export function useActiveSection(): string {
  return useSyncExternalStore(sectionStore.subscribe, sectionStore.get, sectionStore.getServer);
}
