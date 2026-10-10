import { Resend } from "resend";

// ---------------------------------------------------------------------------
// Weekly nudge email. QCOS has no user accounts - NOTIFY_EMAIL is just the
// one address (yours) that gets the weekly digest. Without RESEND_API_KEY
// and NOTIFY_EMAIL set, this is a no-op: the weekly digest still generates
// and shows on the homepage, it just doesn't get emailed.
// ---------------------------------------------------------------------------

let client: Resend | null | undefined;

function getClient(): Resend | null {
  if (client !== undefined) return client;
  client = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  return client;
}

export interface NudgeEmailInput {
  weekLabel: string;
  summary: string;
  suggestionCount: number;
  appUrl: string;
}

export async function sendWeeklyNudgeEmail(input: NudgeEmailInput): Promise<boolean> {
  const resend = getClient();
  const to = process.env.NOTIFY_EMAIL;
  if (!resend || !to) return false;

  const from = process.env.RESEND_FROM_EMAIL || "QCOS <onboarding@resend.dev>";

  const suggestionLine =
    input.suggestionCount > 0
      ? `<p>I also spotted ${input.suggestionCount} potential pattern${input.suggestionCount === 1 ? "" : "s"} worth logging - check the homepage.</p>`
      : "";

  try {
    await resend.emails.send({
      from,
      to,
      subject: `QCOS weekly check-in - ${input.weekLabel}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2645d1;">Your week at a glance</h2>
          <p>${input.summary}</p>
          ${suggestionLine}
          <p>Did anything happen this week that's not logged yet? Takes 30 seconds.</p>
          <a href="${input.appUrl}" style="display: inline-block; background: #3661f5; color: white; padding: 10px 18px; border-radius: 10px; text-decoration: none; font-weight: 600;">Log it in QCOS</a>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Weekly nudge email failed to send:", error);
    return false;
  }
}
