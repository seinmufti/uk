import { HrTabs } from "@/components/hr-views"
import { PageHeader } from "@/components/page-header"
import { getT } from "@/i18n/server"

export default async function HrLayout({ children }: LayoutProps<"/hr">) {
  const t = await getT()
  return (
    <div className="grid gap-4 p-4 md:p-6">
      <PageHeader title={t("hr.title")} actions={<HrTabs />} />
      {children}
    </div>
  )
}
