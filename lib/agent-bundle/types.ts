export type Bundle = {
  id: string;
  name: string;
  prompt_ref: string;
  model_id: string;
  tools_note: string;
  env: string; // e.g. staging|prod or free-text
  marked_live: boolean;
  created_at: string; // ISO
};

export type Store = {
  bundles: Bundle[];
  updatedAt: string;
  seeded?: boolean;
};

export type DiffFieldKey = Exclude<keyof Bundle, "id" | "created_at">;

export type FieldDiff = {
  key: DiffFieldKey | "created_at";
  label: string;
  before: string;
  after: string;
  changed: boolean;
};
