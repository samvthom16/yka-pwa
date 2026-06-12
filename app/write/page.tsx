import WritingApp from "@/components/editor/WritingApp";

export default async function WritePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const params = await searchParams;
  const raw = params.id;
  const postId = raw && /^\d+$/.test(raw) ? Number(raw) : undefined;
  return <WritingApp postId={postId} />;
}
