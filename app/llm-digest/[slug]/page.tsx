import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetail } from "@/components/llm-digest/PostDetail";
import { getDigestPost, listDigestPosts } from "@/lib/llm-digest/posts";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listDigestPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getDigestPost(slug);
  if (!post) return { title: "Digest not found" };
  return {
    title: post.title,
    description: post.summary,
  };
}

export default async function DigestPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getDigestPost(slug);
  if (!post) notFound();
  return (
    <main className="flex min-h-screen flex-col bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
      <PostDetail post={post} />
    </main>
  );
}
