import type { SongDetailInterface } from "../../../helpers";
import type { SongLibraryEntry } from "./groupSongsForLibrary";

function entrySortKey(entry: SongLibraryEntry): number {
  if (entry.kind === "single") {
    const sort = (entry.track as SongDetailInterface & { songSort?: number })?.songSort;
    return sort != null ? sort : 999999;
  }
  const tracks = entry.tracks ?? [];
  if (!tracks.length) return 999999;
  return Math.min(
    ...tracks.map((t) => {
      const sort = (t as SongDetailInterface & { songSort?: number }).songSort;
      return sort != null ? sort : 999999;
    })
  );
}

/** Orders library rows by admin `songs.sort` (album rows use the lowest sort among their tracks). */
export function sortLibraryEntries(entries: SongLibraryEntry[]): SongLibraryEntry[] {
  return [...entries].sort((a, b) => entrySortKey(a) - entrySortKey(b));
}

export function libraryEntryToSortPayload(entry: SongLibraryEntry): { songIds: string[] } {
  if (entry.kind === "single") {
    const id = entry.track?.songId;
    return { songIds: id ? [id] : [] };
  }
  const ids = (entry.tracks ?? []).map((t) => t.songId).filter(Boolean) as string[];
  return { songIds: ids };
}
