/** Machon HaRuach platform branding and default URLs (override via environment variables). */
export const Brand = {
  name: "Machon HaRuach",
  adminAppName: "Machon HaRuach Admin",
  domain: "machonharuach.org",
  memberHostSuffix: ".machonharuach.org",
  stagingMemberHostSuffix: ".staging.machonharuach.org",
  adminUrl: "https://admin.machonharuach.org",
  adminStagingUrl: "https://admin.staging.machonharuach.org",
  apiBase: "https://api.machonharuach.org",
  apiStagingBase: "https://api.staging.machonharuach.org",
  contentRoot: "https://content.machonharuach.org",
  contentStagingRoot: "https://content.staging.machonharuach.org",
  supportEmail: "support@machonharuach.org",
  mobilePackage: "org.machonharuach.mobile",
  mobileDeepLinkScheme: "machonharuach"
} as const;
