import { CYAN, FIRE, GREEN, RED, WHITE } from '../glyph/palette';

/**
 * Cursor icons drawn in digits. Each row is a string on a 13 x 9 grid: `#` is the bright outline,
 * `+` a dim fill that keeps the content underneath readable, `.` is empty.
 */
export type IconName = 'heart' | 'smile' | 'case' | 'layers' | 'cap' | 'mail' | 'arrow' | 'beam';

export interface PixelIcon {
  rows: readonly string[];
  /** Palette index of the glyph atlas (white, green, cyan, fire, red). */
  palette: number;
  /** Brightness (0..6) of the `+` fill. */
  fillTone?: number;
  /** Where the click lands, in cells from the top-left corner. Default: the centre. */
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
