// Is a signed-in account still allowed in? A sign-in cookie lasts 30 days, so an account the admin
// blocked or deleted is checked against the database rather than trusted from the cookie.
// Plain fetch (no server-only imports) so the proxy can use it too.

export type Account = { username: string; admin: boolean }

export async function activeAccount(uid: string): Promise<Account | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !/^[0-9a-f-]{36}$/i.test(uid)) return null
  const res = await fetch(`${url}/rest/v1/users?select=username,status,is_admin&id=eq.${uid}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" })
  if (!res.ok) return null
  const [row] = (await res.json()) as { username: string; status: string; is_admin: boolean }[]
  return row?.status === "approved" ? { username: row.username, admin: row.is_admin } : null
}
