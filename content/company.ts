/**
 * Company pages copy (Product Copy, COPY.md v4 FINAL + "Split release notes" FINAL, Oct 3 2026). Verbatim; edit here only.
 * LOCKED 4-link version (CEO 9:43 AM ET): no /contact, no /terms, no Privacy "Questions" section. The release gate
 * (npm run test:release) fails on any bracket placeholder in rendered content, so nothing ships with one.
 * - [DATE] = the ship date: SHIP_DATE below (the ONE place to change it if the date slips).
 * Never invent a value for a placeholder.
 */

/** COPY.md [DATE]: the ship date, ISO YYYY-MM-DD. Change only this if the release date slips. */
export const SHIP_DATE = "2026-10-03";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** SHIP_DATE as shown ("October 3, 2026"); parsed by hand so the build's time zone can't shift the day. */
export function shipDateLabel(iso: string = SHIP_DATE): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const month = m ? MONTHS[Number(m[2]) - 1] : undefined;
  if (!m || !month || Number(m[3]) < 1 || Number(m[3]) > 31) throw new Error(`SHIP_DATE must be YYYY-MM-DD, got "${iso}"`);
  return `${month} ${Number(m[3])}, ${m[1]}`;
}

/** Company pages that have shipped, in sitemap order. /contact (needs the address) and /terms (needs the LLC) aren't built. */
export const COMPANY_PATHS: readonly string[] = ["/about", "/privacy"];

/** COPY.md §1: the board's mission, word for word. Home dek and the About dek. */
export const MISSION = "Alignata builds small, sharp tools that take busy work off people's plates, so they get their time back.";

/** Split release notes: "© 2026 Alignata", no tagline. */
export const FOOTER_LINE = "© 2026 Alignata";

/** LOCKED 4-link footer: Tools · Daily Digest · About · Privacy (Contact returns with its address; Terms with the LLC). */
export const FOOTER_LINKS: readonly { href: string; label: string; target: string }[] = [
  { href: "/apps", label: "Tools", target: "nav:footer-tools" },
  { href: "/daily-digest", label: "Daily Digest", target: "nav:footer-daily-digest" },
  { href: "/about", label: "About", target: "nav:footer-about" },
  { href: "/privacy", label: "Privacy", target: "nav:footer-privacy" },
];

/** COPY.md §3 /about. */
export const ABOUT = {
  title: "About Alignata",
  dek: MISSION,
  hero: {
    src: "/art/about-sticker.webp",
    // FINAL alt (Brand Creator PASS 9:34 AM ET Oct 3). Same file as mockups/art/about-toolbox-sticker.webp (webp only).
    alt: "A handsaw with a red handle resting on a pale wooden plank.",
    pad: "#C5C6FB",
  },
  sections: [
    {
      h2: "What we make",
      lines: [
        "Each tool does one job. One turns a Stripe payout file into an import for your books. Another turns Etsy orders into a LightBurn file.",
        "The tools run in your browser. There's no account to make.",
        "The Daily Digest explains one AI technique at a time, in plain English.",
      ],
    },
    {
      h2: "Your files",
      lines: [
        "When you drop a file into a tool, your browser does the work. The file isn't uploaded to us.",
        // "Privacy page" is rendered as an underlined body link to /privacy.
        "The site counts visits and taps without knowing who you are, and some tools send us counts like how many rows a file had. The Privacy page lists exactly what.",
      ],
    },
  ],
  builtBy: "Built by Osbel Morell.",
  pill: "See the tools",
} as const;

export type PrivacySection = { h2: string; paras: readonly string[] };

/** COPY.md §5 /privacy (v4 FINAL). No "Questions" section in the 4-link release (it returns with the Contact page). */
export const PRIVACY = {
  title: "Privacy",
  dek: "What Alignata collects, and what it doesn't.",
  /** COPY.md "Last updated [DATE]": rendered with SHIP_DATE in a <time>. */
  updatedPrefix: "Last updated",
  short: [
    "Files you drop into a tool stay in your browser. We don't upload them.",
    "We count visits and taps without your name, email or IP address.",
    "We don't set cookies, show ads, or sell data.",
  ],
  sections: [
    {
      h2: "Your files",
      paras: [
        "The tools read and process your files in your browser, on your device. The file, its name and its contents aren't sent to us.",
        "Engrave Merge sends us a few counts about each file: how many rows, how many items and how many problems it found. For a file with 3 or more orders, it also sends a scrambled code made from the order numbers. We use it only to tell different files apart.",
      ],
    },
    {
      // Paragraph 1 ends with COPY.md §5's ship-together line for the Engrave Merge price card (replaces "...and when you tap
      // "I'd pay"."), then the guide-ref line (FINAL 8:45 AM ET; CEO 9:13 AM ET: in, as the droppable ref commit).
      h2: "What we count",
      paras: [
        "We keep our own small log of how the site is used: which pages you visit, which tool you open and where on the site you tapped it, which articles you read, and which links you tap on the homepage. On Engrave Merge, we also count when the page opens, when you download or print a result, and whether you saw the price question and how you answered it. If one of our guides sent you, we also note which one, as part of those counts.",
        // Session ID fix, FINAL (Brand Creator PASS + Voice Gate pre-approved exact text, 9:32 AM ET Oct 3).
        "Each entry has a random ID. A visitor ID stays in your browser until you clear this site's data, and a session ID usually lasts only as long as the tab. Engrave Merge keeps its own random ID in your browser, like the visitor ID.",
        "Our log doesn't hold your name, email address, IP address, browser details, file names or file contents.",
        "We don't count automated browsers. Our own test visits are marked and left out of our numbers.",
        "Entries are deleted automatically after about 180 days (about 120 days for Engrave Merge).",
      ],
    },
    {
      h2: "Vercel Web Analytics",
      paras: [
        "We also use Vercel Web Analytics to count page views and see which sites send people here. Vercel says it uses no cookies and doesn't store your IP address. It records the page, the site you came from, your rough location and your type of device and browser.",
      ],
    },
    {
      h2: "What's saved in your browser",
      paras: [
        "Some tools keep your recent work in your browser's storage, so it's still there the next time you open the tool. It stays on your device and isn't sent to us. To remove it, use the tool's Clear button or clear this site's data in your browser settings.",
        // COPY.md §5 ship-together line (REPLACEMENT, FINAL 8:52 AM ET): ships with the Engrave Merge price card.
        "Engrave Merge also keeps a small note on this device: how many files you've dropped into it, which days it showed you the price question, and your answer if you gave one. That way it doesn't keep asking.",
      ],
    },
    {
      h2: "Services we use",
      paras: [
        "Vercel hosts the site, and Upstash stores our usage log. We don't store your IP address. Vercel processes it briefly to serve and protect the site, and keeps its request logs for about a day. Our fonts are hosted on our own site.",
      ],
    },
    {
      h2: "What we don't do",
      paras: [
        "There are no accounts, no ads and no ad trackers, and we don't set cookies. We don't sell data or share it for advertising. The site isn't meant for children under 13.",
      ],
    },
    {
      h2: "Changes",
      paras: [
        "If we change what we collect, for example when paid plans arrive, we'll update this page first and change the date at the top.",
      ],
    },
  ] as readonly PrivacySection[],
} as const;
