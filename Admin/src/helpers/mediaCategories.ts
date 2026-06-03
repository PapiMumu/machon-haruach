/** Video library content categories (stored as sermons.mediaCategory in Content API). */
export type MediaCategory = "sermon" | "movie" | "kids" | "dance" | "musicVideo" | "other";

export const MEDIA_CATEGORY_OPTIONS: MediaCategory[] = ["sermon", "movie", "kids", "dance", "musicVideo", "other"];

export const DEFAULT_MEDIA_CATEGORY: MediaCategory = "sermon";

export function normalizeMediaCategory(value?: string | null): MediaCategory {
  if (value && MEDIA_CATEGORY_OPTIONS.includes(value as MediaCategory)) {
    return value as MediaCategory;
  }
  return DEFAULT_MEDIA_CATEGORY;
}

export function mediaCategoryLocaleKey(category: MediaCategory) {
  return `sermons.mediaCategory.${category}`;
}
