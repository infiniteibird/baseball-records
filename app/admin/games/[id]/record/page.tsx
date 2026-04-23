import { RecordPageClient } from "@/components/record/record-page-client";

export default async function AdminGameRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <RecordPageClient gameId={id} />;
}
