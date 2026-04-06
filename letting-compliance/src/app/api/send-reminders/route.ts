/**
 * POST /api/send-reminders
 *
 * Triggers the compliance reminder email send cycle.
 *
 * Protection: requires the Authorization header to match CRON_SECRET.
 * This prevents unauthorized callers from burning your Resend quota.
 *
 * How to trigger manually (e.g. from curl or a test):
 *   curl -X POST https://your-app.com/api/send-reminders \
 *     -H "Authorization: Bearer <CRON_SECRET>"
 *
 * How to schedule with Vercel Cron (vercel.json):
 *   {
 *     "crons": [{ "path": "/api/send-reminders", "schedule": "0 8 * * *" }]
 *   }
 *   Vercel automatically adds the Authorization header using CRON_SECRET.
 *
 * How to schedule with an external cron (e.g. EasyCron, GitHub Actions):
 *   Call this endpoint via HTTPS with the Authorization header above.
 *   Run daily at 08:00 UTC — adjust to suit your landlords' timezone.
 */

import { sendPendingReminders } from "@/lib/send-reminders";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // ── Auth check ────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json(
      { error: "CRON_SECRET is not configured on the server." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  // ── Run the send cycle ────────────────────────────────────────────────────
  try {
    const result = await sendPendingReminders();

    console.log(
      `[send-reminders] Done — sent: ${result.sent}, failed: ${result.failed}`
    );

    return Response.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      results: result.results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[send-reminders] Unexpected error:", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
