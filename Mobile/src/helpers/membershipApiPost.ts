import { ApiHelper } from "@machonharuach/helpers";

function getConfig(apiName: string): { url: string; jwt: string } | null {
  return (ApiHelper as unknown as { getConfig: (n: string) => { url: string; jwt: string } | null }).getConfig(apiName);
}

/** POST with a single response body read and a clear Error message (ApiHelper throws "{}" on many failures). */
export async function postMembershipJson(path: string, body: unknown, apiName = "MembershipApi"): Promise<unknown> {
  const config = getConfig(apiName);
  if (!config?.jwt) throw new Error(`API configuration not found: ${apiName}`);
  const url = config.url + path;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + config.jwt, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const j = JSON.parse(text) as { errors?: string[]; message?: string };
      if (Array.isArray(j.errors) && j.errors[0]) detail = `${detail}: ${j.errors[0]}`;
      else if (typeof j.message === "string" && j.message) detail = `${detail}: ${j.message}`;
      else if (text && text !== "{}") detail = `${detail}: ${text}`;
    } catch {
      if (text) detail = `${detail}: ${text}`;
    }
    throw new Error(detail);
  }
  const trimmed = text.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed) as unknown;
}
