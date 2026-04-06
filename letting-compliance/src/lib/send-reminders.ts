/**
 * Reminder sending logic.
 *
 * This module is the single place responsible for:
 *   1. Fetching pending reminders from Supabase (with profile + property + type context)
 *   2. Sending each one via Resend
 *   3. Updating the reminder row to "sent" or "failed"
 *
 * Assumed reminders table schema:
 *   id               uuid  PK
 *   user_id          uuid  → auth.users
 *   property_id      uuid  → properties
 *   compliance_type_id uuid → compliance_types
 *   due_date         date   (the relevant expiry / due date)
 *   status           text   ('pending' | 'sent' | 'failed')
 *   sent_at          timestamptz  nullable
 *   created_at       timestamptz
 *
 * Adjust column names here if your schema differs.
 */

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ─────────────────────────────────────────────────────────────────────

type PendingReminder = {
  id: string;
  user_id: string;
  due_date: string;
  // Joined from profiles
  recipient_email: string;
  // Joined from properties
  address_line_1: string;
  city: string;
  postcode: string;
  // Joined from compliance_types
  compliance_type_name: string;
};

type SendResult =
  | { reminderId: string; status: "sent" }
  | { reminderId: string; status: "failed"; error: string };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildAppUrl(path: string): string {
  // Falls back to localhost in development if NEXT_PUBLIC_APP_URL is not set
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

// ─── Email template ────────────────────────────────────────────────────────────

function buildEmailHtml(reminder: PendingReminder): string {
  const address = [reminder.address_line_1, reminder.city, reminder.postcode]
    .filter(Boolean)
    .join(", ");
  const dueDate = formatDate(reminder.due_date);
  const complianceUrl = buildAppUrl("/compliance");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Compliance reminder</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#4f46e5;padding:28px 32px;">
              <p style="margin:0;color:#e0e7ff;font-size:13px;font-weight:500;letter-spacing:0.05em;text-transform:uppercase;">
                Letting Compliance
              </p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:600;line-height:1.3;">
                Compliance reminder
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
                A compliance item requires your attention:
              </p>

              <!-- Detail card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:12px;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Property</p>
                          <p style="margin:4px 0 0;font-size:15px;font-weight:500;color:#111827;">${address}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:12px;border-top:1px solid #e5e7eb;padding-top:12px;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Compliance item</p>
                          <p style="margin:4px 0 0;font-size:15px;font-weight:500;color:#111827;">${reminder.compliance_type_name}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #e5e7eb;padding-top:12px;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Due / expiry date</p>
                          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#dc2626;">${dueDate}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#4f46e5;border-radius:8px;">
                    <a href="${complianceUrl}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                      View compliance records →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                You're receiving this because email reminders are enabled in your account settings.
                To stop these emails, turn off <em>Email reminders</em> in
                <a href="${buildAppUrl("/settings")}" style="color:#4f46e5;text-decoration:none;">Settings</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailSubject(reminder: PendingReminder): string {
  return `Compliance reminder: ${reminder.compliance_type_name} due ${formatDate(reminder.due_date)}`;
}

// ─── Step 1: Fetch pending reminders ──────────────────────────────────────────

export async function fetchPendingReminders(): Promise<PendingReminder[]> {
  const supabase = createAdminClient();

  // Join reminders → profiles (for email + preference), properties, compliance_types.
  // Only include rows where:
  //   - status = 'pending'
  //   - profiles.email_reminders_enabled = true
  //
  // PostgREST can't filter on joined table columns directly, so we fetch all
  // pending reminders and filter email_reminders_enabled in JS. The volume of
  // pending reminders is expected to be small (one per user/property/type).
  const { data, error } = await supabase
    .from("reminders")
    .select(
      `id,
       user_id,
       due_date,
       profiles!user_id ( email_reminders_enabled ),
       properties!property_id ( address_line_1, city, postcode ),
       compliance_types!compliance_type_id ( name )`
    )
    .eq("status", "pending");

  if (error) {
    throw new Error(`Failed to fetch pending reminders: ${error.message}`);
  }

  // Flatten joined fields, filter out users who have disabled email reminders,
  // and users whose email is not available.
  const results: PendingReminder[] = [];

  for (const row of (data ?? []) as any[]) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
    const ct = Array.isArray(row.compliance_types) ? row.compliance_types[0] : row.compliance_types;

    // Skip if email reminders are disabled for this user
    if (!profile?.email_reminders_enabled) continue;

    // Fetch the user's email from auth.users via the admin client
    const { data: userRecord, error: userError } = await supabase.auth.admin.getUserById(row.user_id);
    if (userError || !userRecord?.user?.email) continue;

    results.push({
      id: row.id as string,
      user_id: row.user_id as string,
      due_date: row.due_date as string,
      recipient_email: userRecord.user.email,
      address_line_1: (property?.address_line_1 ?? "") as string,
      city: (property?.city ?? "") as string,
      postcode: (property?.postcode ?? "") as string,
      compliance_type_name: (ct?.name ?? "Unknown") as string,
    });
  }

  return results;
}

// ─── Step 2: Send a single reminder email ─────────────────────────────────────

async function sendReminderEmail(
  resend: Resend,
  reminder: PendingReminder
): Promise<void> {
  const fromEmail = process.env.REMINDER_FROM_EMAIL;
  if (!fromEmail) throw new Error("REMINDER_FROM_EMAIL env var is not set.");

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: reminder.recipient_email,
    subject: buildEmailSubject(reminder),
    html: buildEmailHtml(reminder),
  });

  if (error) {
    throw new Error(error.message);
  }
}

// ─── Step 3: Update reminder status ───────────────────────────────────────────

async function markSent(reminderId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reminders")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", reminderId);

  if (error) {
    // Log but don't throw — the email was already sent
    console.error(`Failed to mark reminder ${reminderId} as sent:`, error.message);
  }
}

async function markFailed(reminderId: string, reason: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reminders")
    .update({ status: "failed" })
    .eq("id", reminderId);

  if (error) {
    console.error(
      `Failed to mark reminder ${reminderId} as failed (original error: ${reason}):`,
      error.message
    );
  }
}

// ─── Main export: run the full send cycle ─────────────────────────────────────

export async function sendPendingReminders(): Promise<{
  sent: number;
  failed: number;
  results: SendResult[];
}> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY env var is not set.");

  const resend = new Resend(apiKey);
  const reminders = await fetchPendingReminders();

  const results: SendResult[] = [];

  // Send sequentially to avoid hammering Resend rate limits
  for (const reminder of reminders) {
    try {
      await sendReminderEmail(resend, reminder);
      await markSent(reminder.id);
      results.push({ reminderId: reminder.id, status: "sent" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed to send reminder ${reminder.id}:`, message);
      await markFailed(reminder.id, message);
      results.push({ reminderId: reminder.id, status: "failed", error: message });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return { sent, failed, results };
}
