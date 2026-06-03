export type LyricsLine =
  | { type: "section"; text: string }
  | { type: "line"; text: string }
  | { type: "blank" };

const CHORD_IN_BRACKETS = /\[[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/[A-G][#b]?)?\]/gi;
const SECTION_LINE = /^\[([^\]]+)\]$/;

function isSectionLabel(label: string) {
  const t = label.trim();
  if (!t) return false;
  if (/\s/.test(t)) return true;
  return /^(verse|chorus|bridge|intro|outro|pre-?chorus|hook|tag|refrain|interlude|ending|v\d|c\d)/i.test(t);
}

function stripInlineChords(line: string) {
  return line.replace(CHORD_IN_BRACKETS, "").replace(/\s{2,}/g, " ").trim();
}

/** Parse ChordPro / plain lyrics for mobile display. */
export function parseLyricsForDisplay(raw?: string | null): LyricsLine[] {
  if (!raw?.trim()) return [];

  const result: LyricsLine[] = [];
  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      result.push({ type: "blank" });
      continue;
    }

    const sectionMatch = trimmed.match(SECTION_LINE);
    if (sectionMatch) {
      const label = sectionMatch[1];
      if (isSectionLabel(label)) {
        result.push({ type: "section", text: label });
        continue;
      }
    }

    const text = stripInlineChords(trimmed);
    if (text) result.push({ type: "line", text });
  }

  return result;
}
