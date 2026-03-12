// app/api/admin/users/route.ts
//
// SETUP — add to .env.local:
//   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
//   NEXT_PUBLIC_SITE_URL=http://localhost:3000

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET: list all auth users, excluding admin_accounts ────────────────────────
export async function GET() {
  const {
    data: { users },
    error,
  } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: adminRows } = await supabaseAdmin
    .from("admin_accounts")
    .select("id");
  const adminIds = new Set((adminRows ?? []).map((r: { id: string }) => r.id));

  const filtered = users
    .filter((u) => !adminIds.has(u.id))
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      full_name:
        (u.user_metadata?.full_name as string) ||
        (u.user_metadata?.name as string) ||
        null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
      banned_until:
        ((u as unknown as Record<string, unknown>).banned_until as
          | string
          | null) ?? null,
    }));

  filtered.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return NextResponse.json({ users: filtered });
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    action: string;
    userId?: string;
    duration?: string;
    email?: string;
    full_name?: string;
    mode?: "invite" | "password";
    password?: string;
  };
  const { action } = body;

  if (!action)
    return NextResponse.json({ error: "Missing action" }, { status: 400 });

  // ── Create User ─────────────────────────────────────────────────────────────
  if (action === "create_user") {
    const { email, full_name, mode, password } = body;
    if (!email)
      return NextResponse.json({ error: "Email is required" }, { status: 400 });

    if (mode === "password") {
      if (!password)
        return NextResponse.json(
          { error: "Password is required" },
          { status: 400 }
        );

      // Create user with password — mark email as already confirmed so they're instantly Verified
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // instantly verified, no email needed
        user_metadata: full_name ? { full_name } : {},
      });
      if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });

      const u = data.user;
      return NextResponse.json({
        success: true,
        mode: "password",
        user: {
          id: u.id,
          email: u.email ?? "",
          full_name: (u.user_metadata?.full_name as string) || null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          email_confirmed_at: u.email_confirmed_at ?? null,
          banned_until: null,
        },
      });
    } else {
      // Invite mode — sends Supabase confirmation email; user stays Unverified until clicked
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          data: full_name ? { full_name } : {},
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        }
      );
      if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });

      const u = data.user;
      return NextResponse.json({
        success: true,
        mode: "invite",
        user: {
          id: u.id,
          email: u.email ?? "",
          full_name: (u.user_metadata?.full_name as string) || null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          email_confirmed_at: u.email_confirmed_at ?? null, // will be null until clicked
          banned_until: null,
        },
      });
    }
  }

  // All other actions require userId
  const { userId, duration } = body;
  if (!userId)
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  // Safety guard — never touch an admin account
  const { data: adminRow } = await supabaseAdmin
    .from("admin_accounts")
    .select("id")
    .eq("id", userId)
    .single();
  if (adminRow)
    return NextResponse.json(
      { error: "Cannot perform actions on admin accounts" },
      { status: 403 }
    );

  switch (action) {
    case "ban": {
      const banDuration = duration ?? "876000h";
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: banDuration,
      } as Parameters<typeof supabaseAdmin.auth.admin.updateUserById>[1]);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    case "unban": {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      } as Parameters<typeof supabaseAdmin.auth.admin.updateUserById>[1]);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    case "delete": {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
  