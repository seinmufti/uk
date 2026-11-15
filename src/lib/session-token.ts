// Signed tokens (Web Crypto HMAC-SHA256), so they work both in the proxy and on the server:
// the sign-in cookie and the approve-account links. A token is base64url(JSON payload).signature;
// nobody can make or change one without the secret.

export type SessionPayload = { kind: "session"; uid: string; name: string; admin?: boolean; exp: number }
export type ApprovePayload = { kind: "approve"; uid: string; exp: number }
type Payload = SessionPayload | ApprovePayload

const encoder = new TextEncoder()
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))

// SESSION_SECRET if set; otherwise derived from the (already secret) Supabase service key
const secret = () => process.env.SESSION_SECRET || `uk-session:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`

let keyPromise: Promise<CryptoKey> | null = null
const key = () => (keyPromise ??= crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]))

export async function signToken(payload: Payload): Promise<string> {
  const body = b64url(encoder.encode(JSON.stringify(payload)))
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), encoder.encode(body)))
  return `${body}.${b64url(sig)}`
}

/** The payload if the token is genuine, of the given kind and not expired; otherwise null. */
export async function verifyToken<K extends Payload["kind"]>(token: string | undefined, kind: K): Promise<Extract<Payload, { kind: K }> | null> {
  if (!token) return null
  const [body, sig] = token.split(".")
  if (!body || !sig) return null
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(), fromB64url(sig), encoder.encode(body))
    if (!ok) return null
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Payload
    if (payload.kind !== kind || payload.exp < Date.now()) return null
    return payload as Extract<Payload, { kind: K }>
  } catch {
    return null
  }
}

export const DAY = 24 * 60 * 60 * 1000
