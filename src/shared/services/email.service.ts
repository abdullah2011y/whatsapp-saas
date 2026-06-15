import fs from "fs";
import path from "path";
import axios from "axios";

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html?: string;
  text: string;
}) {
  const fromEmail = process.env.EMAIL_FROM || "no-reply@byteforge.pk";

  // 1. Resend API Integration
  if (process.env.RESEND_API_KEY) {
    try {
      console.log(`[Email Service] Attempting to send email via Resend to: ${to}`);
      await axios.post(
        "https://api.resend.com/emails",
        {
          from: fromEmail,
          to: [to],
          subject: subject,
          html: html || text,
          text: text,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(`[Email Service] Resend email success to: ${to}`);
      return;
    } catch (err: any) {
      console.error("[Email Service] Resend dispatch error:", err.response?.data || err.message);
    }
  }

  // 2. Brevo API Integration
  if (process.env.BREVO_API_KEY) {
    try {
      console.log(`[Email Service] Attempting to send email via Brevo to: ${to}`);
      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: { email: fromEmail, name: "ByteForge Support" },
          to: [{ email: to }],
          subject: subject,
          htmlContent: html || text,
          textContent: text,
        },
        {
          headers: {
            "api-key": process.env.BREVO_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(`[Email Service] Brevo email success to: ${to}`);
      return;
    } catch (err: any) {
      console.error("[Email Service] Brevo dispatch error:", err.response?.data || err.message);
    }
  }

  // 3. Mailgun API Integration
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    try {
      console.log(`[Email Service] Attempting to send email via Mailgun to: ${to}`);
      const domain = process.env.MAILGUN_DOMAIN;
      const url = `https://api.mailgun.net/v3/${domain}/messages`;
      const auth = Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString("base64");
      
      const params = new URLSearchParams();
      params.append("from", fromEmail);
      params.append("to", to);
      params.append("subject", subject);
      params.append("text", text);
      if (html) params.append("html", html);

      await axios.post(url, params.toString(), {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      console.log(`[Email Service] Mailgun email success to: ${to}`);
      return;
    } catch (err: any) {
      console.error("[Email Service] Mailgun dispatch error:", err.response?.data || err.message);
    }
  }

  // Fallback: Local logging
  try {
    const logPath = path.join(process.cwd(), "emails.log");
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] TO: ${to} | FROM: ${fromEmail} | SUBJECT: ${subject}\nTEXT: ${text}\n--------------------------------------------------\n`;
    fs.appendFileSync(logPath, entry, "utf-8");
    console.log(`[Email Fallback Log] Email saved to emails.log for ${to}`);
  } catch (err) {
    console.error("[Email Service] Fallback logging failed:", err);
  }
}
