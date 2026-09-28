export type BooksPreset = "quickbooks" | "xero";

export type StripeTxn = {
  date: string;
  description: string;
  type: string;
  currency: string;
  amount: number;
  fee: number;
  net: number;
};

export type BooksRow = {
  date: string;
  description: string;
  amount: number;
  kind: "payout" | "fee" | "other";
};

export type CleaveResult = {
  preset: BooksPreset;
  rows: BooksRow[];
  sourceCount: number;
  strippedCount: number;
  feeCount: number;
  csv: string;
};
