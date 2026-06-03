export class Playlist {
  id?: string;
  churchId: string;
  title: string;
  description: string;
  publishDate: Date;
  thumbnail: string;
  /** video = sermon series (Watch tab); music = audio playlist (Music tab) */
  playlistType?: string;
  /** Content category for video playlists (sermon, movie, kids, etc.) */
  mediaCategory?: string;
  /** Admin display order (lower = earlier in Machon HaRuach Mobile). */
  sort?: number;
  itemCount?: number;
}
