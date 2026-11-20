import { DocsLayout } from "@/components/docs-layout"

export default function InvoicesLayout({ children }: LayoutProps<"/invoices">) {
  return <DocsLayout kind="sale">{children}</DocsLayout>
}
