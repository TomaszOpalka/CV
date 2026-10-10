/** Pixel-art icons for the custom cursor: each row is a string, `#` is a lit square. */
export type IconName =
  'heart' | 'smile' | 'burst' | 'case' | 'layers' | 'cap' | 'mail' | 'arrow' | 'beam';

export const ICONS: Readonly<Record<IconName, readonly string[]>> = {
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  smile: [
    '..#####..',
    '.#.....#.',
    '#..#.#..#',
    '#.......#',
    '#.#...#.#',
    '#..###..#',
    '.#.....#.',
    '..#####..',
  ],
  burst: [
    '....#....',
    '.#..#..#.',
    '..#.#.#..',
    '...###...',
    '#########',
    '...###...',
    '..#.#.#..',
    '.#..#..#.',
    '....#....',
  ],
  case: ['..####...', '..#..#...', '#########', '#########', '####.####', '#########', '#########'],
  layers: [
    '#########',
    '#########',
    '.........',
    '.#######.',
    '.#######.',
    '.........',
    '..#####..',
    '..#####..',
  ],
  cap: ['....#....', '..#####..', '#########', '.#######.', '..#####..', '......#..', '......#..'],
  mail: ['#########', '##.....##', '#.#...#.#', '#..#.#..#', '#...#...#', '#########'],
  arrow: ['..#####', '...####', '..#.###', '.#...##', '#.....#'],
  beam: ['###.###', '...#...', '...#...', '...#...', '...#...', '###.###'],
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
