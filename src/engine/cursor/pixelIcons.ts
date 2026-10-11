import { CYAN, FIRE, GREEN, RED, WHITE } from '../glyph/palette';

/**
 * Cursor icons drawn in digits. Every row is a string on a 13 x 9 grid (digit cells are taller than wide, so
 * this is roughly square on screen): `#` is the bright outline, `+` a dim fill that keeps the content under
 * the cursor readable, `.` is empty. Each icon has its own colour (a palette of the glyph atlas).
 */
export type IconName = 'heart' | 'smile' | 'case' | 'layers' | 'cap' | 'mail' | 'arrow' | 'beam';

export interface PixelIcon {
  rows: readonly string[];
  /** Palette index of the glyph atlas (white, green, cyan, fire, red). */
  palette: number;
  /** Brightness (0..6) of the `+` fill; the default is a dim fill that keeps the content underneath readable. */
  fillTone?: number;
  /**
   * Where the click lands, in cells from the icon's top-left corner. Default: the centre. A pointer-shaped icon puts
   * its tip here, so the tip is always exactly where the user clicks.
   */
  hotspot?: { x: number; y: number };
}

export const ICONS: Readonly<Record<IconName, PixelIcon>> = {
  heart: {
    palette: RED,
    fillTone: 4,
    rows: [
      '..###...###..',
      '.#+++#.#+++#.',
      '#+++++#+++++#',
      '#+++++++++++#',
      '.#+++++++++#.',
      '..#+++++++#..',
      '...#+++++#...',
      '....#+++#....',
      '.....###.....',
    ],
  },
  smile: {
    palette: GREEN,
    rows: [
      '...#######...',
      '..#+++++++#..',
      '.#++#+++#++#.',
      '#+++#+++#+++#',
      '#+++++++++++#',
      '#++#+++++#++#',
      '.#+##+++##+#.',
      '..#+#####+#..',
      '...#######...',
    ],
  },
  case: {
    palette: CYAN,
    rows: [
      '....#####....',
      '....#...#....',
      '#############',
      '#+++++++++++#',
      '#+++++#+++++#',
      '#############',
      '#+++++++++++#',
      '#+++++++++++#',
      '#############',
    ],
  },
  layers: {
    palette: GREEN,
    rows: [
      '#############',
      '#+++++++++++#',
      '#############',
      '.............',
      '.###########.',
      '.#+++++++++#.',
      '.###########.',
      '.............',
      '..#########..',
    ],
  },
  cap: {
    palette: CYAN,
    rows: [
      '......#......',
      '....#####....',
      '..#########..',
      '.#+++++++++#.',
      '#############',
      '...#+++++#...',
      '...#+++++#..#',
      '...#######..#',
      '............#',
    ],
  },
  mail: {
    palette: FIRE,
    rows: [
      '#############',
      '##+++++++++##',
      '#+#+++++++#+#',
      '#++#+++++#++#',
      '#+++#+++#+++#',
      '#++++#+#++++#',
      '#+++++#+++++#',
      '#+++++++++++#',
      '#############',
    ],
  },
  // Points up and to the left like the system pointer; its tip (the top-left corner) is the click point.
  arrow: {
    palette: WHITE,
    hotspot: { x: 0, y: 0 },
    rows: [
      '#######......',
      '#####........',
      '####.#.......',
      '###...#......',
      '##.....#.....',
      '#.......#....',
      '.........#...',
      '..........#..',
      '...........#.',
    ],
  },
  beam: {
    palette: WHITE,
    rows: [
      '...#######...',
      '......#......',
      '......#......',
      '......#......',
      '......#......',
      '......#......',
      '......#......',
      '......#......',
      '...#######...',
    ],
  },
};

const BY_SECTION: Readonly<Record<string, IconName>> = {
  about: 'smile',
  portfolio: 'heart',
  experience: 'case',
  stack: 'layers',
  education: 'cap',
  contact: 'mail',
};

export function iconForSection(id: string | undefined): IconName {
  return (id !== undefined && BY_SECTION[id]) || 'heart';
}

export function isIconName(value: string | undefined): value is IconName {
  return value !== undefined && Object.hasOwn(ICONS, value);
}
