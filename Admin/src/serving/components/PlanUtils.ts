import { PlanHelper } from "@machonharuach/helpers";

// Re-export lesson interfaces from @machonharuach/helpers for convenience
export {
  type LessonActionInterface,
  type LessonSectionInterface,
  type LessonVenueInterface,
  type LessonInfoInterface,
  type LessonStudyInterface,
  type LessonProgramInterface,
  type LessonTreeInterface,
  type LessonActionTreeInterface,
  type VenueActionResponseInterface
} from "@machonharuach/helpers";

// Re-export utility functions from PlanHelper for backwards compatibility
export const formatTime = PlanHelper.formatTime;
export const getSectionDuration = PlanHelper.getSectionDuration;
