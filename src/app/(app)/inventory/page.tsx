import { InventoryView } from "@/components/inventory-view"
import { listInventory } from "@/lib/data/records"
import { INVENTORY_KINDS, type InventoryKind } from "@/lib/data/types"

export default async function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  const { tab } = await searchParams
  const kind: InventoryKind = INVENTORY_KINDS.includes(tab as InventoryKind) ? (tab as InventoryKind) : "stock"
  const all = await listInventory()
  const totals = Object.fromEntries(INVENTORY_KINDS.map((k) => [k, all.filter((i) => i.kind === k).reduce((s, i) => s + i.value_usd, 0)])) as Record<
    InventoryKind,
    number
  >
  return <InventoryView kind={kind} items={all.filter((i) => i.kind === kind)} totals={totals} />
}
