"use client"

import { Ban, Check, KeyRound, Plus, ShieldCheck, ShieldOff } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useI18n } from "@/i18n/provider"
import { createAccount, deleteAccount, setAccountAdmin, setAccountPassword, setAccountStatus } from "@/lib/actions/session"
import { formatDate } from "@/lib/dates"
import { DeleteButton } from "./delete-button"
import { Field } from "./form-bits"
import { FormDialog } from "./form-dialog"
import { PageHeader } from "./page-header"
import { useAction } from "./use-action"

type User = { id: string; username: string; status: "pending" | "approved" | "rejected"; is_admin: boolean; created_at: string }

const TONE = {
  pending: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
}

/** The admin panel: everyone who can sign in. Only the admin makes accounts. */
export function AccountsTable({ users, me }: { users: User[]; me: string }) {
  const { t, locale } = useI18n()
  const { pending, run } = useAction()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ username: "", password: "", admin: false })
  const [resetting, setResetting] = useState<User | null>(null)
  const [password, setPassword] = useState("")

  return (
    <div className="grid gap-4 p-4 md:p-6">
      <PageHeader
        title={t("auth.accounts")}
        subtitle={t("auth.accountsNote")}
        actions={
          <Button onClick={() => (setForm({ username: "", password: "", admin: false }), setAdding(true))}>
            <Plus /> {t("auth.newAccount")}
          </Button>
        }
      />
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("auth.username")}</TableHead>
              <TableHead>{t("auth.status")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("auth.created")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  <bdi dir="ltr">{u.username}</bdi> {u.is_admin && <Badge variant="outline">{t("auth.admin")}</Badge>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={TONE[u.status]}>
                    {t(`auth.state.${u.status}`)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{formatDate(u.created_at.slice(0, 10), locale)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" title={t("auth.resetPassword")} aria-label={t("auth.resetPassword")} onClick={() => (setPassword(""), setResetting(u))}>
                      <KeyRound />
                    </Button>
                    {u.id !== me && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending}
                          title={t(u.is_admin ? "auth.removeAdmin" : "auth.makeAdmin")}
                          aria-label={t(u.is_admin ? "auth.removeAdmin" : "auth.makeAdmin")}
                          onClick={() => run(() => setAccountAdmin(u.id, !u.is_admin), { success: t("common.saved") })}
                        >
                          {u.is_admin ? <ShieldOff /> : <ShieldCheck />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending}
                          title={t(u.status === "approved" ? "auth.block" : "auth.unblock")}
                          aria-label={t(u.status === "approved" ? "auth.block" : "auth.unblock")}
                          onClick={() => run(() => setAccountStatus(u.id, u.status === "approved" ? "rejected" : "approved"), { success: t("common.saved") })}
                        >
                          {u.status === "approved" ? <Ban /> : <Check />}
                        </Button>
                        <DeleteButton action={() => deleteAccount(u.id)} />
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FormDialog
        title={t("auth.newAccount")}
        open={adding}
        onOpenChange={setAdding}
        pending={pending}
        onSubmit={() => run(() => createAccount(form), { success: t("common.saved"), then: () => setAdding(false) })}
      >
        <Field label={t("auth.username")}>
          <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus autoComplete="off" autoCapitalize="none" dir="ltr" minLength={3} maxLength={30} pattern="[A-Za-z0-9_.\-]{3,30}" title={t("auth.badUsername")} />
        </Field>
        <Field label={t("auth.password")}>
          <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" dir="ltr" minLength={8} />
        </Field>
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox checked={form.admin} onCheckedChange={(v) => setForm({ ...form, admin: !!v })} />
          {t("auth.admin")} · <span className="text-muted-foreground">{t("auth.adminNote")}</span>
        </Label>
      </FormDialog>

      <FormDialog
        title={`${t("auth.resetPassword")}${resetting ? ` · ${resetting.username}` : ""}`}
        open={!!resetting}
        onOpenChange={(open) => !open && setResetting(null)}
        pending={pending}
        onSubmit={() => resetting && run(() => setAccountPassword(resetting.id, password), { success: t("common.saved"), then: () => setResetting(null) })}
      >
        <Field label={t("auth.newPassword")}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus autoComplete="new-password" dir="ltr" minLength={8} />
        </Field>
      </FormDialog>
    </div>
  )
}
