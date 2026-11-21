import { notFound } from "next/navigation"
import { AccountsTable } from "@/components/accounts-table"
import { getSession } from "@/lib/auth"
import { db, must } from "@/lib/db"

/** Admins only: everyone who can sign in. The admin adds accounts, changes passwords, blocks or deletes them. */
export default async function AdminPage() {
  const me = await getSession()
  if (!me?.admin) notFound()
  const users = must(await db().from("users").select("id, username, status, is_admin, created_at").order("created_at"))
  return <AccountsTable users={users} me={me.userId} />
}
