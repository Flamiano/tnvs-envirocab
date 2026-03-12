// app/utils/useAuthSession.ts
"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/app/utils/supabase";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

export function useAuthSession() {
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin");
  const [initials, setInitials] = useState("AD");
  const router = useRouter();

  // Stable ref: createClient() called only once — avoids AbortError from
  // re-instantiating the Supabase client while a fetch is in flight.
  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;

  const getInitials = (name: string): string => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async (): Promise<void> => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (!session) {
          router.replace("/login");
          return;
        }

        const targetEmail = "tnvsdmnstrtv@gmail.com";
        if (session.user.email !== targetEmail) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        const { data } = await supabase
          .from("admin_accounts")
          .select("display_name")
          .eq("email", targetEmail)
          .single();

        if (cancelled) return;

        if (data?.display_name) {
          setAdminName(data.display_name);
          setInitials(getInitials(data.display_name));
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Session check error:", err);
        router.replace("/login");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkSession();

    return () => {
      cancelled = true; // Discard results if component unmounts mid-request
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — supabase ref and router are both stable

  return { loading, adminName, initials, handleSignOut };
}
