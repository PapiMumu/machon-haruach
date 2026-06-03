import { ApiHelper } from "@machonharuach/apphelper";
import type { ArrangementInterface, ArrangementKeyInterface, SongDetailInterface, SongInterface } from "../../../helpers";

export async function createAlbumTrackRecords(
  artist: string,
  album: string,
  trackTitle: string
): Promise<{ songDetailId: string; songId: string }> {
  const [sd] = (await ApiHelper.post(
    "/songDetails",
    [{ title: trackTitle, artist, album, seconds: 0 }],
    "ContentApi"
  )) as SongDetailInterface[];

  const [song] = (await ApiHelper.post(
    "/songs",
    [{ name: trackTitle, dateAdded: new Date() }],
    "ContentApi"
  )) as SongInterface[];

  const [arrangement] = (await ApiHelper.post(
    "/arrangements",
    [{ songId: song.id, songDetailId: sd.id, name: "(Default)", lyrics: "" }],
    "ContentApi"
  )) as ArrangementInterface[];

  await ApiHelper.post(
    "/arrangementKeys",
    [{ arrangementId: arrangement.id, keySignature: sd.keySignature || "", shortDescription: "Default" }],
    "ContentApi"
  );

  return { songDetailId: sd.id!, songId: song.id! };
}

export async function saveHostedAudioLink(songDetailId: string, url: string, fileName: string) {
  await ApiHelper.post(
    "/songDetailLinks",
    [{ songDetailId, service: "Hosted", serviceKey: fileName.slice(0, 120), url }],
    "ContentApi"
  );
}

/** Use album artwork already on a sibling track for newly added tracks. */
export function findAlbumCoverUrlFromTracks(tracks: SongDetailInterface[]): string | null {
  const thumb = tracks.find((t) => t.thumbnail?.trim())?.thumbnail?.trim();
  return thumb || null;
}
