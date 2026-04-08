/**
 * getAppBaseUrl()
 *
 * Returns the canonical base URL for the app, used when building absolute
 * links in outbound emails (invite, recovery, reminder).
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_APP_URL  — explicit canonical URL, set in Vercel env vars
 *   2. VERCEL_URL           — auto-set by Vercel for every deployment
 *                             (no protocol prefix, e.g. "project.vercel.app")
 *   3. http://localhost:3000 — local development fallback only
 *
 * NEXT_PUBLIC_APP_URL must be set in your Vercel project environment variables
 * for all production and preview environments. VERCEL_URL is a safety net for
 * preview deployments where the canonical URL has not been configured.
 */
export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function buildAppUrl(path: string): string {
  return `${getAppBaseUrl()}${path}`;
}
