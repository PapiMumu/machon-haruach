import type { SongDetailInterface } from "../../../helpers";

export type SongLibraryEntry =
  | { kind: "single"; track: SongDetailInterface }
  | { kind: "album"; album: string; artist: string; tracks: SongDetailInterface[] };

function albumKey(artist: string, album: string) {
  return `${artist.trim().toLowerCase()}\0${album.trim().toLowerCase()}`;
}

function sortTracks(a: SongDetailInterface, b: SongDetailInterface) {
  const na = a.trackNumber ?? 999;
  const nb = b.trackNumber ?? 999;
  if (na !== nb) return na - nb;
  return (a.title || "").localeCompare(b.title || "");
}

/** Singles appear as one row each; tracks sharing album+artist appear as one album row. */
export function groupSongsForLibrary(details: SongDetailInterface[]): SongLibraryEntry[] {
  if (!Array.isArray(details)) return [];

  const singles: SongDetailInterface[] = [];
  const albums = new Map<string, SongDetailInterface[]>();

  for (const sd of details) {
    if (!sd) continue;
    const album = sd.album?.trim();
    if (!album) {
      singles.push(sd);
      continue;
    }
    const artist = sd.artist?.trim() || "";
    const key = albumKey(artist, album);
    const list = albums.get(key) || [];
    list.push(sd);
    albums.set(key, list);
  }

  const albumEntries: SongLibraryEntry[] = [...albums.values()]
    .filter((tracks) => tracks.length > 0)
    .map((tracks) => {
      const sorted = [...tracks].sort(sortTracks);
      return {
        kind: "album" as const,
        album: sorted[0].album!,
        artist: sorted[0].artist || "",
        tracks: sorted
      };
    });

  const singleEntries: SongLibraryEntry[] = singles.map((track) => ({
    kind: "single",
    track
  }));

  return [...albumEntries, ...singleEntries];
}

export function entryMatchesSearch(entry: SongLibraryEntry, filter: string): boolean {
  if (!filter) return true;
  const q = filter.toLowerCase();
  if (entry.kind === "single") {
    const t = entry.track;
    if (!t) return false;
    return (
      t.title?.toLowerCase().includes(q) ||
      t.artist?.toLowerCase().includes(q) ||
      false
    );
  }
  const tracks = entry.tracks ?? [];
  return (
    entry.album.toLowerCase().includes(q) ||
    entry.artist.toLowerCase().includes(q) ||
    tracks.some((t) => t.title?.toLowerCase().includes(q) || t.album?.toLowerCase().includes(q))
  );
}

export function primarySongId(entry: SongLibraryEntry): string | undefined {
  if (entry.kind === "single") return entry.track?.songId;
  if (entry.kind === "album") {
    const tracks = entry.tracks ?? [];
    return tracks.find((t) => t.songId)?.songId || tracks[0]?.songId;
  }
  return undefined;
}

export function totalAlbumSeconds(tracks: SongDetailInterface[]): number {
  return (tracks ?? []).reduce((sum, t) => sum + (t.seconds || 0), 0);
}
