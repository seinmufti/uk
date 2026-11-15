import { notFound } from "next/navigation"
import { AccountsTable } from "@/components/accounts-table"
import { PageHeader } from "@/components/page-header"
import { getT } from "@/i18n/server"
import { getSession } from "@/lib/auth"
import { db, must } from "@/lib/db"

/** Admins only: everyone who signed up, to approve or block. */
export default async function AccountsPage() {
  const me = await getSession()
  if (!me?.admin) notFound()
  const t = await getT()
  const users = must(await db().from("users").select("id, email, username, status, is_admin, created_at").order("created_at", { ascending: false }))
  return (
    <div className="p-4 md:p-6">
      <PageHeader title={t("auth.accounts")} />
      <div className="mt-4">
        <AccountsTable users={users} me={me.userId} />
      </div>
    </div>
  )
}
