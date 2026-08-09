/**
 * Splits FAQ.md's `## Question` headings into individual Q&A entries so
 * the Help & Support dialog can render each as its own accordion item
 * (V1.11) - kept as a pure function, split out of the component so it's
 * directly unit-testable without mounting anything.
 */

export type FaqEntry = { question: string; answer: string };

export function parseFaq(markdown: string): FaqEntry[] {
  const lines = markdown.split(/\r\n|\r|\n/);
  const entries: FaqEntry[] = [];
  let current: FaqEntry | null = null;

  for (const line of lines) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      if (current) entries.push({ ...current, answer: current.answer.trim() });
      current = { question: match[1], answer: "" };
      continue;
    }
    // Skip the top-level `# Frequently Asked Questions` title and any
    // content before the first question.
    if (!current || /^#\s+/.test(line)) continue;
    current.answer += (current.answer ? "\n" : "") + line;
  }
  if (current) entries.push({ ...current, answer: current.answer.trim() });

  return entries;
}
