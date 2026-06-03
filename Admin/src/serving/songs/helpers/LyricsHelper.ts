/** Convert catalog lyric lines to ChordPro-style section labels. */
export function formatCatalogLyrics(rawLyrics: string | undefined | null): string {
  if (!rawLyrics?.trim()) return "";

  const lines = rawLyrics.split("\n");
  const newLines: string[] = [];
  let nextLineIsTitle = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (nextLineIsTitle) newLines.push(`[${line}]`);
    else newLines.push(line);
    nextLineIsTitle = line === "";
  }

  return newLines.join("\n").replaceAll("[]", "").trim();
}
