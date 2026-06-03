export const PREFERRED_GIVING_LABELS: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "Tithe", patterns: [/^tithe$/i, /\btith(e|es|ing)\b/i] },
  { label: "Seed", patterns: [/^seed$/i, /\bseed(s|ing)?\b/i, /\bfaith seed\b/i] },
  { label: "Offering", patterns: [/^offering$/i, /\boffering(s)?\b/i, /\bgeneral offering\b/i] },
  { label: "New Locations", patterns: [/\bnew location(s)?\b/i, /\bcampus expansion\b/i] },
  { label: "Local & Global Missions", patterns: [/\bmission(s)?\b/i, /\blocal.*global\b/i, /\bglobal.*local\b/i] },
  { label: "NextGen", patterns: [/\bnext ?gen\b/i, /\bnext generation\b/i, /\byouth\b/i, /\bchildren\b/i] },
  { label: "Free Resources", patterns: [/\bfree resource(s)?\b/i, /\bresource(s)?\b/i] }
];

export function toPreferredGivingLabel(rawName?: string): string {
  const normalized = String(rawName || "").trim();
  if (!normalized) return "General";
  for (const entry of PREFERRED_GIVING_LABELS) {
    if (entry.patterns.some((pattern) => pattern.test(normalized))) return entry.label;
  }
  return normalized;
}
