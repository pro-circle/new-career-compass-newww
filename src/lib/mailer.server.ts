/**
 * Server-only transactional mailer.
 *
 * Uses Gmail SMTP when GMAIL_USER and GMAIL_APP_PASSWORD are configured.
 * The 16-character App Password is read server-side and never reaches the client.
 * Every attempt — sent or not — is recorded in `email_outbox` so the UI can
 * tell the truth instead of showing a fake "sent" toast.
 */
import { serverEnv } from "./env.server";

export type MailResult = {
  ok: boolean;
  delivered: boolean;
  id: string;
  message: string;
};

function newId() {
  return `MAIL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  body: string;
}): Promise<MailResult> {
  const id = newId();
  const to = opts.to.trim();
  const gmailUser = serverEnv("GMAIL_USER")?.trim();
  const appPassword = serverEnv("GMAIL_APP_PASSWORD")?.replace(/\s+/g, "");
  const fromName = serverEnv("EMAIL_FROM_NAME")?.trim() || "ATS Engine";

  let status: "queued" | "sent" | "failed" = "queued";
  let providerId: string | null = null;
  let error: string | null = null;

  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    status = "failed";
    error = "Missing or invalid recipient email address.";
  } else if (gmailUser && appPassword) {
    try {
      if (appPassword.length !== 16) {
        throw new Error("GMAIL_APP_PASSWORD must be the 16-character Gmail App Password.");
      }
      const { createTransport } = await import("nodemailer");
      const transport = createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: appPassword },
      });
      const info = await transport.sendMail({
        from: { name: fromName, address: gmailUser },
        to,
        subject: opts.subject,
        text: opts.body,
      });
      status = "sent";
      providerId = info.messageId || null;
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : "Gmail could not be reached";
    }
  }

  try {
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = getSupabaseAdmin();
    await db?.from("email_outbox").insert({
      id,
      to_email: to,
      subject: opts.subject,
      body: opts.body,
      status,
      provider_id: providerId,
      error,
    });
  } catch {
    /* outbox logging is best-effort */
  }

  return {
    ok: status !== "failed",
    delivered: status === "sent",
    id,
    message:
      status === "sent"
        ? `Email delivered to ${to}`
        : status === "queued"
          ? `Email queued for ${to} (configure GMAIL_USER and GMAIL_APP_PASSWORD to deliver)`
          : (error ?? "Email failed"),
  };
}
