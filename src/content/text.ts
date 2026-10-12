/** The first sentence of a text (up to the first full stop followed by a space or the end), trimmed. */
export function firstSentence(text: string): string {
  const match = /^.*?[.!?](?=\s|$)/.exec(text.trim());
  return match ? match[0] : text.trim();
}

/** What is left of a text after its first sentence. */
export function afterFirstSentence(text: string): string {
  return text.trim().slice(firstSentence(text).length).trim();
}
