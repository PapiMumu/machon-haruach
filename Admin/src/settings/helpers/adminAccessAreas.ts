/** Maps Machon HaRuach Admin navigation areas to membership role permissions. */
export interface AdminAccessPermissionRef {
  apiName: string;
  contentType: string;
  action: string;
}

export interface AdminAccessArea {
  id: string;
  label: string;
  description: string;
  routes: string;
  /** No toggles — available to anyone who can sign in to Admin. */
  alwaysAvailable?: boolean;
  permissions: AdminAccessPermissionRef[];
}

export const ADMIN_ACCESS_AREAS: AdminAccessArea[] = [
  {
    id: "home",
    label: "Home",
    description: "Quick actions and welcome cards.",
    routes: "/",
    alwaysAvailable: true,
    permissions: []
  },
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Summary charts for giving, attendance, and people.",
    routes: "/dashboard",
    permissions: [
      { apiName: "GivingApi", contentType: "Donations", action: "View Summary" },
      { apiName: "AttendanceApi", contentType: "Attendance", action: "View Summary" },
      { apiName: "AttendanceApi", contentType: "Attendance", action: "View" },
      { apiName: "MembershipApi", contentType: "People", action: "View" }
    ]
  },
  {
    id: "community",
    label: "Community",
    description: "People directory, groups, households, and attendance (branches).",
    routes: "/people, /groups, /attendance",
    permissions: [
      { apiName: "MembershipApi", contentType: "People", action: "View" },
      { apiName: "MembershipApi", contentType: "People", action: "View Members" },
      { apiName: "MembershipApi", contentType: "People", action: "Edit" },
      { apiName: "MembershipApi", contentType: "People", action: "Edit Self" },
      { apiName: "MembershipApi", contentType: "Groups", action: "Edit" },
      { apiName: "MembershipApi", contentType: "Group Members", action: "View" },
      { apiName: "MembershipApi", contentType: "Group Members", action: "Edit" },
      { apiName: "MembershipApi", contentType: "Households", action: "Edit" },
      { apiName: "AttendanceApi", contentType: "Attendance", action: "View" },
      { apiName: "AttendanceApi", contentType: "Attendance", action: "View Summary" },
      { apiName: "AttendanceApi", contentType: "Attendance", action: "Edit" },
      { apiName: "AttendanceApi", contentType: "Attendance", action: "Checkin" },
      { apiName: "AttendanceApi", contentType: "Services", action: "Edit" }
    ]
  },
  {
    id: "giving",
    label: "Giving",
    description: "Donations, batches, funds, and giving settings.",
    routes: "/donations",
    permissions: [
      { apiName: "GivingApi", contentType: "Donations", action: "View Summary" },
      { apiName: "GivingApi", contentType: "Donations", action: "View" },
      { apiName: "GivingApi", contentType: "Donations", action: "Edit" },
      { apiName: "GivingApi", contentType: "Settings", action: "Edit" }
    ]
  },
  {
    id: "ministry",
    label: "Ministry",
    description: "Serving plans, schedules, tasks, and songs.",
    routes: "/serving",
    permissions: [
      { apiName: "MembershipApi", contentType: "Plans", action: "Edit" },
      { apiName: "MembershipApi", contentType: "Forms", action: "Edit" },
      { apiName: "MembershipApi", contentType: "Forms", action: "Admin" }
    ]
  },
  {
    id: "media",
    label: "Media",
    description: "Sermons, playlists, live stream times, and song library.",
    routes: "/sermons",
    permissions: [
      { apiName: "ContentApi", contentType: "Content", action: "Edit" },
      { apiName: "ContentApi", contentType: "StreamingServices", action: "Edit" },
      { apiName: "ContentApi", contentType: "Settings", action: "Edit" },
      { apiName: "LessonsApi", contentType: "Schedules", action: "Edit" },
      { apiName: "LessonsApi", contentType: "Content", action: "Edit" }
    ]
  },
  {
    id: "communications",
    label: "Communications",
    description: "Text messaging and communication tools.",
    routes: "/communications",
    permissions: [{ apiName: "MessagingApi", contentType: "Texting", action: "Send" }]
  },
  {
    id: "apps",
    label: "Apps",
    description: "GNW Mobile app settings and navigation.",
    routes: "/mobile",
    permissions: [{ apiName: "ContentApi", contentType: "Content", action: "Edit" }]
  },
  {
    id: "website",
    label: "Website",
    description: "Site pages, appearance, calendars, and registrations.",
    routes: "/site, /calendars, /registrations",
    permissions: [
      { apiName: "ContentApi", contentType: "Content", action: "Edit" },
      { apiName: "ContentApi", contentType: "Registrations", action: "View" },
      { apiName: "ContentApi", contentType: "Registrations", action: "Edit" },
      { apiName: "ContentApi", contentType: "Chat", action: "Host" }
    ]
  },
  {
    id: "forms",
    label: "Forms",
    description: "Custom forms and form administration.",
    routes: "/forms",
    permissions: [
      { apiName: "MembershipApi", contentType: "Forms", action: "Edit" },
      { apiName: "MembershipApi", contentType: "Forms", action: "Admin" }
    ]
  },
  {
    id: "administration",
    label: "Administration",
    description: "Roles, church settings, and server tools.",
    routes: "/settings, /admin",
    permissions: [
      { apiName: "MembershipApi", contentType: "Roles", action: "View" },
      { apiName: "MembershipApi", contentType: "Roles", action: "Edit" },
      { apiName: "MembershipApi", contentType: "Settings", action: "Edit" }
    ]
  }
];

export function permissionRefKey(p: AdminAccessPermissionRef): string {
  return `${p.apiName}|${p.contentType}|${p.action}`;
}

export function rolePermissionMatchesRef(
  rp: { apiName?: string; contentType?: string; action?: string },
  ref: AdminAccessPermissionRef
): boolean {
  return rp.apiName === ref.apiName && rp.contentType === ref.contentType && rp.action === ref.action;
}

export function areaAccessState(
  area: AdminAccessArea,
  rolePermissions: { apiName?: string; contentType?: string; action?: string }[]
): "none" | "partial" | "full" {
  if (area.alwaysAvailable || area.permissions.length === 0) return "full";
  let matched = 0;
  for (const ref of area.permissions) {
    if (rolePermissions.some((rp) => rolePermissionMatchesRef(rp, ref))) matched++;
  }
  if (matched === 0) return "none";
  if (matched === area.permissions.length) return "full";
  return "partial";
}
