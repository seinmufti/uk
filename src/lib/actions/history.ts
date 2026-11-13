"use server"

import { revalidatePath } from "next/cache"
import { db, must, quietDb } from "@/lib/db"
import { getChange, TABLE_RANK, type HistoryRow } from "@/lib/data/history"
import { fail, type ActionResult } from "./result"

type Step = { tbl: string; row_id: string; row: Record<string, unknown> | null } // row null = delete

/**
 * The state each touched row should end up in. Undo: the row as it was before the change (gone if the
 * change created it). Redo: the row as the change left it (gone if the change deleted it).
 */
function plan(rows: HistoryRow[], direction: "undo" | "redo"): Step[] {
  const byRow = new Map<string, HistoryRow[]>()
  for (const r of rows) byRow.set(`${r.tbl}:${r.row_id}`, [...(byRow.get(`${r.tbl}:${r.row_id}`) ?? []), r])
  return [...byRow.values()].map((list) => {
    const first = list[0]
    const last = list[list.length - 1]
    return direction === "undo"
      ? { tbl: first.tbl, row_id: first.row_id, row: first.op === "INSERT" ? null : first.old_row }
      : { tbl: last.tbl, row_id: last.row_id, row: last.op === "DELETE" ? null : last.new_row }
  })
}

async function apply(steps: Step[]) {
  const rank = (s: Step) => TABLE_RANK[s.tbl] ?? 9
  const key = (s: Step) => (s.tbl === "settings" ? Number(s.row_id) : s.row_id)
  // Deletes children first, then put rows back parents first
  for (const s of steps.filter((s) => !s.row).sort((a, b) => rank(b) - rank(a))) {
    must(await quietDb().from(s.tbl).delete().eq("id", key(s)))
  }
  for (const s of steps.filter((s) => s.row).sort((a, b) => rank(a) - rank(b))) {
    must(await quietDb().from(s.tbl).upsert(s.row!, { onConflict: "id" }))
  }
}

async function flip(id: string, direction: "undo" | "redo"): Promise<ActionResult> {
  try {
    const change = await getChange(id)
    if (!change) throw new Error("Change not found")
    if (change.undone === (direction === "undo")) throw new Error(direction === "undo" ? "Already undone" : "Not undone")
    await apply(plan(change.rows, direction))
    must(
      await db()
        .from("history_changes")
        .update({ undone: direction === "undo", undone_at: direction === "undo" ? new Date().toISOString() : null })
        .eq("id", id),
    )
    revalidatePath("/", "layout")
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // A later change may have built on this one (e.g. a number now used by another invoice)
    return fail(/duplicate key|violates/.test(msg) ? `Can't ${direction}: a later change conflicts with it (${msg})` : msg)
  }
}

export async function undoChange(id: string) {
  return flip(id, "undo")
}

export async function redoChange(id: string) {
  return flip(id, "redo")
}
