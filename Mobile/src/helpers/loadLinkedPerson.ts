import { ApiHelper } from "@machonharuach/helpers";
import type { PersonInterface } from "./Interfaces";

/** Ensures userChurch link is current, then loads the directory person for this church. */
export async function loadLinkedPerson(
  churchId: string,
  fallbackPerson?: PersonInterface | null
): Promise<PersonInterface> {
  let personId = fallbackPerson?.id;

  try {
    const claim = (await ApiHelper.get(`/people/claim/${churchId}`, "MembershipApi")) as {
      person?: PersonInterface;
    };
    if (claim?.person?.id) {
      personId = claim.person.id;
    }
  } catch (error) {
    console.warn("Claim person before load failed:", error);
  }

  if (!personId) {
    throw new Error("No person record is linked to your account.");
  }

  try {
    return (await ApiHelper.get(`/people/${personId}`, "MembershipApi")) as PersonInterface;
  } catch (error) {
    if (fallbackPerson?.id === personId && fallbackPerson.contactInfo) {
      return fallbackPerson;
    }
    throw error;
  }
}
