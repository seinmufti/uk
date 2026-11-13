import "server-only"
import { changeContext } from "@/lib/db"

/** Runs an action as one change in the history: all of its database writes undo / redo together. */
export function tracked<A extends unknown[], R>(action: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => changeContext.run({ id: crypto.randomUUID() }, () => action(...args))
}
