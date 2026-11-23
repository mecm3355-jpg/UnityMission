export const APP_ROUTES = [
  "/",
  "/dashboard",
  "/mission/[id]",
  "/mission/[id]/play",
  "/mission/[id]/result",
  "/badges",
  "/certificate",
] as const;

export type AppRoute = (typeof APP_ROUTES)[number];

export function missionRoute(id: string) {
  return `/mission/${id}` as const;
}
