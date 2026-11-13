// The sign-in cookie. Its name follows the base path, so the official app (/uk) and the demo (/uk/demo)
// keep separate sign-ins: a cookie set for /uk would otherwise also be sent to /uk/demo.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
export const SESSION_COOKIE = BASE === "/uk/demo" ? "uk-demo-session" : "uk-session"
export const COOKIE_PATH = BASE || "/"
