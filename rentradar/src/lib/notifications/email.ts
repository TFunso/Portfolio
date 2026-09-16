export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/**
 * SendGrid-backed email sender. No-ops (logs only) when SENDGRID_API_KEY is
 * unset so the app runs in dev/CI without credentials.
 */
export async function sendEmail(message: EmailMessage): Promise<{ sent: boolean }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.log(`[email:noop] would send to ${message.to}: ${message.subject}`);
    return { sent: false };
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: message.to }] }],
      from: { email: process.env.SENDGRID_FROM_EMAIL ?? "alerts@rentradar.app" },
      subject: message.subject,
      content: [{ type: "text/html", value: message.html }],
    }),
  });

  return { sent: res.ok };
}

export function rentDropEmail(listingTitle: string, oldRentCents: number, newRentCents: number, url: string): EmailMessage["html"] {
  const old = (oldRentCents / 100).toFixed(0);
  const next = (newRentCents / 100).toFixed(0);
  return `<p><strong>${listingTitle}</strong> dropped from $${old}/mo to $${next}/mo.</p><p><a href="${url}">View listing</a></p>`;
}
