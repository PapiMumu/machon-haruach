export class Song {
  id?: string;
  churchId?: string;
  name?: string;
  dateAdded?: Date;
  /** Admin display order for the church music library (lower = first). */
  sort?: number;
}
