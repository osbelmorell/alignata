import type { ProjectBurn } from "./types";

/** Fake Hobby week — api dominates deploys so the one-liner demos well */
export const SAMPLE_ROWS: ProjectBurn[] = [
  { project: "api", deploys: 48, gbHours: 12.4 },
  { project: "web", deploys: 17, gbHours: 8.1 },
  { project: "docs", deploys: 6, gbHours: 1.2 },
  { project: "admin", deploys: 4, gbHours: 2.0 },
  { project: "marketing", deploys: 2, gbHours: 0.5 },
];

export const SAMPLE_CSV = `project,builds,gb_hours
api,48,12.4
web,17,8.1
docs,6,1.2
admin,4,2.0
marketing,2,0.5
`;
