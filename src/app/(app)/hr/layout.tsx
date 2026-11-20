/** HR pages: each one shows the HR tabs with its own buttons on the same row (see PageHeader in hr-views). */
export default function HrLayout({ children }: LayoutProps<"/hr">) {
  return <div className="grid gap-4 p-4 md:p-6">{children}</div>
}
