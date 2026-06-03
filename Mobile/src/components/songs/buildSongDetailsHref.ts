import { PublicSongInterface } from "../../interfaces/Song";

/** Build song details route with optional play queue for prev/next. */
export function buildSongDetailsHref(song: PublicSongInterface, queue?: PublicSongInterface[]) {
  const params = new URLSearchParams();
  if (song.title) params.set("title", song.title);
  const ids = (queue?.length ? queue : [song])
    .filter((s) => s.id && s.audioUrl?.trim())
    .map((s) => s.id);
  if (ids.length > 1) params.set("queueIds", ids.join(","));
  const qs = params.toString();
  return `/songDetails/${song.id}${qs ? "?" + qs : ""}`;
}
