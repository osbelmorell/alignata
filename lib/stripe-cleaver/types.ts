export type CleaverTarget = "quickbooks" | "xero";

export type CleaverRow = {
  date: string;
  description: string;
  amount: number;
  payee?: string;
  reference?: string;
};

export type CleaverResult = {
  target: CleaverTarget;
  rows: CleaverRow[];
  sourceLabel: string;
};
