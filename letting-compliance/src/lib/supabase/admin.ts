/**
 * Supabase admin client — uses the service role key to bypass RLS.
 *
 * IMPORTANT: Only import this in server-side code (API routes, server actions).
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client bundle.
 */
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars."
    );
  }

  return createClient(url, key, {
    auth: {
      // Service role clients should never persist sessions
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
