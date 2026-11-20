"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/i18n/provider"
import { signIn, type FormState } from "@/lib/actions/session"

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

/** Live app: username and password. Accounts are made by the admin; there is no sign-up. */
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
    </form>
  )
}
