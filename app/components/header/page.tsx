"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthSession } from "@/app/utils/useAuthSession";
import toast, { Toaster } from "react-hot-toast";
import { createClient } from "@/app/utils/supabase";
import {
  Search, Bell, MessageSquare, ChevronDown, Moon, Sun,
  User, LogOut, Loader2, ChevronsLeft, AlignLeft,
  Car, Users, FileText, UserPlus, ShieldCheck, Settings,
  Check, Clock, X, ArrowRight, Send,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface AdminMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string | null;
  content: string;
  created_at: string;
}

interface Notification {
  id: string;
  type: "visitor" | "gatepass" | "vehicle" | "contract" | "employee";
  title: string;
  desc: string;
  time: string;
  read: boolean;
  icon: React.ElementType;
  color: string;
}

interface SearchResult {
  id: string;
  category: string;
  label: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  action?: string;
}

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  /** Optional: called when user selects a search result to navigate */
  onNavigate?: (section: string) => void;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

/** Animated badge counter */
function Badge({ count, color = "bg-sky-500" }: { count: number; color?: string }) {
  if (count === 0) return null;
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] ${color} text-[9px] font-black text-white flex items-center justify-center rounded-full border-2 border-white dark:border-[#0f172a] px-0.5 tabular-nums`}
    >
      {count > 99 ? "99+" : count}
    </motion.span>
  );
}

/** Icon button wrapper */
function IconBtn({
  children, onClick, active, title,
}: { children: React.ReactNode; onClick?: () => void; active?: boolean; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`relative p-2 md:p-2.5 rounded-xl transition-all focus:outline-none ${active
          ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
        }`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────
// MESSAGES PANEL
// ─────────────────────────────────────────────

function MessagesPanel({ currentAdminId, onClose }: { currentAdminId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const sb = createClient();
    // Get conversations this admin is a member of
    const { data: memberRows } = await sb
      .from("admin_conversation_members")
      .select("conversation_id")
      .eq("admin_id", currentAdminId)
      .limit(20);

    if (!memberRows?.length) { setLoading(false); return; }

    const convIds = memberRows.map((r: any) => r.conversation_id);
    const { data } = await sb
      .from("admin_messages")
      .select("id, conversation_id, sender_id, sender_name, content, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(30);

    setMessages((data ?? []) as AdminMessage[]);
    setLoading(false);
  }, [currentAdminId]);

  useEffect(() => {
    load();
    const sb = createClient();
    const sub = sb
      .channel("header-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_messages" },
        (payload) => {
          const m = payload.new as AdminMessage;
          setMessages(prev => [m, ...prev]);
        })
      .subscribe();
    return () => { sb.removeChannel(sub); };
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMsg.trim() || sending) return;
    setSending(true);
    try {
      const sb = createClient();
      // Find or create a general broadcast conversation
      let { data: convRows } = await sb
        .from("admin_conversations")
        .select("id")
        .eq("created_by", currentAdminId)
        .limit(1);

      let convId: string;
      if (convRows?.length) {
        convId = convRows[0].id;
      } else {
        const { data: newConv } = await sb
          .from("admin_conversations")
          .insert({ created_by: currentAdminId })
          .select("id")
          .single();
        convId = newConv?.id;
        // Add self as member
        await sb.from("admin_conversation_members").insert({ conversation_id: convId, admin_id: currentAdminId });
      }

      await sb.from("admin_messages").insert({
        conversation_id: convId,
        sender_id: currentAdminId,
        content: newMsg.trim(),
      });
      setNewMsg("");
      setComposing(false);
    } catch (e) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const myMessages = messages.filter(m => m.sender_id === currentAdminId);
  const fromOthers = messages.filter(m => m.sender_id !== currentAdminId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[200]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-sky-500" />
          <span className="text-sm font-black text-slate-900 dark:text-white">Messages</span>
          {fromOthers.length > 0 && (
            <span className="text-[9px] font-black bg-sky-500 text-white px-1.5 py-0.5 rounded-full">
              {fromOthers.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setComposing(v => !v)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-sky-500 transition-all">
            <Send size={13} />
          </button>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-all">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Compose */}
      <AnimatePresence>
        {composing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            <div className="p-3 space-y-2">
              <textarea
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Write a message to all admins…"
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setComposing(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all">
                  Cancel
                </button>
                <button onClick={handleSend} disabled={!newMsg.trim() || sending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white rounded-lg transition-all">
                  {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message list */}
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-slate-300" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <MessageSquare size={24} className="text-slate-200 dark:text-slate-700" />
            <p className="text-xs text-slate-400 dark:text-slate-500">No messages yet</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === currentAdminId;
            return (
              <div key={msg.id} className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isMe ? "opacity-70" : ""}`}>
                <div className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${isMe ? "bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400" : "bg-gradient-to-br from-violet-400 to-violet-600 text-white"
                    }`}>
                    {(msg.sender_name ?? "A")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-slate-900 dark:text-white truncate">
                        {isMe ? "You" : (msg.sender_name ?? "Admin")}
                      </span>
                      <span className="text-[9px] text-slate-400 shrink-0">{timeAgo(msg.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                      {msg.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
        <button className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline">
          Open full inbox <ArrowRight size={11} />
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// NOTIFICATIONS PANEL
// ─────────────────────────────────────────────

function NotificationsPanel({ notifications, onRead, onClearAll, onClose }: {
  notifications: Notification[];
  onRead: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}) {
  const unread = notifications.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[200]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-amber-500" />
          <span className="text-sm font-black text-slate-900 dark:text-white">Notifications</span>
          {unread > 0 && (
            <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full">{unread}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button onClick={onClearAll}
              className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline px-2 py-1">
              Mark all read
            </button>
          )}
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-all">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Bell size={24} className="text-slate-200 dark:text-slate-700" />
            <p className="text-xs text-slate-400 dark:text-slate-500">All caught up!</p>
          </div>
        ) : (
          notifications.map(n => {
            const Icon = n.icon;
            return (
              <div key={n.id}
                onClick={() => onRead(n.id)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!n.read ? "bg-sky-50/40 dark:bg-sky-500/5" : ""}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.color}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-bold truncate ${!n.read ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}>
                      {n.title}
                    </p>
                    <span className="text-[9px] text-slate-400 shrink-0">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                    {n.desc}
                  </p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                )}
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// SEARCH PANEL
// ─────────────────────────────────────────────

function SearchPanel({ query, results, loading, onSelect, onClose }: {
  query: string;
  results: SearchResult[];
  loading: boolean;
  onSelect: (r: SearchResult) => void;
  onClose: () => void;
}) {
  if (!query.trim() && results.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.15 }}
      className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[200]"
    >
      {loading ? (
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 size={16} className="animate-spin text-slate-300" />
          <span className="text-xs text-slate-400">Searching…</span>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center py-6 gap-1">
          <Search size={20} className="text-slate-200 dark:text-slate-700" />
          <p className="text-xs text-slate-400">No results for "<strong>{query}</strong>"</p>
        </div>
      ) : (
        <div className="py-1 max-h-80 overflow-y-auto">
          {/* Group by category */}
          {Array.from(new Set(results.map(r => r.category))).map(cat => (
            <div key={cat}>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-4 pt-3 pb-1.5">
                {cat}
              </p>
              {results.filter(r => r.category === cat).map(r => {
                const Icon = r.icon;
                return (
                  <button key={r.id} onClick={() => onSelect(r)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${r.color}`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{r.label}</p>
                      <p className="text-[10px] text-slate-400 truncate">{r.sub}</p>
                    </div>
                    <ArrowRight size={11} className="text-slate-300 shrink-0" />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// USER DROPDOWN
// ─────────────────────────────────────────────

function UserDropdown({ adminName, initials, isDark, isLoggingOut, loading, onTheme, onLogout, onSettings, onClose }: {
  adminName: string; initials: string; isDark: boolean; isLoggingOut: boolean;
  loading: boolean; onTheme: () => void; onLogout: () => void; onSettings: () => void; onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 mt-4 w-64 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-2 overflow-hidden z-[200]"
    >
      {/* Profile info */}
      <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-black text-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 dark:text-white truncate">{loading ? "…" : adminName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="py-1.5 space-y-0.5">
        <button onClick={() => { onSettings(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <Settings size={16} /> Settings
        </button>
        <button onClick={onTheme}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <div className="flex items-center gap-3">
            {isDark ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} />}
            {isDark ? "Light Mode" : "Dark Mode"}
          </div>
          <div className={`w-8 h-4 rounded-full transition-colors relative ${isDark ? "bg-sky-500" : "bg-slate-200"}`}>
            <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${isDark ? "left-5" : "left-1"}`} />
          </div>
        </button>
      </div>

      <div className="mt-1 pt-1.5 border-t border-slate-50 dark:border-slate-800">
        <button onClick={onLogout} disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50">
          {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
          {isLoggingOut ? "Logging out…" : "Logout"}
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MAIN HEADER
// ─────────────────────────────────────────────

export default function Header({ sidebarOpen, setSidebarOpen, onNavigate }: HeaderProps) {
  const [activePanel, setActivePanel] = useState<"messages" | "notifications" | "user" | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { adminName, initials, loading, handleSignOut, userId } = useAuthSession();
  const searchRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Theme init ──
  useEffect(() => {
    const saved = localStorage.getItem("envirocab-theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark" || (!saved && prefers)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // ── Close panels on outside click ──
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setActivePanel(null);
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setSearchOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Keyboard shortcut ──
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInput.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setActivePanel(null);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ── Load notifications from DB ──
  const loadNotifications = useCallback(async () => {
    const sb = createClient();
    const items: Notification[] = [];

    // Pending gate passes
    const { data: passes } = await sb
      .from("administrative_online_gatepass")
      .select("id, requested_by_name, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    (passes ?? []).forEach((p: any) => {
      items.push({
        id: `gatepass-${p.id}`,
        type: "gatepass",
        title: "Pending Gate Pass",
        desc: `${p.requested_by_name} requested a gate pass`,
        time: timeAgo(p.created_at),
        read: false,
        icon: UserPlus,
        color: "bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400",
      });
    });

    // Today's walk-in visitors
    const today = new Date().toISOString().split("T")[0];
    const { data: visitors } = await sb
      .from("administrative_walkin_visitors")
      .select("id, name, type, created_at")
      .gte("created_at", `${today}T00:00:00`)
      .order("created_at", { ascending: false })
      .limit(5);

    (visitors ?? []).forEach((v: any) => {
      items.push({
        id: `visitor-${v.id}`,
        type: "visitor",
        title: "Walk-in Visitor",
        desc: `${v.name} (${v.type}) checked in today`,
        time: timeAgo(v.created_at),
        read: false,
        icon: Users,
        color: "bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400",
      });
    });

    // Vehicles with no insurance
    const { data: noInsurance } = await sb
      .from("log2_fleet")
      .select("id, plate_number, model, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (noInsurance?.length) {
      const { data: insuredIds } = await sb
        .from("log2_vehicle_documents")
        .select("vehicle_id")
        .eq("document_type", "Insurance");
      const insuredSet = new Set((insuredIds ?? []).map((d: any) => d.vehicle_id));
      const uninsured = (noInsurance ?? []).filter((v: any) => !insuredSet.has(v.id));
      if (uninsured.length > 0) {
        items.push({
          id: `no-insurance-${uninsured[0].id}`,
          type: "vehicle",
          title: "Vehicle Missing Insurance",
          desc: `${uninsured.length} vehicle${uninsured.length > 1 ? "s" : ""} without insurance document`,
          time: "now",
          read: false,
          icon: Car,
          color: "bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400",
        });
      }
    }

    // Expiring contracts (≤ 30 days)
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const { data: expiring } = await sb
      .from("administrative_contracts")
      .select("id, contract_title, expiry_date")
      .eq("status", "Active")
      .not("expiry_date", "is", null)
      .lte("expiry_date", soon.toISOString().split("T")[0])
      .order("expiry_date", { ascending: true })
      .limit(5);

    (expiring ?? []).forEach((c: any) => {
      items.push({
        id: `contract-${c.id}`,
        type: "contract",
        title: "Contract Expiring Soon",
        desc: `"${c.contract_title}" expires ${c.expiry_date}`,
        time: "expiring",
        read: false,
        icon: FileText,
        color: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
      });
    });

    setNotifications(items.sort((a, b) => a.read ? 1 : -1));
  }, []);

  // ── Load unread message count ──
  const loadUnreadCount = useCallback(async () => {
    if (!userId) return;
    const sb = createClient();
    const { data: memberRows } = await sb
      .from("admin_conversation_members")
      .select("conversation_id")
      .eq("admin_id", userId);
    if (!memberRows?.length) return;
    const convIds = memberRows.map((r: any) => r.conversation_id);
    const { count } = await sb
      .from("admin_messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .neq("sender_id", userId);
    setUnreadMessages(count ?? 0);
  }, [userId]);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    // Real-time message count
    const sb = createClient();
    const sub = sb.channel("header-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_messages" },
        () => loadUnreadCount())
      .subscribe();
    return () => { sb.removeChannel(sub); };
  }, [loadNotifications, loadUnreadCount]);

  // ── Search across DB tables ──
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!searchQuery.trim()) { setSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    searchDebounce.current = setTimeout(async () => {
      const sb = createClient();
      const q = searchQuery.toLowerCase();
      const res: SearchResult[] = [];

      const [vehicleRes, visitorRes, contractRes, empRes] = await Promise.all([
        sb.from("log2_fleet").select("id,plate_number,model,status").ilike("plate_number", `%${q}%`).limit(4),
        sb.from("administrative_walkin_visitors").select("id,name,type,status").ilike("name", `%${q}%`).limit(4),
        sb.from("administrative_contracts").select("id,contract_title,organization_name,status").ilike("contract_title", `%${q}%`).limit(4),
        sb.from("hr_proceedlist").select("id,firstname,lastname,email").ilike("lastname", `%${q}%`).limit(4),
      ]);

      (vehicleRes.data ?? []).forEach((v: any) => res.push({
        id: v.id, category: "Vehicles",
        label: `${v.model} — ${v.plate_number}`,
        sub: v.status ?? "Unknown",
        icon: Car,
        color: "bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400",
        action: "Documents/Vehicles",
      }));

      (visitorRes.data ?? []).forEach((v: any) => res.push({
        id: v.id, category: "Visitors",
        label: v.name,
        sub: `${v.type} — ${v.status}`,
        icon: Users,
        color: "bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400",
        action: "Visitors",
      }));

      (contractRes.data ?? []).forEach((c: any) => res.push({
        id: c.id, category: "Contracts",
        label: c.contract_title,
        sub: `${c.organization_name} · ${c.status}`,
        icon: FileText,
        color: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
        action: "Legal/Contracts",
      }));

      (empRes.data ?? []).forEach((e: any) => res.push({
        id: String(e.id), category: "Employees",
        label: `${e.firstname ?? ""} ${e.lastname ?? ""}`.trim() || "Unknown",
        sub: e.email ?? "—",
        icon: User,
        color: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        action: "Legal/Employees",
      }));

      setSearchResults(res);
      setSearchLoading(false);
    }, 300);
  }, [searchQuery]);

  // ── Handlers ──
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("envirocab-theme", next ? "dark" : "light");
  };

  const togglePanel = (panel: "messages" | "notifications" | "user") => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setActivePanel(null);
    localStorage.removeItem("dashboard_active_tab");
    sessionStorage.removeItem("dashboard_init_done");
    toast.promise(
      new Promise(res => setTimeout(res, 2000)).then(() => handleSignOut()),
      {
        loading: (
          <div className="flex flex-col min-w-[220px] gap-2">
            <div className="flex items-center gap-2">
              <LogOut className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-gray-800 dark:text-white">Closing Session</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "linear" }}
                className="h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
              />
            </div>
          </div>
        ),
        success: "Logged out safely",
        error: "Logout failed",
      },
      {
        style: {
          borderRadius: "1rem",
          background: isDark ? "#1F2937" : "#FFFFFF",
          color: isDark ? "#FFFFFF" : "#1F2937",
          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
        },
      }
    );
  };

  const unreadNotifs = notifications.filter(n => !n.read).length;

  return (
    <>
      <Toaster position="top-right" />

      <header className="h-16 md:h-20 px-3 md:px-6 lg:px-8 flex items-center justify-between bg-white dark:bg-[#0f172a] border-b border-slate-100 dark:border-slate-800 sticky top-0 z-[100] transition-colors duration-300">

        {/* ── Left: toggle + search ── */}
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all focus:outline-none shrink-0"
            aria-label="Toggle sidebar">
            <AnimatePresence mode="wait" initial={false}>
              {sidebarOpen ? (
                <motion.span key="close" initial={{ x: -6, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -6, opacity: 0 }} transition={{ duration: 0.15 }} className="block">
                  <ChevronsLeft size={20} />
                </motion.span>
              ) : (
                <motion.span key="menu" initial={{ x: 6, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 6, opacity: 0 }} transition={{ duration: 0.15 }} className="block">
                  <AlignLeft size={20} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Search */}
          <div ref={searchRef} className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search size={14} className={`transition-colors ${searchOpen ? "text-sky-500" : "text-slate-400"}`} />
            </div>
            <input
              ref={searchInput}
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search vehicles, visitors, contracts…"
              className="w-full pl-9 pr-16 py-2 bg-slate-50 dark:bg-slate-800/80 border border-transparent focus:border-sky-300 dark:focus:border-sky-500/50 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all focus:bg-white dark:focus:bg-slate-800 focus:shadow-sm"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
              {searchQuery ? (
                <button onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <X size={12} />
                </button>
              ) : (
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] text-slate-400">⌘K</kbd>
              )}
            </div>

            {/* Search dropdown */}
            <AnimatePresence>
              {searchOpen && (searchQuery.trim() || searchLoading) && (
                <SearchPanel
                  query={searchQuery}
                  results={searchResults}
                  loading={searchLoading}
                  onSelect={(r) => {
                    if (r.action && onNavigate) onNavigate(r.action);
                    setSearchQuery("");
                    setSearchOpen(false);
                    setSearchResults([]);
                  }}
                  onClose={() => setSearchOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right: icons + user ── */}
        <div className="flex items-center gap-1 md:gap-2 ml-2 shrink-0" ref={panelRef}>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-slate-100 dark:bg-slate-800 mx-1" />

          {/* Messages */}
          <div className="relative">
            <IconBtn onClick={() => togglePanel("messages")} active={activePanel === "messages"} title="Messages">
              <MessageSquare size={18} />
              <Badge count={unreadMessages} color="bg-sky-500" />
            </IconBtn>
            <AnimatePresence>
              {activePanel === "messages" && userId && (
                <MessagesPanel
                  currentAdminId={userId}
                  onClose={() => setActivePanel(null)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Notifications */}
          <div className="relative">
            <IconBtn onClick={() => togglePanel("notifications")} active={activePanel === "notifications"} title="Notifications">
              <Bell size={18} />
              <Badge count={unreadNotifs} color="bg-amber-500" />
            </IconBtn>
            <AnimatePresence>
              {activePanel === "notifications" && (
                <NotificationsPanel
                  notifications={notifications}
                  onRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))}
                  onClearAll={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                  onClose={() => setActivePanel(null)}
                />
              )}
            </AnimatePresence>
          </div>

          <div className="hidden sm:block w-px h-6 bg-slate-100 dark:bg-slate-800 mx-1" />

          {/* User dropdown */}
          <div className="relative">
            <div
              onClick={() => !isLoggingOut && togglePanel("user")}
              className={`flex items-center gap-2 cursor-pointer px-2 md:px-3 py-1.5 rounded-xl transition-all border border-transparent ${activePanel === "user"
                  ? "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800"
                } ${isLoggingOut ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-yellow-600 border-2 border-white dark:border-slate-700 shadow-sm flex items-center justify-center text-white font-black text-xs shrink-0">
                {isLoggingOut ? <Loader2 size={13} className="animate-spin" /> : initials}
              </div>
              <span className="hidden lg:block text-sm font-bold text-slate-800 dark:text-slate-200 max-w-[100px] truncate">
                {loading ? "…" : adminName}
              </span>
              <ChevronDown size={12} className={`hidden sm:block text-slate-400 transition-transform duration-200 ${activePanel === "user" ? "rotate-180" : ""}`} />
            </div>

            <AnimatePresence>
              {activePanel === "user" && (
                <UserDropdown
                  adminName={adminName}
                  initials={initials}
                  isDark={isDark}
                  isLoggingOut={isLoggingOut}
                  loading={loading}
                  onTheme={toggleTheme}
                  onLogout={handleLogout}
                  onSettings={() => { if (onNavigate) onNavigate("Settings"); }}
                  onClose={() => setActivePanel(null)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
    </>
  );
}