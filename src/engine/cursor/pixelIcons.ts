import { CYAN, FIRE, GREEN, WHITE } from '../glyph/palette';

/**
 * Cursor icons drawn in digits. Every row is a string on a 13 x 9 grid (digit cells are taller than wide, so
 * this is roughly square on screen): `#` is the bright outline, `+` a dim fill that keeps the content under
 * the cursor readable, `.` is empty. Each icon has its own colour (a palette of the glyph atlas).
 */
export type IconName =
  'heart' | 'smile' | 'burst' | 'case' | 'layers' | 'cap' | 'mail' | 'arrow' | 'beam';

export interface PixelIcon {
  rows: readonly string[];
  /** Palette index of the glyph atlas (white, green, cyan, fire). */
  palette: number;
}

export const ICONS: Readonly<Record<IconName, PixelIcon>> = {
  heart: {
    palette: FIRE,
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
  burst: {
    palette: FIRE,
    rows: [
      '......#......',
      '..#...#...#..',
      '...#..#..#...',
      '....#.#.#....',
      '.....###.....',
      '#############',
      '.....###.....',
      '....#.#.#....',
      '...#..#..#...',
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
    rows: [
      '......#######',
      '........#####',
      '.......#.####',
      '......#...###',
      '.....#.....##',
      '....#.......#',
      '...#.........',
      '..#..........',
      '.#...........',
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
  pixels: 'burst',
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
