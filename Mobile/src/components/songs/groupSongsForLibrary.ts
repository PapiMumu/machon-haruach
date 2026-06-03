import { PublicSongInterface } from "../../interfaces/Song";

export type SongLibraryEntry =
  | { kind: "single"; track: PublicSongInterface }
  | { kind: "album"; album: string; artist: string; tracks: PublicSongInterface[] };

function albumKey(artist: string, album: string) {
  return `${artist.trim().toLowerCase()}\0${album.trim().toLowerCase()}`;
}

function sortTracks(a: PublicSongInterface, b: PublicSongInterface) {
  const na = a.trackNumber ?? 999;
  const nb = b.trackNumber ?? 999;
  if (na !== nb) return na - nb;
  return (a.title || "").localeCompare(b.title || "");
}

export function groupSongsForLibrary(details: PublicSongInterface[]): SongLibraryEntry[] {
  if (!Array.isArray(details)) return [];

  const singles: PublicSongInterface[] = [];
  const albums = new Map<string, PublicSongInterface[]>();

  for (const sd of details) {
    if (!sd?.id) continue;
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

  return [
    ...albumEntries,
    ...singles.map((track) => ({ kind: "single" as const, track }))
  ];
}

export function totalAlbumSeconds(tracks: PublicSongInterface[]): number {
  return (tracks ?? []).reduce((sum, t) => sum + (t.seconds || 0), 0);
}
