import { Fragment } from "react";
import {
  parseArticle,
  parseInline,
  parseSections,
  type ArticleSection,
} from "@/lib/daily-digest/blocks";

/**
 * Inline text with safe Markdown links ("[label](https://…)", http(s) only).
 * External links open in a new tab. Olive-deep text on the warm paper keeps
 * strong contrast on phone; the clay underline marks it as a link.
 */
function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((seg, i) =>
        seg.kind === "link" ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--cb-olive-deep)] underline decoration-[var(--cb-clay-deep)] decoration-[1.5px] underline-offset-[3px] transition-colors hover:text-[var(--cb-ink)] hover:decoration-[var(--cb-olive-deep)] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-olive)]"
          >
            {seg.text}
          </a>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * Clay Board article body — phone-first. Olive-deep headings with a small
 * clay rule, ink body on warm paper, clay/olive list markers. No blue/purple.
 */
export function ArticleBody({
  paragraphs = [],
  sections,
}: {
  paragraphs?: string[];
  sections?: ArticleSection[];
}) {
  const blocks = [
    ...parseArticle(paragraphs),
    ...(sections ? parseSections(sections) : []),
  ];

  return (
    <div
      className="cb-article space-y-5 px-5 py-6 text-[16px] leading-[1.7] sm:px-8 sm:py-8 sm:text-[17px]"
      style={{
        background: "#fffcf7",
        color: "var(--cb-ink)",
        borderRadius: "var(--cb-radius-squircle)",
        border: "1px solid var(--cb-line)",
        boxShadow: "var(--cb-shadow)",
        overflowWrap: "anywhere",
      }}
    >
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "heading":
            if (block.level === 3) {
              return (
                <h3
                  key={i}
                  className="text-[17px] font-semibold leading-[1.35] tracking-tight sm:text-[18px]"
                  style={{
                    color: "var(--cb-olive)",
                    paddingTop: i === 0 ? 0 : "0.25rem",
                  }}
                >
                  <InlineText text={block.text} />
                </h3>
              );
            }
            return (
              <h2
                key={i}
                className="flex items-center gap-2.5 text-[20px] font-semibold leading-[1.3] tracking-tight sm:text-[22px]"
                style={{
                  color: "var(--cb-olive-deep)",
                  paddingTop: i === 0 ? 0 : "0.75rem",
                }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-[3px] w-5 shrink-0 rounded-full"
                  style={{ background: "var(--cb-clay-deep)" }}
                />
                <InlineText text={block.text} />
              </h2>
            );
          case "ul":
            return (
              <ul
                key={i}
                className="list-disc space-y-2 pl-5 marker:text-[var(--cb-clay-deep)]"
              >
                {block.items.map((item, j) => (
                  <li key={j} className="pl-1">
                    <InlineText text={item} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol
                key={i}
                start={block.start}
                className="list-decimal space-y-2 pl-6 marker:font-semibold marker:text-[var(--cb-olive)]"
              >
                {block.items.map((item, j) => (
                  <li key={j} className="pl-1">
                    <InlineText text={item} />
                  </li>
                ))}
              </ol>
            );
          case "rule":
            return (
              <hr
                key={i}
                className="mx-auto my-8 w-16 border-0 border-t-2"
                style={{ borderColor: "var(--cb-line)" }}
              />
            );
          default:
            return <p key={i}><InlineText text={block.text} /></p>;
        }
      })}
    </div>
  );
}
