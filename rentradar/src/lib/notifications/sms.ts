export interface SmsMessage {
  to: string;
  body: string;
}

/**
 * Twilio-backed SMS sender. No-ops (logs only) when Twilio env vars are
 * unset so the app runs in dev/CI without credentials.
 */
export async function sendSms(message: SmsMessage): Promise<{ sent: boolean }> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.log(`[sms:noop] would text ${message.to}: ${message.body}`);
    return { sent: false };
  }

  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: message.to, From: TWILIO_FROM_NUMBER, Body: message.body }),
  });

  return { sent: res.ok };
}
