import type { Post } from "@/content/posts";
import { AUTHOR_BIO, ESSAY_BYLINE, TECHNIQUE_BYLINE } from "@/lib/daily-digest/author";
import { postKind } from "@/lib/daily-digest/meta";

/** Article byline, under the title and dek (no photo). Essays: name + one-line bio. Techniques: edited-by line. */
export function Byline({ post }: { post: Post }) {
  if (postKind(post) === "essay") {
    return (
      <div className="fx-author" data-byline="essay">
        <p className="fx-author-name">{ESSAY_BYLINE}</p>
        <p className="fx-author-bio">{AUTHOR_BIO}</p>
      </div>
    );
  }
  return (
    <div className="fx-author" data-byline="technique">
      <p className="fx-author-name">{TECHNIQUE_BYLINE}</p>
    </div>
  );
}
