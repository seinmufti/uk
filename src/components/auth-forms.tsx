"use client"

import { CircleCheck } from "lucide-react"
import Link from "next/link"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/i18n/provider"
import { signIn, signUp, type FormState } from "@/lib/actions/session"

function Row({ id, label, ...props }: { id: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} required {...props} />
    </div>
  )
}

function Error({ state }: { state: FormState }) {
  return state.error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p> : null
}

/** Live app: username and password. */
export function SignInForm() {
  const { t } = useI18n()
  const [state, action, pending] = useActionState(signIn, {})
  return (
    <form action={action} className="mt-6 grid gap-4">
      <Row id="username" label={t("auth.username")} autoComplete="username" autoCapitalize="none" dir="ltr" />
      <Row id="password" label={t("auth.password")} type="password" autoComplete="current-password" dir="ltr" />
      <Error state={state} />
      <Button type="submit" size="lg" disabled={pending}>
        {t("auth.signIn")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          {t("auth.createAccount")}
        </Link>
      </p>
    </form>
  )
}

/** Live app: email, username and password; the account then waits for the admin's approval. */
export function SignUpForm() {
  const { t } = useI18n()
  const [state, action, pending] = useActionState(signUp, {})
  if (state.done)
    return (
      <div className="mt-6 grid gap-4 text-center">
        <CircleCheck className="mx-auto size-10 text-emerald-600" />
        <p className="font-medium">{t("auth.requested")}</p>
        <p className="text-sm text-muted-foreground">{t("auth.requestedNote")}</p>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          {t("auth.backToSignIn")}
        </Link>
      </div>
    )
  return (
    <form action={action} className="mt-6 grid gap-4">
      <Row id="email" label={t("auth.email")} type="email" autoComplete="email" dir="ltr" />
      <Row id="username" label={t("auth.username")} autoComplete="username" autoCapitalize="none" dir="ltr" minLength={3} maxLength={30} pattern="[A-Za-z0-9_.\-]{3,30}" title={t("auth.badUsername")} />
      <Row id="password" label={t("auth.password")} type="password" autoComplete="new-password" dir="ltr" minLength={8} />
      <Error state={state} />
      <Button type="submit" size="lg" disabled={pending}>
        {t("auth.createAccount")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </form>
  )
}
