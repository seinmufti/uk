import { DocsLayout } from "@/components/docs-layout"

export default function PurchasesLayout({ children }: LayoutProps<"/purchases">) {
  return <DocsLayout kind="purchase">{children}</DocsLayout>
}
