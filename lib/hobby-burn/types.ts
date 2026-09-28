export type ProjectBurn = {
  project: string;
  deploys: number;
  /** Optional bandwidth / GB-hours from export */
  gbHours?: number;
};

export type DigestRow = {
  project: string;
  deploys: number;
  gbHours: number;
  share: number; // 0–1 of total deploys
  isTop: boolean;
};

export type Digest = {
  id: string;
  createdAt: string;
  label: string;
  rows: DigestRow[];
  totalDeploys: number;
  totalGbHours: number;
  oneLiner: string;
};

export type Store = {
  rows: ProjectBurn[];
  digests: Digest[];
  lastPaste: string;
  updatedAt: string;
};
