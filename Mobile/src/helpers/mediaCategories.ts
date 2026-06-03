import { PlaylistInterface, SermonInterface } from "@machonharuach/helpers";

/** Video library categories shown as Netflix-style rows on the Watch tab. */
export type MediaCategory = "sermon" | "movie" | "kids" | "dance" | "musicVideo" | "other";

export const MEDIA_CATEGORY_ORDER: MediaCategory[] = ["sermon", "movie", "kids", "dance", "musicVideo", "other"];

type KeywordRule = { category: MediaCategory; keywords: string[] };

/** First matching rule wins; default is sermon. */
const CATEGORY_RULES: KeywordRule[] = [
  { category: "movie", keywords: ["movie", "movies", "film", "films", "cinema", "documentary"] },
  { category: "kids", keywords: ["kid", "kids", "children", "child", "youth", "junior", "nursery", "vbs", "sunday school"] },
  { category: "dance", keywords: ["dance", "dancing", "choreography", "praise dance", "worship dance", "mime"] },
  { category: "musicVideo", keywords: ["music video", "music videos", "mv", "worship music video"] },
  {
    category: "sermon",
    keywords: [
      "sermon",
      "sermons",
      "message",
      "messages",
      "preaching",
      "prophecy",
      "prophesy",
      "prophesies",
      "word",
      "teaching",
      "bible study",
      "series",
      "service",
      "worship",
      "conference"
    ]
  }
];

export type MediaRowItem =
  | { kind: "playlist"; key: string; playlist: PlaylistInterface }
  | { kind: "sermon"; key: string; sermon: SermonInterface };

export interface MediaCategorySection {
  category: MediaCategory;
  items: MediaRowItem[];
}

function normalizeText(...parts: (string | undefined | null)[]) {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function detectMediaCategory(title?: string, description?: string): MediaCategory {
  const text = normalizeText(title, description);
  if (!text.trim()) return "sermon";

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) return rule.category;
  }
  return "other";
}

export function buildPlaylistCategoryMap(playlists: PlaylistInterface[]): Map<string, MediaCategory> {
  const map = new Map<string, MediaCategory>();
  for (const playlist of playlists) {
    if (!playlist.id) continue;
    map.set(playlist.id, detectMediaCategory(playlist.title, playlist.description));
  }
  return map;
}

function normalizeApiCategory(value?: string | null): MediaCategory | null {
  if (!value) return null;
  if (MEDIA_CATEGORY_ORDER.includes(value as MediaCategory)) return value as MediaCategory;
  return null;
}

function sermonCategory(sermon: SermonInterface, playlistCategories: Map<string, MediaCategory>): MediaCategory {
  const explicit = normalizeApiCategory((sermon as SermonInterface & { mediaCategory?: string }).mediaCategory);
  if (explicit) return explicit;
  if (sermon.playlistId && playlistCategories.has(sermon.playlistId)) {
    return playlistCategories.get(sermon.playlistId)!;
  }
  return detectMediaCategory(sermon.title, sermon.description);
}

/** Groups playlists (series) and standalone videos into category rows for the Watch tab. */
export function buildMediaCategorySections(
  playlists: PlaylistInterface[],
  sermons: SermonInterface[]
): MediaCategorySection[] {
  const playlistCategories = buildPlaylistCategoryMap(playlists);
  const videoPlaylistIds = new Set(
    playlists.filter((p) => (p.playlistType || "video") !== "music").map((p) => p.id).filter(Boolean) as string[]
  );

  const buckets: Record<MediaCategory, MediaRowItem[]> = {
    sermon: [],
    movie: [],
    kids: [],
    dance: [],
    musicVideo: [],
    other: []
  };

  for (const playlist of playlists) {
    if (!playlist.id) continue;
    if ((playlist.playlistType || "video") === "music") continue;
    const category = playlistCategories.get(playlist.id) || "sermon";
    buckets[category].push({ kind: "playlist", key: `playlist-${playlist.id}`, playlist });
  }

  for (const sermon of sermons) {
    if (!sermon.id) continue;
    if (sermon.playlistId && videoPlaylistIds.has(sermon.playlistId)) continue;
    const category = sermonCategory(sermon, playlistCategories);
    buckets[category].push({ kind: "sermon", key: `sermon-${sermon.id}`, sermon });
  }

  return MEDIA_CATEGORY_ORDER.map((category) => ({
    category,
    items: buckets[category]
  })).filter((section) => section.items.length > 0);
}

export function mediaCategoryI18nKey(category: MediaCategory) {
  return `media.categories.${category}`;
}
