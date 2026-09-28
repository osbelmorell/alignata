import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetail } from "@/components/llm-digest/PostDetail";
import { getPost, getPostSlugs } from "@/lib/llm-digest/posts";

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "AI Digest" };
  return { title: post.title, description: post.summary };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  return (
    <main className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
      <PostDetail post={post} />
    </main>
  );
}
