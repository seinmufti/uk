import "server-only"
import { AsyncLocalStorage } from "node:async_hooks"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

/** True once the Supabase project is set in .env.local. */
export const DB_READY = !!URL && !!KEY

const make = (headers?: Record<string, string>) => createClient(URL, KEY, { auth: { persistSession: false }, global: { headers } })

let client: SupabaseClient | null = null

/** The change (one action in the app) the current code is running for; see tracked() in actions. */
export const changeContext = new AsyncLocalStorage<{ id: string; client?: SupabaseClient }>()

/**
 * The database with full rights (service-role key). Server only: used by server components and server
 * actions, never sent to the browser. Inside an action, every request carries the action's change id so
 * the history groups them as one change.
 */
export function db(): SupabaseClient {
  if (!DB_READY) throw new Error("Database not configured")
  const change = changeContext.getStore()
  if (change) return (change.client ??= make({ "x-change-id": change.id }))
  client ??= make()
  return client
}

let quiet: SupabaseClient | null = null
/** For undo / redo: writes that the history must not record. */
export function quietDb(): SupabaseClient {
  if (!DB_READY) throw new Error("Database not configured")
  return (quiet ??= make({ "x-history-skip": "1" }))
}

/** Throws the Supabase error so it reaches the error boundary / the action's caller. */
export function must<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(result.error.message)
  return result.data as NonNullable<T>
}
