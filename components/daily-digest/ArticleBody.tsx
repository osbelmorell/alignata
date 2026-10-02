import { Fragment } from "react";
import type { PostPullQuote } from "@/content/posts";
import {
  parseArticle,
  parseInline,
  parseSections,
  toPlainText,
  type ArticleSection,
} from "@/lib/daily-digest/blocks";

/** Inline text with safe Markdown links ("[label](https://…)", http(s) only). External links open in a new tab. */
function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((seg, i) =>
        seg.kind === "link" ? (
          <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer">
            {seg.text}
          </a>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
    </>
  );
}

const BYLINE_RE = /^—\s/;

/**
 * Article body (SPEC §8): 680px column, H2 sections, "01." numbered lists. The copy is rendered exactly as written
 * in content/posts.ts. A pull quote (verbatim line from the body, checked by the tests) is shown after the paragraph
 * that contains it; it repeats text already in the body, so it is hidden from screen readers.
 */
export function ArticleBody({
  paragraphs = [],
  sections,
  pullQuote,
}: {
  paragraphs?: string[];
  sections?: ArticleSection[];
  pullQuote?: PostPullQuote;
}) {
  const blocks = [...parseArticle(paragraphs), ...(sections ? parseSections(sections) : [])];
  const quoteAt = pullQuote
    ? blocks.findIndex((b) => b.kind === "paragraph" && toPlainText(b.text).includes(pullQuote.text))
    : -1;
  const lastIndex = blocks.length - 1;

  return (
    <div className="fx-prose">
      {blocks.map((block, i) => {
        let el: React.ReactNode;
        switch (block.kind) {
          case "heading":
            el =
              block.level === 3 ? (
                <h3>
                  <InlineText text={block.text} />
                </h3>
              ) : (
                <h2>
                  <InlineText text={block.text} />
                </h2>
              );
            break;
          case "ul":
            el = (
              <ul>
                {block.items.map((item, j) => (
                  <li key={j}>
                    <InlineText text={item} />
                  </li>
                ))}
              </ul>
            );
            break;
          case "ol":
            el = (
              <ol start={block.start} style={{ counterReset: `fx-ol ${block.start - 1}` }}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    <InlineText text={item} />
                  </li>
                ))}
              </ol>
            );
            break;
          case "rule":
            el = <hr />;
            break;
          default:
            el = (
              <p className={i === lastIndex && BYLINE_RE.test(block.text) ? "fx-byline" : undefined}>
                <InlineText text={block.text} />
              </p>
            );
        }
        return (
          <Fragment key={i}>
            {el}
            {i === quoteAt && pullQuote ? (
              <figure className="fx-pullquote" data-pullquote aria-hidden="true">
                <blockquote>
                  <p>{pullQuote.text}</p>
                </blockquote>
                {pullQuote.cite ? <figcaption className="fx-meta">{pullQuote.cite}</figcaption> : null}
              </figure>
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}
