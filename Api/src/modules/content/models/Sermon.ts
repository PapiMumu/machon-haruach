export class Sermon {
  id?: string;
  churchId: string;
  playlistId: string;
  /** Library category: sermon, movie, kids, dance, musicVideo, other (not youtube/vimeo). */
  mediaCategory?: string;
  videoType: string;
  videoData: string;
  videoUrl: string;
  title: string;
  description: string;
  publishDate: Date;
  thumbnail: string;
  duration: number;
  permanentUrl: boolean;
  /** Admin display order (lower = earlier in Machon HaRuach Mobile). */
  sort?: number;
}
