"use client"

import { Ban, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useI18n } from "@/i18n/provider"
import { setAccountStatus } from "@/lib/actions/session"
import { formatDate } from "@/lib/dates"
import { useAction } from "./use-action"

type User = { id: string; email: string; username: string; status: "pending" | "approved" | "rejected"; is_admin: boolean; created_at: string }

const TONE = {
  pending: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
}

export function AccountsTable({ users, me }: { users: User[]; me: string }) {
  const { t, locale } = useI18n()
  const { pending, run } = useAction()
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("auth.username")}</TableHead>
            <TableHead>{t("auth.email")}</TableHead>
            <TableHead>{t("auth.status")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("auth.joined")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium" dir="ltr">
                {u.username} {u.is_admin && <Badge variant="outline">{t("auth.admin")}</Badge>}
              </TableCell>
              <TableCell dir="ltr">{u.email}</TableCell>
              <TableCell>
                <Badge variant="outline" className={TONE[u.status]}>
                  {t(`auth.state.${u.status}`)}
                </Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{formatDate(u.created_at.slice(0, 10), locale)}</TableCell>
              <TableCell className="text-end">
                {u.id !== me && (
                  <div className="flex justify-end gap-2">
                    {u.status !== "approved" && (
                      <Button size="sm" disabled={pending} onClick={() => run(() => setAccountStatus(u.id, "approved"))}>
                        <Check /> {t("auth.approve")}
                      </Button>
                    )}
                    {u.status !== "rejected" && (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setAccountStatus(u.id, "rejected"))}>
                        <Ban /> {t("auth.block")}
                      </Button>
                    )}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
