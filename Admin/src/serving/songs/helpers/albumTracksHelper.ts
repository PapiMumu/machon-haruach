import { ApiHelper } from "@machonharuach/apphelper";
import type { SongDetailInterface } from "../../../helpers";

/** API / DB may return trackNumber as a string; normalize for display and saves. */
export function normalizeSongDetailTrackNumber(sd: SongDetailInterface): SongDetailInterface {
  const raw = sd.trackNumber ?? (sd as SongDetailInterface & { tracknumber?: unknown }).tracknumber;
  if (raw == null || raw === "") {
    return { ...sd, trackNumber: undefined };
  }
  const n = Number(raw);
  return { ...sd, trackNumber: Number.isFinite(n) ? n : undefined };
}

export function sortAlbumTracksList(tracks: SongDetailInterface[]): SongDetailInterface[] {
  return [...tracks].map(normalizeSongDetailTrackNumber).sort(sortAlbumTracks);
}

/** Payload shape for POST /songDetails (update existing song detail). */
const CREDIT_FIELDS = [
  "featuredArtists",
  "producer",
  "composer",
  "lyricist",
  "genre",
  "recordLabel"
] as const;

function trimOptionalString(value?: string): string | undefined {
  const t = value?.trim();
  return t || undefined;
}

/** Keep credit fields from cache when a refetch returns rows before credits columns exist on the DB. */
export function mergeSongDetailCredits(
  prior: SongDetailInterface | undefined,
  next: SongDetailInterface
): SongDetailInterface {
  if (!prior?.id || prior.id !== next.id) return next;
  const merged = { ...next };
  for (const key of CREDIT_FIELDS) {
    const incoming = next[key];
    if (incoming == null || (typeof incoming === "string" && !incoming.trim())) {
      const kept = prior[key];
      if (kept != null && String(kept).trim()) {
        merged[key] = kept;
      }
    }
  }
  return merged;
}

export function normalizeSongDetailCredits(sd: SongDetailInterface): SongDetailInterface {
  return {
    ...sd,
    featuredArtists: trimOptionalString(sd.featuredArtists),
    producer: trimOptionalString(sd.producer),
    composer: trimOptionalString(sd.composer),
    lyricist: trimOptionalString(sd.lyricist),
    genre: trimOptionalString(sd.genre),
    recordLabel: trimOptionalString(sd.recordLabel)
  };
}

export function songDetailSavePayload(
  sd: SongDetailInterface,
  overrides: Partial<SongDetailInterface> = {}
): SongDetailInterface {
  const normalized = normalizeSongDetailCredits(normalizeSongDetailTrackNumber({ ...sd, ...overrides }));
  return {
    id: normalized.id,
    praiseChartsId: normalized.praiseChartsId,
    title: normalized.title,
    artist: normalized.artist,
    album: normalized.album,
    trackNumber: normalized.trackNumber,
    language: normalized.language,
    thumbnail: normalized.thumbnail,
    releaseDate: normalized.releaseDate,
    bpm: normalized.bpm,
    keySignature: normalized.keySignature,
    seconds: normalized.seconds ?? 0,
    meter: normalized.meter,
    tones: normalized.tones,
    featuredArtists: normalized.featuredArtists,
    producer: normalized.producer,
    composer: normalized.composer,
    lyricist: normalized.lyricist,
    genre: normalized.genre,
    recordLabel: normalized.recordLabel
  };
}

/** Renumber tracks 1…n in list order and persist. */
export async function saveAlbumTrackOrder(tracks: SongDetailInterface[]): Promise<SongDetailInterface[]> {
  const payloads = tracks.map((t, i) => songDetailSavePayload(t, { trackNumber: i + 1 }));
  if (!payloads.length) return [];
  const result = (await ApiHelper.post("/songDetails", payloads, "ContentApi")) as SongDetailInterface[];
  const saved = Array.isArray(result) ? result : payloads;
  return sortAlbumTracksList(saved);
}

function sortAlbumTracks(a: SongDetailInterface, b: SongDetailInterface) {
  const na = a.trackNumber ?? 999;
  const nb = b.trackNumber ?? 999;
  if (na !== nb) return na - nb;
  return (a.title || "").localeCompare(b.title || "");
}

/** Match tracks for an album row (same rules as the songs library grouping). */
export function filterSongDetailsByAlbum(
  details: SongDetailInterface[],
  artist: string,
  album: string
): SongDetailInterface[] {
  if (!Array.isArray(details) || !album.trim()) return [];

  const albumKey = album.trim().toLowerCase();
  const artistKey = artist.trim().toLowerCase();

  return details
    .filter((sd) => {
      if (!sd?.album?.trim()) return false;
      if (sd.album.trim().toLowerCase() !== albumKey) return false;
      if (!artistKey) return true;
      return (sd.artist?.trim() || "").toLowerCase() === artistKey;
    })
    .map(normalizeSongDetailTrackNumber)
    .sort(sortAlbumTracks);
}

/**
 * Load all tracks for an album+artist. Uses the album API when available,
 * otherwise filters the church song list (works before the album route is deployed).
 */
export async function fetchAlbumTracks(artist: string, album: string): Promise<SongDetailInterface[]> {
  const albumTrim = album.trim();
  const artistTrim = artist.trim();
  if (!albumTrim) return [];

  const albumQuery = `/songDetails/album?artist=${encodeURIComponent(artistTrim)}&album=${encodeURIComponent(albumTrim)}`;

  try {
    const data = await ApiHelper.get(albumQuery, "ContentApi");
    if (Array.isArray(data) && data.length > 0) {
      return data.map(normalizeSongDetailTrackNumber).sort(sortAlbumTracks);
    }
  } catch {
    /* dedicated album route may be missing on older API builds */
  }

  const all = await ApiHelper.get("/songDetails", "ContentApi");
  return filterSongDetailsByAlbum(Array.isArray(all) ? all : [], artistTrim, albumTrim);
}
