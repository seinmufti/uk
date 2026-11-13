import { ShoppingCart } from "lucide-react"
import { getT } from "@/i18n/server"

export default async function PurchasesPage() {
  const t = await getT()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
      <ShoppingCart className="size-8 opacity-40" />
      {t("purchases.pick")}
    </div>
  )
}
