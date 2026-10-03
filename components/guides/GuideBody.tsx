import Link from "next/link";
import { parseGuideBody, parseInlineMd } from "@/lib/guides/markdown";

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInlineMd(text).map((s, i) => {
        if (s.kind === "strong") return <strong key={i}>{s.text}</strong>;
        if (s.kind === "code") return <code key={i}>{s.text}</code>;
        if (s.kind === "link") {
          if (s.href.startsWith("https://")) return <a key={i} href={s.href} rel="noopener">{s.text}</a>;
          // Files (the sample CSV) are plain downloads; guide-to-guide links are client-side.
          if (/\.[a-z0-9]+$/i.test(s.href)) return <a key={i} href={s.href} download>{s.text}</a>;
          return <Link key={i} href={s.href}>{s.text}</Link>;
        }
        return <span key={i}>{s.text}</span>;
      })}
    </>
  );
}

/** A guide's Markdown body in the Digest article prose styles (.fx-prose, 680 column). */
export function GuideBody({ body }: { body: string }) {
  return (
    <div className="fx-prose">
      {parseGuideBody(body).map((b, i) => {
        if (b.kind === "h2") return <h2 key={i}>{b.text}</h2>;
        if (b.kind === "ul")
          return (
            <ul key={i}>
              {b.items.map((t, j) => (
                <li key={j}><Inline text={t} /></li>
              ))}
            </ul>
          );
        if (b.kind === "ol")
          return (
            <ol key={i} start={b.start} style={{ counterReset: `fx-ol ${b.start - 1}` }}>
              {b.items.map((t, j) => (
                <li key={j}><Inline text={t} /></li>
              ))}
            </ol>
          );
        return <p key={i}><Inline text={b.text} /></p>;
      })}
    </div>
  );
}
