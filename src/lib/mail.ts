import "server-only"

/**
 * Tells the admin (ADMIN_EMAIL) that someone signed up, with a link that approves the account.
 * Sent through Resend (RESEND_API_KEY). Without a key nothing is sent; the account still waits on
 * the Accounts page (Settings → Accounts) for the admin to approve.
 */
export async function sendApprovalRequest({ username, email, approveUrl }: { username: string; email: string; approveUrl: string }) {
  const key = process.env.RESEND_API_KEY
  const to = process.env.ADMIN_EMAIL
  if (!key || !to) return false
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "UK Accounting <onboarding@resend.dev>",
      to: [to],
      subject: `New account waiting for approval: ${username}`,
      html: `<p><b>${escape(username)}</b> (${escape(email)}) signed up for UK Accounting.</p>
<p><a href="${approveUrl}" style="display:inline-block;padding:10px 16px;background:#e9a23b;color:#1c1917;border-radius:8px;text-decoration:none;font-weight:600">Approve account</a></p>
<p style="color:#666">If you don't know this person, ignore this email; the account stays blocked.</p>`,
    }),
  })
  return res.ok
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
