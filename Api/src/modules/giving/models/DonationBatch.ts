export class DonationBatch {
  public id?: string;
  public churchId?: string;
  public name?: string;
  public batchDate?: Date;
  /** Campus / branch label (e.g. from mobile `givingCampus|` notes); empty = church-wide or unspecified. */
  public branchName?: string | null;
  /** Populated on list load from donations' `givingCampus|` notes (aligned with Summary / fundTotals). Read-only aggregate. */
  public branchFromNotes?: string | null;

  public donationCount?: number;
  public totalAmount?: number;
}
