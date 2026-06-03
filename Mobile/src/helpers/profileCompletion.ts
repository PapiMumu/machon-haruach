/** True when the signed-in member has not joined any group (profile onboarding incomplete). */
export function isProfileIncomplete(
  currentUserChurch: { groups?: unknown[]; person?: { id?: string } } | null | undefined
): boolean {
  if (!currentUserChurch?.person?.id) return false;
  return !Array.isArray(currentUserChurch.groups) || currentUserChurch.groups.length === 0;
}
