export interface Settings {
  includeShipped: boolean;
  includeFlagged: boolean;
  splitLines: boolean;
  lineColumns: number;
  charLimit: number;
  stripNumbers: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  includeShipped: false,
  includeFlagged: false,
  splitLines: true,
  lineColumns: 6,
  charLimit: 40,
  stripNumbers: true,
};

export interface ListingRecipe {
  itemName?: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  textFields?: string[];
  requiresPersonalization?: boolean | null;
  charLimit?: number | null;
}

export interface Recipe {
  tool: "engrave-merge";
  recipeVersion: 1;
  savedAt?: string;
  settings?: Partial<Settings>;
  extraLabels?: string[];
  listings?: Record<string, ListingRecipe>;
}

export type ProblemCode =
  | "UNREADABLE_OPTIONS"
  | "BAD_QUANTITY"
  | "DUPLICATE"
  | "BLANK_TEXT"
  | "TOO_LONG"
  | "TOO_MANY_LINES"
  | "EMOJI"
  | "MISSING_GLYPH";

export interface CutItem {
  item: string;
  lid: string;
  order: string;
  fn: string;
  qty: number;
  pairs: { label: string; value: string; isText: boolean }[];
  raw: string;
  ok: boolean;
  flags: string[];
  text: string;
  rows: string;
}

export interface Stats {
  row_count: number;
  item_count: number;
  exception_count: number;
  merge_row_count: number;
  hidden_shipped: number;
  order_count: number;
}

export interface ProcessOk {
  error?: undefined;
  mergeHeader: string[];
  mergeRows: string[][];
  excRows: string[][];
  cut: CutItem[];
  stats: Stats;
  /** Unique trimmed non-blank Order IDs over ALL rows, sorted as strings (fingerprint input). */
  orderIds: string[];
  /** Listing ID → { itemName, labels seen } for the Item settings UI. */
  listings: { lid: string; itemName: string; labels: string[] }[];
  garbled: boolean;
}

export interface ProcessError {
  error: "WRONG_FILE";
  missing: string[];
  soldOrdersFile: boolean;
}

export type ProcessResult = ProcessOk | ProcessError;
