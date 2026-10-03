import { ORIENTATION as SCORECARD } from "@/lib/scorecard/orientation";

/**
 * Each tool's About text (pitch, then What / Why / How), in one server-safe module so the tool's own AboutPanel and its
 * story page at /apps/<slug> (SPEC v2 §4: "Tool stories use the tool's existing About text ... with no new long copy")
 * show exactly the same words. Moved here verbatim from components/<tool>/AboutPanel.tsx; the only edits are the
 * COPY.md About fixes (CEO, 8:15 PM ET Oct 2): Cleaver How 2 + Why, License Gate How 2.
 * Scorecard reuses its ORIENTATION. Engrave Merge has no AboutPanel, so lib/apps.ts toolAbout() uses its public/apps.json
 * entry (kept out of this file so the tools' client bundles never pull in the whole catalog).
 * Deploy Decision Card has no story page (CEO, 7:40 PM ET Oct 2), so it is not listed.
 */
export type ToolAbout = { pitch: string; what: string; why: string; how: string[] };

export const TOOL_ABOUT: Record<string, ToolAbout> = {
  "stripe-cleaver": {
    pitch:
      "Drop your Stripe payout file and download a sheet ready for QuickBooks or Xero — no retyping rows by hand.",
    what:
      "Payout exports don’t match what books apps want. People retype or fight columns every payout cycle.",
    why:
      "One drop, one download. Cut the busywork between Stripe and your books. Stays in this browser.",
    how: [
      "Drop or choose your Stripe payout file.",
      'Tap "Run the cleaver".',
      "Download the books-ready file.",
      "Open it in QuickBooks or Xero.",
    ],
  },
  "license-gate": {
    pitch:
      "Drop your project lockfile and get a clear pass or fail, plus any copyleft hits you need to review — download the list when you want it.",
    what:
      "License risk hides in dependency trees. People only find copyleft surprises late, when a deal or release is already on the clock.",
    why:
      "One drop → pass or fail, with the risky licenses listed. Cut the scavenger hunt before you ship. Stays in this browser.",
    how: [
      "Drop or choose your lockfile.",
      'Tap "Run the check".',
      "Read pass or fail and any copyleft hits.",
      "Download the list if you need it in a thread.",
    ],
  },
  "agent-bundle-tag": {
    pitch:
      "Save what an agent is running — name, prompt, model, tools, environment — and compare any two versions.",
    what:
      "Prompt, model, tools, and environment change with no paper trail. Hard to tell what “live” means versus last week’s draft.",
    why:
      "Tag what’s running before you mark it live, then see which fields moved between two saves. Stays in this browser.",
    how: [
      "Register: name, prompt, model; optional environment, tools note, mark live.",
      "Save, then open History.",
      "Compare the latest two, or pick any pair.",
      "Copy a save or the diff when you need it in a thread.",
    ],
  },
  "agent-eval-go-no-go": {
    pitch:
      "Walk a short checklist and get a clear go or no-go on whether an agent is ready to ship.",
    what:
      "\u201cIs this agent ready?\u201d used to be a gut call. There\u2019s no shared list of what must pass before you ship.",
    why:
      "Score each must-have item. You only get go when every required item passes or doesn\u2019t apply. Any fail = no-go. Stays in this browser.",
    how: [
      "Name the agent and the date.",
      "Score each checklist item: Pass, Fail, or Doesn\u2019t apply. Add a note if you need one.",
      "Watch the badge flip to Go or No-go as you finish the required items.",
      "Load a sample pass or fail to see a finished example.",
      "Save, then copy for a thread.",
      "Open a recent save to restore; Clear resets the form.",
    ],
  },
  "llm-feature-cost-tag": {
    pitch:
      "See which product feature is burning the AI bill, day by day — and get a heads-up when one feature eats most of the spend.",
    what:
      "The bill shows up as one total. You can’t tell which feature is driving it until it’s already out of hand.",
    why:
      "Spot a heavy feature early (alert when one takes 40% or more of cost). Stays in this browser — no accounts.",
    how: [
      "Open the app, or Load sample to see a week with an alert.",
      "Upload a file or paste your spend rows, then tap Show the bill by feature.",
      "Each row needs a feature name and a cost in dollars (date, tokens, and model are optional).",
      "Read the totals and the daily table by feature.",
      "Alert means that feature is 40% or more of spend — dig in or cut.",
      "Clear wipes the local data when you’re done testing.",
    ],
  },
  "hobby-deploy-burn-digest": {
    pitch:
      "Paste this week’s usage list (or type counts) and see which project burned the free deploy window — plus a one-liner ready for chat.",
    what:
      "Free deploy quotas get chewed by whichever project redeploys the most. The usage file doesn’t shout the top burner at you.",
    why:
      "Know which project burned the window this week, with a one-liner you can drop in chat without rebuilding a spreadsheet. Stays in this browser.",
    how: [
      "Open the app (sample projects load first) or paste your usage list.",
      "Tap Show which projects used the quota, or upload the file. Columns are flexible: project name, deploy count, optional hours.",
      "Or add a row by hand: project name, deploys, optional hours.",
      "Read the table (top burner highlighted) and the weekly one-liner.",
      "Copy the one-liner or save the digest.",
      "Open a recent digest to restore; Clear resets.",
    ],
  },
  "what-changed-card": {
    pitch:
      "Build one card of what moved — deploys, settings, flags, upstreams — then mark go, hold, or verify. Copy it into a thread when you need it.",
    what:
      "During a scare, \u201cwhat changed?\u201d is scattered across deploys, settings, flags, and upstream status. Nobody wants to assemble that from scratch under pressure.",
    why:
      "One pasteable card: what moved, in what window, and the current go / hold / verify call. Stays in this browser.",
    how: [
      "Pick how you\u2019ll enter changes: sample events, before/after settings, or a checklist.",
      "Name the service and the time window.",
      "Mark which kinds of change are in play (deploys, settings, flags, upstreams). Add short notes if you use the checklist.",
      "For settings mode, paste the before and after into the two boxes.",
      "Generate the card — read what moved and the decision badge.",
      "Copy for a thread, or open a recent card to restore.",
    ],
  },
  "enterprise-scorecard": SCORECARD,
};
