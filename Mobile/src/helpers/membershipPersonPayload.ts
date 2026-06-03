import type { PersonInterface } from "./Interfaces";

/** Strips `formSubmissions` and other heavy/nested fields; safe for POST /people. */
export function membershipPersonSavePayload(
  person: PersonInterface,
  contactOverrides: Partial<PersonInterface["contactInfo"]>
): PersonInterface {
  const ci = person.contactInfo || {};
  return {
    id: person.id,
    name: person.name,
    membershipStatus: person.membershipStatus,
    gender: person.gender,
    birthDate: person.birthDate,
    maritalStatus: person.maritalStatus,
    anniversary: person.anniversary,
    photo: person.photo,
    householdId: person.householdId,
    householdRole: person.householdRole,
    userId: person.userId,
    contactInfo: {
      ...ci,
      ...contactOverrides
    }
  };
}
