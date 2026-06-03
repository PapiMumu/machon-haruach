export type PendingRepeatDonation = { amount: string; fundId?: string };

let pendingRepeatDonation: PendingRepeatDonation | null = null;

export function setPendingRepeatDonation(value: PendingRepeatDonation | null) {
  pendingRepeatDonation = value;
}

export function takePendingRepeatDonation(): PendingRepeatDonation | null {
  const v = pendingRepeatDonation;
  pendingRepeatDonation = null;
  return v;
}
