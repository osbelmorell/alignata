export type HubAppStatus = "live" | "stub";

export type HubApp = {
  id: string;
  name: string;
  url: string;
  blurb: string;
  status: HubAppStatus;
  pitch?: string;
  what?: string;
  why?: string;
  how?: string[];
};

export type AppsCatalog = {
  apps: HubApp[];
};
