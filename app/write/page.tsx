import WritingApp from "@/components/editor/WritingApp";

export default async function WritePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const params = await searchParams;
  const postId = params.id ? Number(params.id) : undefined;
  return <WritingApp postId={postId} />;
}
