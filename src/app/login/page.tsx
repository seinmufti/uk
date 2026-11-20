import { redirect } from "next/navigation"
import { AuthCard } from "@/components/auth-card"
import { SignInForm } from "@/components/auth-forms"
import { Button } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { signInDemo } from "@/lib/actions/session"
import { getSession, IS_DEMO } from "@/lib/auth"

/** The demo signs in with one button; the live app with a username and password. */
export default async function LoginPage() {
  if (await getSession()) redirect("/")
  const t = await getT()
  return (
    <AuthCard title={t("login.title")}>
      {IS_DEMO ? (
        <form action={signInDemo} className="mt-6">
          <Button type="submit" size="lg" className="w-full">
            {t("login.demo")}
          </Button>
        </form>
      ) : (
        <SignInForm />
      )}
    </AuthCard>
  )
}
