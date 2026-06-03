import { ApiHelper } from "@machonharuach/apphelper";
import type { SongDetailInterface, SongDetailLinkInterface } from "../../../helpers";
import { fetchAlbumTracks } from "./albumTracksHelper";

export const COVER_SERVICE = "Cover";

/** Save hosted cover URL and thumbnail on one song detail. */
export async function applyCoverToSongDetail(
  songDetailId: string,
  coverUrl: string,
  fileName: string
): Promise<void> {
  const detail = (await ApiHelper.get("/songDetails/" + songDetailId, "ContentApi")) as SongDetailInterface;
  const links = (await ApiHelper.get(
    "/songDetailLinks/songDetail/" + songDetailId,
    "ContentApi"
  )) as SongDetailLinkInterface[];
  const existing = links?.find((l) => l.service === COVER_SERVICE);

  const serviceKey = (fileName || existing?.serviceKey || "cover").toString().slice(0, 120);
  const linkPayload: SongDetailLinkInterface = existing?.id
    ? { ...existing, url: coverUrl, serviceKey }
    : { songDetailId, service: COVER_SERVICE, serviceKey, url: coverUrl };

  await ApiHelper.post("/songDetailLinks", [linkPayload], "ContentApi");
  await ApiHelper.post("/songDetails", [{ ...detail, thumbnail: coverUrl }], "ContentApi");
}

/** Apply the same cover art to every track on an album (shared album artwork). */
export async function applyCoverToAllAlbumTracks(
  artist: string,
  album: string,
  coverUrl: string,
  fileName: string
): Promise<void> {
  const tracks = await fetchAlbumTracks(artist, album);
  const ids = tracks.map((t) => t.id).filter((id): id is string => Boolean(id));
  await Promise.all(ids.map((id) => applyCoverToSongDetail(id, coverUrl, fileName)));
}
