/**
 * Tenant invite email template.
 *
 * Sends a branded invite email via Resend containing a Supabase-generated
 * action link. The link handles auth at Supabase's end, then redirects to
 * /portal/accept-invite so the tenant can set their password.
 *
 * Env vars required:
 *   RESEND_API_KEY
 *   REMINDER_FROM_EMAIL  (reuses the same sender address as compliance reminders)
 *   NEXT_PUBLIC_APP_URL
 */

import { Resend } from "resend";
import { buildAppUrl } from "@/lib/app-url";

function buildEmailHtml(opts: {
  tenantName: string | null;
  propertyAddress: string;
  agentName: string;
  actionLink: string;
}): string {
  const greeting = opts.tenantName ? `Hi ${opts.tenantName.split(" ")[0]},` : "Hi,";
  const portalUrl = buildAppUrl("/portal");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your tenant portal invite</title>
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
                Let Lucid
              </p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:600;line-height:1.3;">
                You've been invited to your tenant portal
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
                ${greeting}
              </p>
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
                <strong>${opts.agentName}</strong> has set up a secure tenant portal for your property at
                <strong>${opts.propertyAddress}</strong>.
              </p>
              <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.6;">
                Your portal lets you view your tenancy details, check compliance certificates,
                and securely share documents with your letting agent.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#4f46e5;border-radius:8px;">
                    <a href="${opts.actionLink}"
                       style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Set up your portal account →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Detail card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:12px;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Your property</p>
                          <p style="margin:4px 0 0;font-size:15px;font-weight:500;color:#111827;">${opts.propertyAddress}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #e5e7eb;padding-top:12px;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Managed by</p>
                          <p style="margin:4px 0 0;font-size:15px;font-weight:500;color:#111827;">${opts.agentName}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                This invite link expires in <strong>7 days</strong>. If it has expired, ask your
                letting agent to send a new one.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                If you weren't expecting this invite, you can safely ignore this email.
                Already have an account?
                <a href="${portalUrl}" style="color:#4f46e5;text-decoration:none;">Sign in to your portal</a>.
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

export async function sendTenantInviteEmail(opts: {
  to: string;
  tenantName: string | null;
  propertyAddress: string;
  agentName: string;
  actionLink: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY env var is not set.");

  const fromEmail = process.env.REMINDER_FROM_EMAIL;
  if (!fromEmail) throw new Error("REMINDER_FROM_EMAIL env var is not set.");

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: opts.to,
    subject: `You've been invited to your tenant portal – ${opts.propertyAddress}`,
    html: buildEmailHtml(opts),
  });

  if (error) throw new Error(error.message);
}
