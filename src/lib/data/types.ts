export type Party = { id: string; name: string; phone: string | null; address: string | null; notes: string | null }

export type InvoiceItem = { id?: string; description: string; qty: number; total_usd: number }
export type Invoice = {
  id: string
  number: number
  date: string
  customer_id: string | null
  customer: Party | null
  rate_per_100: number
  status: "paid" | "unpaid"
  notes: string | null
  items: InvoiceItem[]
  total_usd: number
}
export type InvoiceRow = Pick<Invoice, "id" | "number" | "date" | "status" | "total_usd" | "customer_id"> & { customer_name: string | null }

export type PurchaseItem = { id?: string; description: string; qty: number; unit_cost_usd: number }
export type Purchase = {
  id: string
  number: number
  date: string
  supplier_id: string | null
  supplier: Party | null
  payment_status: "paid" | "debt"
  amount_paid_usd: number
  sent_to_inventory: boolean
  notes: string | null
  items: PurchaseItem[]
  total_usd: number
}
export type PurchaseRow = Pick<Purchase, "id" | "number" | "date" | "payment_status" | "sent_to_inventory" | "total_usd"> & {
  supplier_name: string | null
}

export const INVENTORY_KINDS = ["asset", "stock", "capital"] as const
export type InventoryKind = (typeof INVENTORY_KINDS)[number]
export type InventoryItem = {
  id: string
  kind: InventoryKind
  name: string
  qty: number
  value_usd: number
  date: string
  notes: string | null
  source_purchase_id: string | null
}

export type DebtDirection = "receivable" | "payable"
export type Debt = {
  id: string
  direction: DebtDirection
  party: string
  amount_usd: number
  paid_usd: number
  date: string
  due_date: string | null
  notes: string | null
  purchase_id: string | null
}

export const EXPENSE_CATEGORIES = ["rent", "utilities", "salaries", "fuel", "supplies", "maintenance", "marketing", "taxes", "other"] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
export type Expense = {
  id: string
  date: string
  category: ExpenseCategory
  description: string
  amount_usd: number
  recurring: boolean
  payroll_id: string | null
}

export type Employee = {
  id: string
  name: string
  position: string | null
  phone: string | null
  base_salary_usd: number
  start_date: string
  active: boolean
  notes: string | null
}
export type Leave = { id: string; employee_id: string; from_date: string; to_date: string; type: "paid" | "unpaid" | "sick"; notes: string | null }
export type Absence = { id: string; employee_id: string; date: string; days: number; notes: string | null }
export type PayrollRow = {
  id: string
  month: string
  employee_id: string
  employee_name: string
  base_usd: number
  deductions_usd: number
  bonuses_usd: number
  paid_at: string | null
  notes: string | null
}
