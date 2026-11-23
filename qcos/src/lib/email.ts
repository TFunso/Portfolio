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
    const { error } = await resend.emails.send({
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
    // Resend reports API failures (bad sender, unverified domain, quota) in
    // the returned `error`, not by throwing.
    if (error) {
      console.error("Weekly nudge email was rejected:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Weekly nudge email failed to send:", error);
    return false;
  }
}

// Public URL of the deployed app, for links in emails.
export function appBaseUrl(): string {
  return process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://qcos.vercel.app";
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL);
}

export interface BackupEmailInput {
  filename: string;
  json: string;
  evidenceCount: number;
  entryCount: number;
  appUrl: string;
}

// Emails a full JSON backup as an attachment - sent monthly by the weekly
// cron and on demand from the Data & Backup page. Same no-op-without-keys
// behavior as the nudge email.
export async function sendBackupEmail(input: BackupEmailInput): Promise<boolean> {
  const resend = getClient();
  const to = process.env.NOTIFY_EMAIL;
  if (!resend || !to) return false;

  const from = process.env.RESEND_FROM_EMAIL || "QCOS <onboarding@resend.dev>";

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `QCOS backup - ${input.filename.replace(/^QCOS-backup-|\.json$/g, "")}`,
      attachments: [{ filename: input.filename, content: Buffer.from(input.json, "utf8") }],
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2645d1;">Your QCOS backup</h2>
          <p>Attached is a full copy of everything in QCOS: ${input.entryCount} daily entries and ${input.evidenceCount} pieces of evidence.</p>
          <p>Keep this email (or save the file somewhere safe). If anything ever happens to the database, upload this file on the <a href="${input.appUrl}/data">Data &amp; Backup</a> page to restore it.</p>
        </div>
      `,
    });
    if (error) {
      console.error("Backup email was rejected:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Backup email failed to send:", error);
    return false;
  }
}
