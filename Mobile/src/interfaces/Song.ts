/** Song track from GET /songDetails/public/:churchId */
export interface PublicSongInterface {
  id: string;
  title?: string;
  artist?: string;
  album?: string;
  trackNumber?: number;
  thumbnail?: string;
  seconds?: number;
  songId?: string;
  audioUrl?: string;
  featuredArtists?: string;
  producer?: string;
  composer?: string;
  lyricist?: string;
  genre?: string;
  recordLabel?: string;
  releaseDate?: string | Date;
  language?: string;
  bpm?: string;
  keySignature?: string;
  lyrics?: string;
}
