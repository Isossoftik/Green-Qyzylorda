import { CaseDetail } from "@/components/case-detail";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  return (
    <CaseDetail
      id={(await params).id}
      created={(await searchParams).created === "1"}
    />
  );
}
