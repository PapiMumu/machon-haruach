import { PublicSongInterface } from "../../interfaces/Song";
import type { SongLibraryEntry } from "./groupSongsForLibrary";

function entrySortKey(entry: SongLibraryEntry): number {
  if (entry.kind === "single") {
    const sort = (entry.track as PublicSongInterface & { songSort?: number })?.songSort;
    return sort != null ? sort : 999999;
  }
  const tracks = entry.tracks ?? [];
  if (!tracks.length) return 999999;
  return Math.min(
    ...tracks.map((t) => {
      const sort = (t as PublicSongInterface & { songSort?: number }).songSort;
      return sort != null ? sort : 999999;
    })
  );
}

export function sortLibraryEntries(entries: SongLibraryEntry[]): SongLibraryEntry[] {
  return [...entries].sort((a, b) => entrySortKey(a) - entrySortKey(b));
}
