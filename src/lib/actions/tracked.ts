import "server-only"
import { getSession } from "@/lib/auth"
import { changeContext } from "@/lib/db"

/**
 * Runs an action as one change in the history: all of its database writes undo / redo together, and the
 * history notes which account made it.
 */
export function tracked<A extends unknown[], R>(action: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => {
    const by = (await getSession())?.username ?? null
    return changeContext.run({ id: crypto.randomUUID(), by }, () => action(...args))
  }
}
