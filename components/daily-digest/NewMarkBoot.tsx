import type { Post } from "@/content/posts";
import { bootScript, type PostDates } from "@/lib/daily-digest/new-mark";
import { NewMarkSync } from "@/components/daily-digest/NewMark";

/** Put before the first Digest card of a feed (home, /daily-digest). Inline boot script + the client sync. */
export function NewMarkBoot({ posts }: { posts: Post[] }) {
  const map: PostDates = Object.fromEntries(posts.map((p) => [p.slug, [p.date, p.updated?.date ?? ""]]));
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: bootScript(map) }} />
      <NewMarkSync posts={map} />
    </>
  );
}
