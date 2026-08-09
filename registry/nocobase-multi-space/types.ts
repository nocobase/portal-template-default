export type SpaceRecord = { name: string; title?: string; default?: boolean; description?: string; [key: string]: unknown };
export type SpaceUser = { id: string | number; nickname?: string; username?: string; email?: string };
export type SpaceState = { spaces: SpaceRecord[]; current: string[]; viewed: string[]; loading: boolean; switchSpace: (name: string) => Promise<void>; refresh: () => Promise<void> };
