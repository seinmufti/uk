import { CircleCheck } from "lucide-react"
import { AuthCard } from "@/components/auth-card"
import { Button } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { approveFromLink } from "@/lib/actions/approve"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/session-token"

/**
 * The link in the admin's "new account" email. It shows who signed up and approves only when the
 * button is pressed (so mail scanners opening the link don't approve anyone).
 */
export default async function ApprovePage({ searchParams }: PageProps<"/approve">) {
  const t = await getT()
  const { token, done } = await searchParams
  const payload = await verifyToken(typeof token === "string" ? token : undefined, "approve")
  const user = payload ? (await db().from("users").select("username, email, status").eq("id", payload.uid).maybeSingle()).data : null
  if (!user) return <AuthCard title={t("auth.linkInvalid")} />
  if (done || user.status === "approved")
    return (
      <AuthCard title={t("auth.approvedTitle")}>
        <p className="mt-4 flex items-center gap-2 text-sm">
          <CircleCheck className="size-5 text-emerald-600" /> {t("auth.approvedNote", { name: user.username })}
        </p>
      </AuthCard>
    )
  return (
    <AuthCard title={t("auth.approveTitle")}>
      <dl className="mt-4 grid gap-1 text-sm">
        <dt className="text-muted-foreground">{t("auth.username")}</dt>
        <dd className="font-medium" dir="ltr">{user.username}</dd>
        <dt className="mt-2 text-muted-foreground">{t("auth.email")}</dt>
        <dd className="font-medium" dir="ltr">{user.email}</dd>
      </dl>
      <form action={approveFromLink} className="mt-6">
        <input type="hidden" name="token" value={String(token)} />
        <Button type="submit" size="lg" className="w-full">
          {t("auth.approve")}
        </Button>
      </form>
    </AuthCard>
  )
}
