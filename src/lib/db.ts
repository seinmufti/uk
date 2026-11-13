import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

/** True once the Supabase project is set in .env.local. */
export const DB_READY = !!URL && !!KEY

let client: SupabaseClient | null = null

/**
 * The database with full rights (service-role key). Server only: used by server components and server
 * actions, never sent to the browser.
 */
export function db(): SupabaseClient {
  if (!DB_READY) throw new Error("Database not configured")
  client ??= createClient(URL, KEY, { auth: { persistSession: false } })
  return client
}

/** Throws the Supabase error so it reaches the error boundary / the action's caller. */
export function must<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(result.error.message)
  return result.data as NonNullable<T>
}
