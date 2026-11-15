import { redirect } from "next/navigation"
import { AuthCard } from "@/components/auth-card"
import { SignUpForm } from "@/components/auth-forms"
import { getT } from "@/i18n/server"
import { getSession, IS_DEMO } from "@/lib/auth"

/** Live app only: ask for an account (the admin approves it). */
export default async function SignUpPage() {
  if (IS_DEMO || (await getSession())) redirect(IS_DEMO ? "/login" : "/")
  const t = await getT()
  return (
    <AuthCard title={t("auth.createAccount")} subtitle={t("auth.signUpNote")}>
      <SignUpForm />
    </AuthCard>
  )
}
