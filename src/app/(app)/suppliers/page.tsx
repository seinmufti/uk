import { PartyTable } from "@/components/party-table"
import { listParties } from "@/lib/data/parties"

export default async function SuppliersPage() {
  return <PartyTable table="suppliers" rows={await listParties("suppliers")} />
}
