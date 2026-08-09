// Plain data/logic, deliberately NOT in ClientSidebar.tsx (a "use client"
// module) — a Server Component needs to call isClientTab() directly (to
// validate the ?tab= search param), and functions exported from a "use
// client" file can only be rendered as components or passed as props, never
// invoked from the server.
export const CLIENT_TABS = ["overview", "allocation", "wrappers", "properties", "scenarios", "goal"] as const;

export type ClientTab = (typeof CLIENT_TABS)[number];

export function isClientTab(value: string): value is ClientTab {
  return (CLIENT_TABS as readonly string[]).includes(value);
}
