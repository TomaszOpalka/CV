const DIGITS = '0123456789';
const LETTER = /\p{L}/u;
const DIGIT = /\p{Nd}/u;

function randomDigit(rng: () => number): string {
  return DIGITS[Math.floor(rng() * DIGITS.length)]!;
}

/** The first `progress` (0..1) of the characters are final, the letters after them are random digits. */
export function scrambleFrame(
  text: string,
  progress: number,
  rng: () => number = Math.random,
): string {
  const chars = Array.from(text);
  const revealed = Math.floor(Math.min(1, Math.max(0, progress)) * chars.length);
  return chars.map((ch, i) => (i >= revealed && LETTER.test(ch) ? randomDigit(rng) : ch)).join('');
}

/** Picks a letter that may flip to a digit, or -1 when there is none. Never a letter next to a digit. */
export function glitchIndex(text: string, rng: () => number = Math.random): number {
  const chars = Array.from(text);
  const candidates: number[] = [];
  chars.forEach((ch, i) => {
    if (!LETTER.test(ch)) return;
    if (i > 0 && DIGIT.test(chars[i - 1]!)) return;
    if (i < chars.length - 1 && DIGIT.test(chars[i + 1]!)) return;
    candidates.push(i);
  });
  return candidates.length === 0 ? -1 : candidates[Math.floor(rng() * candidates.length)]!;
}

/** `text` with the character at `index` replaced by a random digit. */
export function withDigitAt(text: string, index: number, rng: () => number = Math.random): string {
  const chars = Array.from(text);
  if (index < 0 || index >= chars.length) return text;
  chars[index] = randomDigit(rng);
  return chars.join('');
}
