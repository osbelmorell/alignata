import fs from "fs";
import path from "path";
import type { DigestPost, DigestPostMeta } from "@/lib/llm-digest/types";

const POSTS_DIR = path.join(process.cwd(), "content/llm-digest/posts");

function readAll(): DigestPost[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".json"));
  const posts: DigestPost[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
    const parsed = JSON.parse(raw) as DigestPost;
    if (!parsed.slug || !parsed.publishedAt) continue;
    posts.push(parsed);
  }
  posts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  return posts;
}

export function listDigestPosts(): DigestPost[] {
  return readAll();
}

export function listDigestMeta(): DigestPostMeta[] {
  return readAll().map(({ bodyMarkdown: _b, ...meta }) => meta);
}

export function getDigestPost(slug: string): DigestPost | null {
  return readAll().find((p) => p.slug === slug) ?? null;
}
