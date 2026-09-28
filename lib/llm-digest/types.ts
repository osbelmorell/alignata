export type DigestLink = {
  label: string;
  url: string;
};

export type DigestResult = "WORKS" | "MIXED" | "FAILS";

export type DigestTechnique = {
  id?: string;
  title: string;
  teaser?: string;
  /** 1 = try first that day; sort ascending in UI */
  rank?: 1 | 2 | 3;
  /** Priority is separate from outcome — show both when present */
  result?: DigestResult;
  /** One-line plain-English benefit under the title */
  outcome?: string;
  /** Plain editorial WHAT/WHY — primary card body */
  whatWhy: string;
  /** Evidence / metrics — collapsed by default in the UI */
  howTested?: string;
};

export type DigestPost = {
  slug: string;
  title: string;
  publishedAt: string;
  summary: string;
  tags: string[];
  sources: DigestLink[];
  links: DigestLink[];
  bodyMarkdown: string;
  techniques?: DigestTechnique[];
};

export type DigestPostMeta = Omit<DigestPost, "bodyMarkdown">;
