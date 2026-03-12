"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/app/utils/supabase";
import {
  Send, Search, MessageSquare, Trash2, Pencil,
  Check, X, MoreHorizontal, Loader2, AlertCircle,
  ArrowLeft, Users, ChevronLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Admin {
  id: string;
  email: string;
  display_name: string | null;
  role: string | null;
}
interface Conv {
  id: string;
  created_by: string;
  created_at: string;
  otherAdminId: string;
  otherAdminName: string;
  lastMessage?: string;
  lastAt?: string;
}
interface Msg {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string | null;
  content: string;
  created_at: string;
  updated_at: string | null;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = "md", online = false }: {
  name: string; size?: "sm" | "md" | "lg"; online?: boolean;
}) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const palette = [
    "from-sky-400 to-blue-500", "from-emerald-400 to-teal-500",
    "from-violet-400 to-purple-500", "from-rose-400 to-pink-500",
    "from-amber-400 to-orange-500", "from-indigo-400 to-blue-600",
    "from-fuchsia-400 to-violet-500", "from-cyan-400 to-sky-500",
  ];
  const color = palette[name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];
  const sz = size === "sm" ? "w-9 h-9 text-[11px]" : size === "lg" ? "w-12 h-12 text-sm" : "w-10 h-10 text-xs";
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sz} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-semibold text-white ring-2 ring-white dark:ring-slate-900 select-none`}>
        {initials}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string, short = false) {
  const d = new Date(iso), now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (short) {
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
function dayLabel(iso: string) {
  const d = new Date(iso), now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  if (new Date(now.getTime() - 86400000).toDateString() === d.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}
function groupByDay(msgs: Msg[]) {
  const out: { label: string; msgs: Msg[] }[] = [];
  let cur = "";
  for (const m of msgs) {
    const lbl = dayLabel(m.created_at);
    if (lbl !== cur) { cur = lbl; out.push({ label: lbl, msgs: [m] }); }
    else out[out.length - 1].msgs.push(m);
  }
  return out;
}

// ─── DeleteDialog ─────────────────────────────────────────────────────────────
function DeleteDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-xs flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white text-sm">Delete message?</p>
            <p className="text-xs text-slate-500 mt-0.5">This cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ConvRow ──────────────────────────────────────────────────────────────────
function ConvRow({ conv, isActive, onClick, isMobile }: {
  conv: Conv; isActive: boolean; onClick: () => void; isMobile?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 text-left transition-all
        ${isMobile
          ? "px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800"
          : `px-3 py-2.5 rounded-xl mb-0.5 ${isActive
            ? "bg-blue-50 dark:bg-blue-500/10"
            : "hover:bg-slate-100 dark:hover:bg-slate-800/70"}`
        }`}
    >
      <Avatar name={conv.otherAdminName} size={isMobile ? "md" : "sm"} online />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className={`font-semibold truncate ${isMobile ? "text-[15px]" : "text-sm"} ${isActive && !isMobile ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white"}`}>
            {conv.otherAdminName}
          </span>
          {conv.lastAt && (
            <span className={`text-slate-400 flex-shrink-0 ${isMobile ? "text-xs" : "text-[10px]"}`}>
              {timeAgo(conv.lastAt, true)}
            </span>
          )}
        </div>
        <p className={`text-slate-400 truncate ${isMobile ? "text-[13px]" : "text-[11px]"}`}>
          {conv.lastMessage || "No messages yet"}
        </p>
      </div>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Message() {
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [allAdmins, setAllAdmins] = useState<Admin[]>([]);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeConv, setActiveConv] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);

  const [input, setInput] = useState("");
  const [convSearch, setConvSearch] = useState("");
  const [msgSearch, setMsgSearch] = useState("");

  const [booting, setBooting] = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [openingDM, setOpeningDM] = useState<string | null>(null);

  // Mobile: "list" | "chat"
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  // ── Boot ─────────────────────────────────────────────────────────────────────
  useEffect(() => { boot(); }, []); // eslint-disable-line

  async function boot() {
    setBooting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBooting(false); return; }

    const { data: myAdmin } = await supabase
      .from("admin_accounts").select("*").eq("id", user.id).single();
    const myName = myAdmin?.display_name || myAdmin?.email || "Admin";
    setMe({ id: user.id, name: myName });

    const { data: adminRows } = await supabase
      .from("admin_accounts")
      .select("id, email, display_name, role")
      .eq("role", "admin");
    setAllAdmins((adminRows || []).filter((a: Admin) => a.id !== user.id));

    await loadConvs(user.id, (adminRows || []).filter((a: Admin) => a.id !== user.id));
    setBooting(false);
  }

  async function loadConvs(myId: string, adminList: Admin[]) {
    const { data: myMemberships } = await supabase
      .from("admin_conversation_members")
      .select("conversation_id")
      .eq("admin_id", myId);

    if (!myMemberships?.length) { setConvs([]); return; }
    const convIds = myMemberships.map((m) => m.conversation_id);
    const { data: rawConvs } = await supabase
      .from("admin_conversations").select("*").in("id", convIds);
    if (!rawConvs?.length) { setConvs([]); return; }

    const enriched: Conv[] = [];
    for (const conv of rawConvs) {
      const { data: members } = await supabase
        .from("admin_conversation_members").select("admin_id").eq("conversation_id", conv.id);
      const otherId = members?.find((m) => m.admin_id !== myId)?.admin_id;
      if (!otherId) continue;
      const otherAdmin = adminList.find((a) => a.id === otherId);
      const otherName = otherAdmin?.display_name || otherAdmin?.email || "Admin";
      const { data: lastMsgs } = await supabase
        .from("admin_messages").select("content, created_at, sender_name")
        .eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1);
      const last = lastMsgs?.[0];
      enriched.push({
        id: conv.id, created_by: conv.created_by, created_at: conv.created_at,
        otherAdminId: otherId, otherAdminName: otherName,
        lastMessage: last ? `${last.sender_name?.split(" ")[0] || "Admin"}: ${last.content}` : undefined,
        lastAt: last?.created_at,
      });
    }
    enriched.sort((a, b) => {
      if (!a.lastAt && !b.lastAt) return 0;
      if (!a.lastAt) return 1; if (!b.lastAt) return -1;
      return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
    });
    setConvs(enriched);
  }

  async function openOrCreateDM(target: Admin) {
    if (!me || openingDM) return;
    setOpeningDM(target.id);
    const existing = convs.find((c) => c.otherAdminId === target.id);
    if (existing) {
      setActiveConv(existing);
      setMobileView("chat");
      setOpeningDM(null);
      return;
    }
    const { data: newConv, error: convError } = await supabase
      .from("admin_conversations").insert({ created_by: me.id }).select("*").single();
    if (convError || !newConv) { setOpeningDM(null); return; }
    await supabase.from("admin_conversation_members").insert([
      { conversation_id: newConv.id, admin_id: me.id },
      { conversation_id: newConv.id, admin_id: target.id },
    ]);
    const fresh: Conv = {
      id: newConv.id, created_by: newConv.created_by, created_at: newConv.created_at,
      otherAdminId: target.id, otherAdminName: target.display_name || target.email,
    };
    setConvs((prev) => [fresh, ...prev]);
    setActiveConv(fresh);
    setMobileView("chat");
    setOpeningDM(null);
  }

  function selectConv(conv: Conv) {
    setActiveConv(conv);
    setMobileView("chat");
  }

  function goBackToList() {
    setMobileView("list");
    setActiveConv(null);
  }

  useEffect(() => {
    if (!activeConv) return;
    setMsgsLoading(true); setMsgs([]); setMsgSearch(""); setEditId(null); setMenuId(null);
    supabase.from("admin_messages").select("*")
      .eq("conversation_id", activeConv.id).order("created_at", { ascending: true })
      .then(({ data }) => {
        setMsgs(data || []);
        setMsgsLoading(false);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 60);
      });
  }, [activeConv?.id]); // eslint-disable-line

  useEffect(() => {
    if (!activeConv?.id) return;
    const ch = supabase.channel(`room:${activeConv.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_messages", filter: `conversation_id=eq.${activeConv.id}` },
        (p) => {
          const m = p.new as Msg;
          setMsgs((prev) => prev.find((x) => x.id === m.id) ? prev : [...prev, m]);
          setConvs((prev) => prev.map((c) =>
            c.id === activeConv.id
              ? { ...c, lastMessage: `${m.sender_name?.split(" ")[0] || "Admin"}: ${m.content}`, lastAt: m.created_at }
              : c
          ));
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "admin_messages", filter: `conversation_id=eq.${activeConv.id}` },
        (p) => setMsgs((prev) => prev.map((m) => m.id === p.new.id ? p.new as Msg : m)))
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "admin_messages" },
        (p) => setMsgs((prev) => prev.filter((m) => m.id !== p.old.id)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeConv?.id]); // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuId(null);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  async function send() {
    if (!input.trim() || !me || !activeConv || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "44px";
    const { data } = await supabase.from("admin_messages")
      .insert({ conversation_id: activeConv.id, sender_id: me.id, sender_name: me.name, content })
      .select().single();
    if (data) setMsgs((prev) => prev.find((m) => m.id === data.id) ? prev : [...prev, data]);
    setSending(false);
    inputRef.current?.focus();
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function startEdit(msg: Msg) { setEditId(msg.id); setEditVal(msg.content); setMenuId(null); }
  async function saveEdit() {
    if (!editVal.trim() || !editId) return;
    const { data } = await supabase.from("admin_messages")
      .update({ content: editVal.trim(), updated_at: new Date().toISOString() })
      .eq("id", editId).select().single();
    if (data) setMsgs((prev) => prev.map((m) => m.id === editId ? data : m));
    setEditId(null); setEditVal("");
  }
  async function doDelete() {
    if (!deleteId) return;
    await supabase.from("admin_messages").delete().eq("id", deleteId);
    setMsgs((prev) => prev.filter((m) => m.id !== deleteId));
    setDeleteId(null);
  }

  const existingConvAdminIds = new Set(convs.map((c) => c.otherAdminId));
  const filteredConvs = convSearch.trim()
    ? convs.filter((c) =>
      c.otherAdminName.toLowerCase().includes(convSearch.toLowerCase()) ||
      (c.lastMessage || "").toLowerCase().includes(convSearch.toLowerCase())
    ) : convs;
  const newAdmins = convSearch.trim()
    ? allAdmins.filter((a) =>
      !existingConvAdminIds.has(a.id) &&
      (a.display_name || a.email || "").toLowerCase().includes(convSearch.toLowerCase())
    ) : allAdmins.filter((a) => !existingConvAdminIds.has(a.id));
  const filteredMsgs = msgSearch.trim()
    ? msgs.filter((m) =>
      m.content.toLowerCase().includes(msgSearch.toLowerCase()) ||
      (m.sender_name || "").toLowerCase().includes(msgSearch.toLowerCase())
    ) : msgs;
  const msgDays = groupByDay(filteredMsgs);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {deleteId && <DeleteDialog onConfirm={doDelete} onCancel={() => setDeleteId(null)} />}

      {/* ════════════════════════════════════════════════════════
          DESKTOP LAYOUT (sm and above)
      ════════════════════════════════════════════════════════ */}
      <div
        className="hidden sm:flex flex-col"
        style={{ height: "calc(100vh - 160px)", minHeight: "520px" }}
      >
        <div className="flex-1 min-h-0 flex overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-lg">
          {/* SIDEBAR */}
          <div className="flex-shrink-0 flex flex-col w-[270px] xl:w-[290px] bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
            <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-base font-bold text-slate-900 dark:text-white mb-3">Messages</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                <input
                  type="text" placeholder="Search people or messages…"
                  value={convSearch} onChange={(e) => setConvSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400/40 transition-all"
                />
                {convSearch && (
                  <button onClick={() => setConvSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-2 px-2">
              {booting ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs">Loading…</span>
                </div>
              ) : (
                <>
                  {filteredConvs.length > 0 && (
                    <div className="mb-2">
                      {filteredConvs.map((c) => (
                        <ConvRow key={c.id} conv={c} isActive={activeConv?.id === c.id} onClick={() => setActiveConv(c)} />
                      ))}
                    </div>
                  )}
                  {newAdmins.length > 0 && (
                    <div>
                      {filteredConvs.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Start new</span>
                          <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                        </div>
                      )}
                      {newAdmins.map((admin) => {
                        const name = admin.display_name || admin.email;
                        const isOpening = openingDM === admin.id;
                        return (
                          <button key={admin.id} onClick={() => openOrCreateDM(admin)} disabled={!!openingDM}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors group mb-0.5 disabled:opacity-60">
                            <Avatar name={name} size="sm" />
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{name}</p>
                              <p className="text-[10px] text-slate-400">{isOpening ? "Opening…" : "Send a message"}</p>
                            </div>
                            {isOpening ? <Loader2 size={13} className="text-blue-400 animate-spin flex-shrink-0" />
                              : <MessageSquare size={13} className="text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {filteredConvs.length === 0 && newAdmins.length === 0 && convSearch && (
                    <p className="px-3 py-6 text-xs text-slate-400 text-center">No results for "{convSearch}"</p>
                  )}
                  {filteredConvs.length === 0 && newAdmins.length === 0 && !convSearch && !booting && (
                    <p className="px-3 py-6 text-xs text-slate-400 text-center">No other admins found.</p>
                  )}
                </>
              )}
            </div>
            {me && (
              <div className="flex-shrink-0 px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <Avatar name={me.name} size="sm" online />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{me.name}</p>
                  <p className="text-[10px] text-emerald-500 font-medium">● Active now</p>
                </div>
              </div>
            )}
          </div>

          {/* CHAT AREA */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0d1117]">
            {!activeConv ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 text-center">
                <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <MessageSquare size={32} className="text-blue-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-600 dark:text-slate-300 text-base">Your messages</p>
                  <p className="text-sm text-slate-400 mt-1">Select a conversation or start a new one</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-shrink-0 h-14 px-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0d1117]">
                  <Avatar name={activeConv.otherAdminName} size="sm" online />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{activeConv.otherAdminName}</p>
                    <p className="text-[10px] text-emerald-500 font-medium">● Active now</p>
                  </div>
                  <div className="relative hidden md:block">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={11} />
                    <input type="text" placeholder="Search in chat…" value={msgSearch}
                      onChange={(e) => setMsgSearch(e.target.value)}
                      className="w-36 pl-7 pr-7 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-900 dark:text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400/30 transition-all" />
                    {msgSearch && (
                      <button onClick={() => setMsgSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-5">
                  {msgsLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <Loader2 size={22} className="animate-spin text-blue-400" />
                      <p className="text-xs text-slate-400">Loading messages…</p>
                    </div>
                  ) : filteredMsgs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                      <Avatar name={activeConv.otherAdminName} size="lg" />
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{activeConv.otherAdminName}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {msgSearch ? `No results for "${msgSearch}"` : "No messages yet — say hello! 👋"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {msgDays.map((day) => (
                        <div key={day.label}>
                          <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                            <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">{day.label}</span>
                            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                          </div>
                          {day.msgs.map((msg, idx) => {
                            const mine = msg.sender_id === me?.id;
                            const name = msg.sender_name || "Admin";
                            const prev = idx > 0 ? day.msgs[idx - 1] : null;
                            const consecutive = prev?.sender_id === msg.sender_id;
                            return (
                              <div key={msg.id}
                                className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"} ${consecutive ? "mt-0.5" : "mt-4"} group/row`}>
                                <div className={`flex-shrink-0 mb-1 ${consecutive ? "invisible" : ""}`}>
                                  <Avatar name={name} size="sm" />
                                </div>
                                <div className={`flex flex-col max-w-[72%] sm:max-w-[58%] ${mine ? "items-end" : "items-start"}`}>
                                  {!consecutive && (
                                    <div className={`flex items-baseline gap-2 mb-1 px-1 ${mine ? "flex-row-reverse" : ""}`}>
                                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{mine ? "You" : name}</span>
                                      <span className="text-[10px] text-slate-400">{timeAgo(msg.created_at)}</span>
                                    </div>
                                  )}
                                  {editId === msg.id ? (
                                    <div className="flex flex-col gap-2 w-full min-w-[220px]">
                                      <textarea value={editVal} onChange={(e) => setEditVal(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                          if (e.key === "Escape") { setEditId(null); setEditVal(""); }
                                        }}
                                        autoFocus rows={2}
                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border-2 border-blue-400 rounded-xl outline-none text-slate-900 dark:text-white resize-none" />
                                      <div className={`flex gap-2 ${mine ? "justify-end" : ""}`}>
                                        <button onClick={() => { setEditId(null); setEditVal(""); }}
                                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                          <X size={10} /> Cancel
                                        </button>
                                        <button onClick={saveEdit}
                                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                                          <Check size={10} /> Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="relative group/bubble">
                                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${mine
                                        ? "bg-blue-500 text-white rounded-br-sm"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-sm"
                                        }`}>
                                        {msg.content}
                                        {msg.updated_at && (
                                          <span className={`text-[9px] ml-2 ${mine ? "text-blue-200" : "text-slate-400"}`}>edited</span>
                                        )}
                                      </div>
                                      {consecutive && (
                                        <span className={`absolute top-1/2 -translate-y-1/2 text-[9px] text-slate-400 opacity-0 group-hover/bubble:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${mine ? "right-full mr-2" : "left-full ml-2"}`}>
                                          {timeAgo(msg.created_at)}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {mine && editId !== msg.id && (
                                  <div className="flex-shrink-0 self-center opacity-0 group-hover/row:opacity-100 transition-opacity relative"
                                    ref={menuId === msg.id ? menuRef : undefined}>
                                    <button onClick={(e) => { e.stopPropagation(); setMenuId(menuId === msg.id ? null : msg.id); }}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                      <MoreHorizontal size={14} />
                                    </button>
                                    {menuId === msg.id && (
                                      <div className="absolute bottom-full mb-1 right-0 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 w-28">
                                        <button onClick={() => startEdit(msg)}
                                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                          <Pencil size={12} className="text-blue-400" /> Edit
                                        </button>
                                        <div className="h-px bg-slate-100 dark:bg-slate-700" />
                                        <button onClick={() => { setDeleteId(msg.id); setMenuId(null); }}
                                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                                          <Trash2 size={12} /> Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      <div ref={bottomRef} className="h-2" />
                    </>
                  )}
                </div>

                {/* Input bar */}
                <div className="flex-shrink-0 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0d1117]">
                  {me ? (
                    <>
                      <div className="flex items-end gap-3">
                        <Avatar name={me.name} size="sm" />
                        <div className="flex-1 relative">
                          <textarea ref={inputRef} value={input}
                            onChange={(e) => {
                              setInput(e.target.value);
                              e.target.style.height = "auto";
                              e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px";
                            }}
                            onKeyDown={onKey}
                            placeholder={`Message ${activeConv.otherAdminName}…`}
                            rows={1}
                            className="w-full px-4 py-3 pr-12 bg-slate-100 dark:bg-slate-800 rounded-2xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-400/40 transition-all placeholder:text-slate-400 resize-none leading-relaxed"
                            style={{ minHeight: "46px", maxHeight: "130px" }} />
                          <button onClick={send} disabled={!input.trim() || sending}
                            className={`absolute right-2.5 bottom-2.5 p-2 rounded-xl transition-all ${input.trim() && !sending
                              ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md active:scale-95"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                              }`}>
                            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-300 dark:text-slate-700 mt-1.5 ml-12">
                        Enter to send · Shift+Enter for new line
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-2 gap-2 text-slate-400">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-xs">Connecting…</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          MOBILE LAYOUT (below sm) — Messenger-style full screen
      ════════════════════════════════════════════════════════ */}
      <div className="flex sm:hidden flex-col relative overflow-hidden bg-white dark:bg-[#0d1117]" style={{ height: "calc(100dvh - 160px)", minHeight: "500px" }}>

        {/* ── MOBILE: CONVERSATION LIST VIEW ── */}
        <div className={`absolute inset-0 flex flex-col bg-white dark:bg-[#0d1117] transition-transform duration-300 ease-in-out ${mobileView === "list" ? "translate-x-0" : "-translate-x-full"}`}>

          {/* Header */}
          <div className="flex-shrink-0 px-4 pt-3 pb-2 bg-white dark:bg-[#0d1117] border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pt-3 pb-2">
              <h1 className="text-[22px] font-bold text-slate-900 dark:text-white">Messages</h1>
              {me && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{me.name}</span>
                  <Avatar name={me.name} size="sm" online />
                </div>
              )}
            </div>
            {/* Search bar */}
            <div className="relative mt-1 mb-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              <input type="text" placeholder="Search"
                value={convSearch} onChange={(e) => setConvSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[14px] text-slate-900 dark:text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400/30 transition-all" />
              {convSearch && (
                <button onClick={() => setConvSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {booting ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : (
              <>
                {filteredConvs.length > 0 && (
                  <div className="pt-2">
                    {filteredConvs.map((c) => (
                      <ConvRow key={c.id} conv={c} isActive={activeConv?.id === c.id} onClick={() => selectConv(c)} isMobile />
                    ))}
                  </div>
                )}

                {newAdmins.length > 0 && (
                  <div>
                    <div className="px-4 pt-4 pb-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {filteredConvs.length > 0 ? "Start new conversation" : "People"}
                      </p>
                    </div>
                    {newAdmins.map((admin) => {
                      const name = admin.display_name || admin.email;
                      const isOpening = openingDM === admin.id;
                      return (
                        <button key={admin.id} onClick={() => openOrCreateDM(admin)} disabled={!!openingDM}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 transition-colors disabled:opacity-60">
                          <Avatar name={name} size="md" />
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{name}</p>
                            <p className="text-[13px] text-slate-400">{isOpening ? "Opening…" : "Tap to message"}</p>
                          </div>
                          {isOpening
                            ? <Loader2 size={16} className="text-blue-400 animate-spin flex-shrink-0" />
                            : <MessageSquare size={16} className="text-slate-300 flex-shrink-0" />
                          }
                        </button>
                      );
                    })}
                  </div>
                )}

                {filteredConvs.length === 0 && newAdmins.length === 0 && convSearch && (
                  <p className="px-4 py-10 text-sm text-slate-400 text-center">No results for "{convSearch}"</p>
                )}
                {filteredConvs.length === 0 && newAdmins.length === 0 && !convSearch && !booting && (
                  <p className="px-4 py-10 text-sm text-slate-400 text-center">No other admins found.</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── MOBILE: CHAT VIEW ── */}
        <div className={`absolute inset-0 flex flex-col bg-white dark:bg-[#0d1117] transition-transform duration-300 ease-in-out ${mobileView === "chat" ? "translate-x-0" : "translate-x-full"}`}>

          {activeConv && (
            <>
              {/* Chat header — Messenger style */}
              <div className="flex-shrink-0 flex items-center gap-3 px-3 py-3 bg-white dark:bg-[#0d1117] border-b border-slate-100 dark:border-slate-800 shadow-sm">
                <button onClick={goBackToList}
                  className="p-2 -ml-1 rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 active:bg-blue-100 dark:active:bg-blue-500/20 transition-colors flex-shrink-0">
                  <ChevronLeft size={26} strokeWidth={2.5} />
                </button>
                <Avatar name={activeConv.otherAdminName} size="md" online />
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                    {activeConv.otherAdminName}
                  </p>
                  <p className="text-[12px] text-emerald-500 font-medium leading-tight">Active now</p>
                </div>
                {/* In-chat search */}
                <button className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors">
                  <Search size={18} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-4">
                {msgsLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader2 size={24} className="animate-spin text-blue-400" />
                    <p className="text-sm text-slate-400">Loading messages…</p>
                  </div>
                ) : filteredMsgs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
                    <Avatar name={activeConv.otherAdminName} size="lg" />
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-200 text-base">{activeConv.otherAdminName}</p>
                      <p className="text-sm text-slate-400 mt-1">No messages yet — say hello! 👋</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {msgDays.map((day) => (
                      <div key={day.label}>
                        {/* Day divider */}
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                          <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">{day.label}</span>
                          <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                        </div>

                        {day.msgs.map((msg, idx) => {
                          const mine = msg.sender_id === me?.id;
                          const name = msg.sender_name || "Admin";
                          const prev = idx > 0 ? day.msgs[idx - 1] : null;
                          const consecutive = prev?.sender_id === msg.sender_id;

                          return (
                            <div key={msg.id}
                              className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"} ${consecutive ? "mt-1" : "mt-4"}`}>
                              {/* Avatar — hidden for consecutive, invisible placeholder to keep alignment */}
                              <div className={`flex-shrink-0 ${consecutive ? "w-9" : ""}`}>
                                {!consecutive && <Avatar name={name} size="sm" />}
                              </div>

                              <div className={`flex flex-col max-w-[75%] ${mine ? "items-end" : "items-start"}`}>
                                {!consecutive && (
                                  <div className={`flex items-baseline gap-2 mb-1 px-1 ${mine ? "flex-row-reverse" : ""}`}>
                                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                      {mine ? "You" : name}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{timeAgo(msg.created_at)}</span>
                                  </div>
                                )}

                                {editId === msg.id ? (
                                  <div className="flex flex-col gap-2 w-full min-w-[200px]">
                                    <textarea value={editVal} onChange={(e) => setEditVal(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                        if (e.key === "Escape") { setEditId(null); setEditVal(""); }
                                      }}
                                      autoFocus rows={2}
                                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border-2 border-blue-400 rounded-2xl outline-none text-slate-900 dark:text-white resize-none" />
                                    <div className={`flex gap-2 ${mine ? "justify-end" : ""}`}>
                                      <button onClick={() => { setEditId(null); setEditVal(""); }}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-500 active:bg-slate-100 dark:active:bg-slate-800">
                                        <X size={10} /> Cancel
                                      </button>
                                      <button onClick={saveEdit}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500 text-white active:bg-blue-600">
                                        <Check size={10} /> Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className="relative"
                                    onContextMenu={(e) => { if (mine) { e.preventDefault(); setMenuId(menuId === msg.id ? null : msg.id); } }}
                                    onTouchStart={() => {
                                      if (!mine) return;
                                      const t = setTimeout(() => setMenuId(msg.id), 500);
                                      (window as unknown as Record<string, unknown>)._lpTimer = t;
                                    }}
                                    onTouchEnd={() => clearTimeout((window as unknown as Record<string, number>)._lpTimer)}
                                    onTouchMove={() => clearTimeout((window as unknown as Record<string, number>)._lpTimer)}
                                  >
                                    <div className={`px-4 py-2.5 rounded-[20px] text-[15px] leading-relaxed break-words ${mine
                                      ? "bg-blue-500 text-white rounded-br-[6px]"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-[6px]"
                                      }`}>
                                      {msg.content}
                                      {msg.updated_at && (
                                        <span className={`text-[9px] ml-2 ${mine ? "text-blue-200" : "text-slate-400"}`}>edited</span>
                                      )}
                                    </div>

                                    {/* Context menu on long press */}
                                    {menuId === msg.id && mine && (
                                      <div
                                        ref={menuRef}
                                        className={`absolute z-50 bottom-full mb-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden w-36 ${mine ? "right-0" : "left-0"}`}
                                      >
                                        <button onClick={() => startEdit(msg)}
                                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700">
                                          <Pencil size={15} className="text-blue-400" /> Edit
                                        </button>
                                        <div className="h-px bg-slate-100 dark:bg-slate-700" />
                                        <button onClick={() => { setDeleteId(msg.id); setMenuId(null); }}
                                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 active:bg-red-50 dark:active:bg-red-500/10">
                                          <Trash2 size={15} /> Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div ref={bottomRef} className="h-4" />
                  </>
                )}
              </div>

              {/* Mobile input bar — Messenger style */}
              <div className="flex-shrink-0 px-3 py-2 pb-3 bg-white dark:bg-[#0d1117] border-t border-slate-100 dark:border-slate-800">
                {me ? (
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea ref={inputRef} value={input}
                        onChange={(e) => {
                          setInput(e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                        }}
                        onKeyDown={onKey}
                        placeholder="Aa"
                        rows={1}
                        className="w-full px-4 py-3 pr-4 bg-slate-100 dark:bg-slate-800 rounded-full text-[15px] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-400/30 placeholder:text-slate-400 resize-none leading-relaxed transition-all"
                        style={{ minHeight: "44px", maxHeight: "120px", borderRadius: input.includes("\n") || input.length > 40 ? "20px" : "999px" }} />
                    </div>
                    <button onClick={send} disabled={!input.trim() || sending}
                      className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all ${input.trim() && !sending
                        ? "bg-blue-500 text-white active:scale-95 shadow-md"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                        }`}>
                      {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={input.trim() ? "translate-x-0.5" : ""} />}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-3 gap-2 text-slate-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Connecting…</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Fallback if no active conv but in chat view */}
          {!activeConv && mobileView === "chat" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <button onClick={goBackToList}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-full text-sm font-semibold">
                <ArrowLeft size={15} /> Back to messages
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}