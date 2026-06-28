import { Resend } from "resend";

// ---------------------------------------------------------------------------
// Sender identity
// ---------------------------------------------------------------------------

export const FROM_ADDRESS = "DaiVzemi <noreply@daivzemi.bg>";

// ---------------------------------------------------------------------------
// Lazy singleton — only constructed when the key is present
// ---------------------------------------------------------------------------

let _client: Resend | null = null;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_client) _client = new Resend(process.env.RESEND_API_KEY);
  return _client;
}

// ---------------------------------------------------------------------------
// Public send helper
// ---------------------------------------------------------------------------

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const client = getClient();

  if (!client) {
    console.warn(
      "[email] RESEND_API_KEY not configured — email skipped:",
      payload.subject,
    );
    return false;
  }

  try {
    const { error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Unexpected error:", err);
    return false;
  }
}
