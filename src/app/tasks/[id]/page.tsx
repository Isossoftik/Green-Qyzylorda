import { CaseDetail } from "@/components/case-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <CaseDetail taskView id={(await params).id} />;
}
