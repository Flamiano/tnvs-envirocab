// app/utils/registeredUsers.ts
// ─────────────────────────────────────────────────────────────────────────────
// All types, constants, and API helper functions for the RegisteredUsers page.
// Import from here — never duplicate these in the component file.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisteredUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
}

export type BanDuration = "1h" | "24h" | "168h" | "720h" | "2160h" | "876000h";
export interface ActionResult {
  success: boolean;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const API = "/api/admin/users";

export const ADMIN_ID = "d0306e9f-f24a-42f0-80c3-ad482d52b071";

export const BAN_DURATION_OPTIONS: { label: string; value: BanDuration }[] = [
  { label: "1 Hour", value: "1h" },
  { label: "24 Hours", value: "24h" },
  { label: "7 Days", value: "168h" },
  { label: "30 Days", value: "720h" },
  { label: "90 Days", value: "2160h" },
  { label: "Permanent", value: "876000h" },
];

// ─── API Helpers ──────────────────────────────────────────────────────────────

export async function fetchRegisteredUsers(): Promise<RegisteredUser[]> {
  const res = await fetch(API, { method: "GET" });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error ?? "Failed to fetch registered users");
  return data.users as RegisteredUser[];
}

async function postAction(
  action: string,
  userId: string,
  extra?: Record<string, unknown>
): Promise<ActionResult> {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, userId, ...extra }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error ?? "Action failed" };
  return { success: true };
}

export const banUser = (userId: string, duration: BanDuration = "876000h") =>
  postAction("ban", userId, { duration });
export const unbanUser = (userId: string) => postAction("unban", userId);
export const deleteUser = (userId: string) => postAction("delete", userId);
export const resetUserPassword = (userId: string) =>
  postAction("reset_password", userId);

export async function createUser(payload: {
  email: string;
  full_name: string;
  mode: "invite" | "password";
  password?: string;
}): Promise<{
  success: boolean;
  error?: string;
  user?: RegisteredUser;
  mode?: string;
}> {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_user", ...payload }),
  });
  const data = await res.json();
  if (!res.ok)
    return { success: false, error: data.error ?? "Failed to create user" };
  return { success: true, user: data.user, mode: data.mode };
}

// ─── Utils ────────────────────────────────────────────────────────────────────

export function isCurrentlyBanned(u: RegisteredUser): boolean {
  return !!u.banned_until && new Date(u.banned_until) > new Date();
}

export function banExpiryLabel(u: RegisteredUser): string {
  if (!u.banned_until) return "";
  const d = new Date(u.banned_until);
  if (d.getFullYear() > new Date().getFullYear() + 50) return "Permanent";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getInitials(name: string | null, email: string): string {
  if (name) {
    const p = name.trim().split(" ");
    return p.length >= 2
      ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
      : p[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-700",
];

export function getAvatarColor(id: string): string {
  return AVATAR_COLORS[
    id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  ];
}

// ─── Password Rules ───────────────────────────────────────────────────────────

export const PW_RULES = [
  {
    id: "len",
    label: "At least 8 characters",
    test: (v: string) => v.length >= 8,
  },
  {
    id: "upper",
    label: "One uppercase letter (A–Z)",
    test: (v: string) => /[A-Z]/.test(v),
  },
  {
    id: "number",
    label: "One number (0–9)",
    test: (v: string) => /[0-9]/.test(v),
  },
  {
    id: "special",
    label: "One special character (!@#…)",
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
];

export function passwordScore(pw: string): number {
  return PW_RULES.filter((r) => r.test(pw)).length; // 0–4
}

export const SCORE_META: Record<
  number,
  { label: string; bar: string; text: string }
> = {
  0: { label: "", bar: "bg-slate-200 dark:bg-slate-700", text: "" },
  1: { label: "Weak", bar: "bg-rose-500", text: "text-rose-500" },
  2: { label: "Fair", bar: "bg-amber-400", text: "text-amber-500" },
  3: { label: "Good", bar: "bg-sky-500", text: "text-sky-500" },
  4: { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-500" },
};
