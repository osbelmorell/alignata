import Link from "next/link";
import { type Guide, guidePath, publishedGuides } from "@/lib/guides/guides";

/**
 * Small "Guides" link block on a tool's story page: its published guides only. Renders nothing while none is
 * published, so drafts are never linked.
 */
export function GuidesLinks({ tool, guides }: { tool: string; guides: Guide[] }) {
  const list = publishedGuides(guides).filter((g) => g.tool === tool);
  if (!list.length) return null;
  return (
    <nav className="fx-guides" aria-label="Guides" data-guides={tool}>
      <h2>Guides</h2>
      <ul>
        {list.map((g) => (
          <li key={g.slug}>
            <Link className="fx-text-link" href={guidePath(g)}>
              {g.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
