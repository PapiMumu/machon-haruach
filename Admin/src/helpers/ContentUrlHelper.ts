import { CommonEnvironmentHelper } from "@machonharuach/apphelper";

/** CDN / storage hosts that should be rewritten to the church's `REACT_APP_CONTENT_ROOT`. */
const LEGACY_CONTENT_HOST_PATTERNS = [
  /(^|\.)content\.churchapps\.org$/i,
  /(^|\.)content\.staging\.churchapps\.org$/i,
  /churchapps-content/i
];

function contentRoot(): string {
  return (CommonEnvironmentHelper.ContentRoot || process.env.REACT_APP_CONTENT_ROOT || "").replace(/\/$/, "");
}

function isLegacyContentHost(hostname: string): boolean {
  return LEGACY_CONTENT_HOST_PATTERNS.some((re) => re.test(hostname));
}

/**
 * Rewrites churchapps CDN URLs to your configured content root (e.g. S3 bucket URL).
 * Safe to call on every playback/display — idempotent when the URL is already correct.
 */
export function resolveContentUrl(url: string | undefined | null): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";

  const root = contentRoot();
  if (!root) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (!isLegacyContentHost(parsed.hostname)) return trimmed;
    const path = parsed.pathname || "/";
    return `${root}${path.startsWith("/") ? path : `/${path}`}${parsed.search}`;
  } catch {
    if (trimmed.startsWith("/")) return `${root}${trimmed}`;
    return trimmed;
  }
}

/** True when the URL points at this church's content bucket/CDN (not an external catalog host). */
export function isChurchContentUrl(url: string | undefined | null): boolean {
  const trimmed = (url || "").trim();
  if (!trimmed) return false;

  const root = contentRoot();
  if (root && trimmed.startsWith(root)) return true;

  try {
    const host = new URL(trimmed).hostname;
    return /amazonaws\.com$/i.test(host) || /cloudfront\.net$/i.test(host) || isLegacyContentHost(host);
  } catch {
    return trimmed.includes("/streamingLive/songs/");
  }
}

/** Prefer client content root when persisting hosted media from `/files` (API may still return churchapps.org). */
export function resolveUploadedContentPath(contentPath: string, storageKey?: string): string {
  const fromPath = resolveContentUrl(contentPath);
  if (fromPath && !fromPath.includes("churchapps.org")) return fromPath;

  const root = contentRoot();
  const key = (storageKey || "").replace(/^\/+/, "");
  if (!root || !key) return fromPath || contentPath;

  const dtMatch = contentPath.match(/(\?dt=[^&]+)/);
  const dt = dtMatch ? dtMatch[1] : "";
  return `${root}/${key}${dt}`;
}
