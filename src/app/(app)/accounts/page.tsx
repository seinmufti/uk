import { redirect } from "next/navigation"

/** The admin panel moved to /admin. */
export default function AccountsPage() {
  redirect("/admin")
}
