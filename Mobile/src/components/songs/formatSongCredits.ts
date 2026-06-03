import { PublicSongInterface } from "../../interfaces/Song";

function clean(value?: string | null) {
  const v = value?.trim();
  return v || "";
}

/** Artist line for a track row: primary artist and featured artists (no album). */
export function formatTrackArtistLine(song: PublicSongInterface): string {
  const artist = clean(song.artist);
  const featured = clean(song.featuredArtists);
  if (!artist && !featured) return "";
  if (!featured) return artist;
  if (!artist) return featured;
  return `${artist} · ${featured}`;
}

/** Short credit line for a single track row (composer, producer, etc.). */
export function formatTrackCredits(song: PublicSongInterface): string {
  const parts: string[] = [];
  const composer = clean(song.composer);
  const lyricist = clean(song.lyricist);
  const producer = clean(song.producer);
  const featured = clean(song.featuredArtists);

  if (composer) parts.push(composer);
  if (lyricist && lyricist !== composer) parts.push(lyricist);
  if (producer) parts.push(producer);
  if (featured) parts.push(featured);

  return parts.join(" · ");
}

export interface AlbumCreditLine {
  labelKey: string;
  values: string[];
}

/** Unique album-level credits aggregated across all tracks. */
export function aggregateAlbumCredits(tracks: PublicSongInterface[]): AlbumCreditLine[] {
  const uniq = (values: (string | undefined)[]) => {
    const set = new Set<string>();
    for (const v of values) {
      const t = clean(v);
      if (t) set.add(t);
    }
    return [...set];
  };

  const lines: AlbumCreditLine[] = [];
  const producers = uniq(tracks.map((t) => t.producer));
  const composers = uniq(tracks.map((t) => t.composer));
  const lyricists = uniq(tracks.map((t) => t.lyricist));
  const featured = uniq(tracks.map((t) => t.featuredArtists));
  const labels = uniq(tracks.map((t) => t.recordLabel));
  const genres = uniq(tracks.map((t) => t.genre));
  const languages = uniq(tracks.map((t) => t.language));

  if (producers.length) lines.push({ labelKey: "songs.producer", values: producers });
  if (composers.length) lines.push({ labelKey: "songs.composer", values: composers });
  if (lyricists.length) lines.push({ labelKey: "songs.lyricist", values: lyricists });
  if (featured.length) lines.push({ labelKey: "songs.featuredArtists", values: featured });
  if (labels.length) lines.push({ labelKey: "songs.recordLabel", values: labels });
  if (genres.length) lines.push({ labelKey: "songs.genre", values: genres });
  if (languages.length) lines.push({ labelKey: "songs.language", values: languages });

  return lines;
}

export function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
