import { useSyncExternalStore } from 'react';

import { getTheme, subscribeTheme, type ThemeName } from '@/engine/edgerunner/themeStore';

/** The current look of the site ("default" or "edgerunner"). Always "default" on the server. */
export function useTheme(): ThemeName {
  return useSyncExternalStore(subscribeTheme, getTheme, () => 'default');
}
