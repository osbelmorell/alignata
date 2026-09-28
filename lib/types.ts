export type AppStatus = "live" | "wip" | "planned";

export type HubApp = {
  id: string;
  name: string;
  url: string;
  blurb: string;
  status: AppStatus | string;
  pitch?: string;
  what?: string;
  why?: string;
  how?: string[];
};

export type AppsCatalog = {
  apps: HubApp[];
};
