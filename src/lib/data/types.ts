export type Party = { id: string; name: string; phone: string | null; address: string | null; notes: string | null; archived?: boolean }

export type InvoiceItem = { id?: string; description: string; qty: number; unit_price_usd: number; total_usd: number }
export const CURRENCY_MODES = ["usd", "usd_iqd", "iqd"] as const
export type CurrencyMode = (typeof CURRENCY_MODES)[number]

export type Invoice = {
  id: string
  number: number
  date: string
  customer_id: string | null
  customer: Party | null
  rate_per_100: number
  currency_mode: CurrencyMode
  /** Paid so far (USD); equals the total when paid in full */
  amount_paid_usd: number
  status: "paid" | "unpaid"
  notes: string | null
  items: InvoiceItem[]
  /** The lines added up, before the discount */
  subtotal_usd: number
  /** Taken off the subtotal (USD) */
  discount_usd: number
  /** What the customer owes in all: subtotal minus discount */
  total_usd: number
  /** When the rest is due (only while not paid in full) */
  due_date: string | null
}
export type InvoiceRow = Pick<Invoice, "id" | "number" | "date" | "status" | "total_usd" | "customer_id" | "currency_mode" | "rate_per_100" | "amount_paid_usd" | "due_date"> & { customer_name: string | null }

/** Sales invoices (to customers) and purchase invoices (from suppliers) share one form and one layout. */
export type DocKind = "sale" | "purchase"

/**
 * A purchase invoice, in the same shape as a sales invoice so both use the same form and page:
 * customer / customer_id hold the supplier, and unit_price_usd the unit cost.
 */
export type Purchase = Invoice & { sent_to_inventory: boolean }
export type PurchaseRow = InvoiceRow & { sent_to_inventory: boolean }

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
  /** The bonuses and deductions that make up bonuses_usd / deductions_usd */
  items: PayrollItem[]
}
export type PayrollItem = { id: string; kind: "bonus" | "deduction"; amount_usd: number; reason: string | null }

export type ReceiptKind = "in" | "out"
export const RECEIPT_METHODS = ["cash", "bank", "other"] as const
export type ReceiptMethod = (typeof RECEIPT_METHODS)[number]
export type Receipt = {
  id: string
  kind: ReceiptKind
  number: number
  date: string
  customer_id: string | null
  supplier_id: string | null
  party: string
  amount_usd: number
  rate_per_100: number
  method: ReceiptMethod
  invoice_id: string | null
  debt_id: string | null
  notes: string | null
  /** What it paid, e.g. "Invoice 0002", or the debt's note */
  for_label: string | null
}

/** Something a receipt can settle: an unpaid invoice (in full) or what is left of a debt. */
export type OpenItem = {
  type: "invoice" | "debt"
  id: string
  label: string
  remaining: number
  customer_id: string | null
  supplier_id: string | null
  party: string
}
