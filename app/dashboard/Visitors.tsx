"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/app/utils/supabase";
import {
  Search, UserPlus, Loader2, ChevronLeft, ChevronRight,
  Trash2, Edit3, X, AlertTriangle, Clock, Users, CheckCircle2, CheckCircle, RefreshCw, MoreVertical,
  TrendingUp, Activity, CalendarDays, ShieldCheck, Mail,
  FileCheck, ClipboardList, Car, Package, Building2,
  UserCheck, XCircle, Timer, Hash, Eye, Send,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// Constants 

const ROWS_PER_PAGE = 10;
const VISITOR_TYPES = ["Guest", "Delivery", "Contractor", "Other"] as const;
const STATUSES = ["Checked In", "Completed", "Cancelled"] as const;
const GATE_PASS_STATUSES = ["pending", "approved", "declined", "expired"] as const;

const TYPE_META: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  Guest: { color: "text-sky-700 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-500/10", border: "border-sky-200 dark:border-sky-500/20", dot: "bg-sky-500" },
  Delivery: { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/20", dot: "bg-amber-400" },
  Contractor: { color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10", border: "border-violet-200 dark:border-violet-500/20", dot: "bg-violet-500" },
  Other: { color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-700", border: "border-slate-200 dark:border-slate-600", dot: "bg-slate-400" },
};

const TYPE_HEX: Record<string, string> = {
  Guest: "#0ea5e9", Delivery: "#f59e0b", Contractor: "#8b5cf6", Other: "#64748b",
};

const STATUS_META: Record<string, { badge: string; dot: string }> = {
  "Checked In": { badge: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20", dot: "bg-emerald-500" },
  "Completed": { badge: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600", dot: "bg-slate-400" },
  "Cancelled": { badge: "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20", dot: "bg-rose-500" },
};

const GATE_META: Record<string, { badge: string; dot: string; label: string }> = {
  pending: { badge: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20", dot: "bg-amber-400", label: "Pending" },
  approved: { badge: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20", dot: "bg-emerald-500", label: "Approved" },
  declined: { badge: "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20", dot: "bg-rose-500", label: "Declined" },
  expired: { badge: "text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600", dot: "bg-slate-400", label: "Expired" },
};

// Types 

interface WalkInVisitor {
  id: string;
  name: string;
  type: typeof VISITOR_TYPES[number];
  status: typeof STATUSES[number];
  entry_time: string;
  exit_time?: string | null;
  created_at: string;
  notes?: string;
}

interface GatePass {
  id: string;
  pass_number: number;
  created_at: string;
  email: string;
  requested_by_name: string;
  department?: string;
  visit_date: string;
  expected_arrival_time: string;
  expected_departure_time: string;
  purpose: string;
  participants_count: number;
  vehicle_plate_number?: string;
  items_to_carry?: string;
  status: typeof GATE_PASS_STATUSES[number];
  admin_notes?: string;
  actual_in_time?: string;
  actual_out_time?: string;
}

// Toast

interface ToastMsg { id: number; message: string; type: "success" | "error" | "info"; }

function Toast({ toasts, remove }: { toasts: ToastMsg[]; remove: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold backdrop-blur-sm border animate-in slide-in-from-bottom-3 ${t.type === "success" ? "bg-emerald-950/90 border-emerald-800/60 text-emerald-100"
          : t.type === "info" ? "bg-sky-950/90 border-sky-800/60 text-sky-100"
            : "bg-rose-950/90 border-rose-800/60 text-rose-100"
          }`}>
          {t.type === "success" ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            : t.type === "info" ? <Mail size={16} className="text-sky-400 shrink-0 mt-0.5" />
              : <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => remove(t.id)} className="opacity-50 hover:opacity-100 shrink-0"><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}

// Confirm Dialog 

interface ConfirmState {
  open: boolean; title: string; description: string;
  confirmLabel: string; danger: boolean; onConfirm: () => void;
}

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 lg:pl-72">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-7 max-w-sm w-full animate-in zoom-in-95 fade-in duration-150">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${state.danger ? "bg-rose-100 dark:bg-rose-500/15" : "bg-sky-100 dark:bg-sky-500/15"}`}>
          <AlertTriangle className={state.danger ? "text-rose-600 dark:text-rose-400" : "text-sky-600 dark:text-sky-400"} size={20} />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5">{state.title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">{state.description}</p>
        <div className="flex gap-2.5 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={() => { state.onConfirm(); onClose(); }} className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${state.danger ? "bg-rose-600 hover:bg-rose-700" : "bg-sky-600 hover:bg-sky-700"}`}>
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Donut Chart 

function DonutChart({ data, size = 100 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 36; const cx = size / 2; const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = data.filter((d) => d.value > 0).map((d) => {
    const pct = d.value / total; const dash = pct * circumference;
    const gap = circumference - dash; const rotation = offset * 360 - 90;
    offset += pct; return { ...d, dash, gap, rotation };
  });
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={10} className="text-slate-100 dark:text-slate-700" />
        {segments.map((seg, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={10}
            strokeDasharray={`${seg.dash} ${seg.gap}`} strokeLinecap="round"
            transform={`rotate(${seg.rotation} ${cx} ${cy})`} style={{ transition: "stroke-dasharray 0.6s ease" }} />
        ))}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{total}</span>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total</span>
      </div>
    </div>
  );
}

// Type Breakdown Bar 

function TypeBreakdownBar({ visitors }: { visitors: WalkInVisitor[] }) {
  const total = visitors.length;
  const counts = VISITOR_TYPES.map((t) => ({ type: t, count: visitors.filter((v) => v.type === t).length, color: TYPE_HEX[t], meta: TYPE_META[t] }));
  return (
    <div className="space-y-2.5">
      {counts.map((item) => {
        const pct = total > 0 ? (item.count / total) * 100 : 0;
        return (
          <div key={item.type}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${item.meta.dot}`} />
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{item.type}</span>
              </div>
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">{item.count}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: item.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Sparkline

function ActivitySparkline({ visitors }: { visitors: WalkInVisitor[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const dateStr = d.toISOString().slice(0, 10);
    const count = visitors.filter((v) => v.created_at?.slice(0, 10) === dateStr).length;
    return { label, count };
  });
  return (
    <div className="h-[100px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={days} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
          <defs>
            <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 800, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 700, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ stroke: "#0ea5e9", strokeWidth: 1, strokeDasharray: "4 4" }}
            contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", border: "1px solid #1e293b", fontSize: "12px", fontWeight: 700, color: "#f1f5f9" }}
            formatter={(v: number) => [v, "Visitors"]} />
          <Area type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} fill="url(#visitGrad)"
            dot={{ r: 3, fill: "#0ea5e9", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#0ea5e9", stroke: "#fff", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Walk-in Action Menu 

function WalkInActionMenu({ visitor, onEdit, onDelete, onStatusToggle }: {
  visitor: WalkInVisitor; onEdit: () => void; onDelete: () => void; onStatusToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const nextStatus = visitor.status === "Checked In" ? "Completed" : "Checked In";
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((p) => !p)} className={`p-2 rounded-lg border transition-all duration-150 ${open ? "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200" : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:border-slate-200 dark:hover:border-slate-600"}`}>
        <MoreVertical size={17} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl z-30 overflow-hidden">
          <div className="px-3 pt-2.5 pb-1"><p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</p></div>
          <button onClick={() => { onStatusToggle(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <span className={`w-2 h-2 rounded-full ${STATUS_META[nextStatus]?.dot ?? "bg-slate-400"} shrink-0`} />
            Mark as {nextStatus}
          </button>
          <div className="mx-3 my-1.5 h-px bg-slate-100 dark:bg-slate-800" />
          <div className="px-3 pb-1"><p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Manage</p></div>
          <button onClick={() => { onEdit(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <span className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center shrink-0"><Edit3 size={13} className="text-sky-600 dark:text-sky-400" /></span>
            Edit Visitor
          </button>
          <button onClick={() => { onDelete(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 mb-1 text-sm font-medium text-rose-700 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
            <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0"><Trash2 size={13} className="text-rose-700 dark:text-rose-500" /></span>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Gate Pass Action Menu 

function GatePassActionMenu({ pass, onView, onDelete }: {
  pass: GatePass; onView: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((p) => !p)} className={`p-2 rounded-lg border transition-all duration-150 ${open ? "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600" : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:border-slate-200 dark:hover:border-slate-600"}`}>
        <MoreVertical size={17} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl z-30 overflow-hidden">
          <button onClick={() => { onView(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 mt-1 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <span className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center shrink-0"><Eye size={13} className="text-sky-600 dark:text-sky-400" /></span>
            View / Edit
          </button>
          <button onClick={() => { onDelete(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 mb-1 text-sm font-medium text-rose-700 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
            <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0"><Trash2 size={13} className="text-rose-700 dark:text-rose-500" /></span>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Walk-in Form Modal

const inputCls = "w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none transition-all";

function WalkInModal({ open, onClose, editing, onSaved, addToast }: {
  open: boolean; onClose: () => void; editing: WalkInVisitor | null;
  onSaved: (v: WalkInVisitor) => void; addToast: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({ name: "", type: "Guest" as WalkInVisitor["type"], notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) setForm({ name: editing.name, type: editing.type, notes: editing.notes ?? "" });
      else setForm({ name: "", type: "Guest", notes: "" });
    }
  }, [editing, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { addToast("Name is required.", "error"); return; }
    setSaving(true);
    try {
      if (editing) {
        const { data, error } = await supabase.from("administrative_walkin_visitors").update(form).eq("id", editing.id).select().single();
        if (error) throw error;
        onSaved(data as WalkInVisitor);
        addToast(`"${form.name}" updated.`, "success");
      } else {
        const { data, error } = await supabase.from("administrative_walkin_visitors").insert([{ ...form, status: "Checked In" }]).select().single();
        if (error) throw error;
        onSaved(data as WalkInVisitor);
        addToast(`"${form.name}" checked in.`, "success");
      }
      onClose();
    } catch (err: any) {
      addToast(err.message ?? "Something went wrong.", "error");
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 lg:pl-72">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 flex items-center justify-center shrink-0">
                <UserPlus size={18} className="text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{editing ? "Edit Visitor" : "New Walk-in Check-in"}</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{editing ? "Update the visitor's details" : "Register a new on-site visitor"}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={17} /></button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input required className={inputCls} placeholder="e.g. Maria Santos" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Visitor Type</label>
              <div className="grid grid-cols-4 gap-2">
                {VISITOR_TYPES.map((type) => {
                  const m = TYPE_META[type]; const sel = form.type === type;
                  return (
                    <button key={type} type="button" onClick={() => setForm({ ...form, type })}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${sel ? `${m.bg} ${m.border} ${m.color}` : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"}`}>
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                Notes <span className="normal-case font-medium text-slate-300 dark:text-slate-600">(optional)</span>
              </label>
              <textarea rows={3} className={inputCls + " resize-none"} placeholder="Purpose of visit, host name, or remarks..."
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-sm font-bold text-white transition-colors">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : editing ? <><CheckCircle size={14} /> Save Changes</> : <><UserPlus size={14} /> Check In</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Gate Pass View/Edit Modal

function GatePassModal({ open, onClose, pass, onUpdated, addToast }: {
  open: boolean; onClose: () => void; pass: GatePass | null;
  onUpdated: (p: GatePass) => void; addToast: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const supabase = createClient();
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (open && pass) setAdminNotes(pass.admin_notes ?? "");
  }, [pass, open]);

  const updateStatus = async (newStatus: GatePass["status"]) => {
    if (!pass) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("administrative_online_gatepass")
        .update({ status: newStatus, admin_notes: adminNotes })
        .eq("id", pass.id)
        .select()
        .single();
      if (error) throw error;
      onUpdated(data as GatePass);

      if (newStatus === "approved") {
        // Send approval email via Supabase Edge Function / mailto fallback
        await sendApprovalEmail(data as GatePass);
      } else {
        addToast(`Gate pass ${newStatus}.`, "success");
      }
      onClose();
    } catch (err: any) {
      addToast(err.message ?? "Update failed.", "error");
    } finally { setSaving(false); }
  };

  const sendApprovalEmail = async (approvedPass: GatePass) => {
    setSendingEmail(true);
    try {
      // Build mailto link as fallback (opens email client)
      // For production, replace this with your email service (Resend, SendGrid, etc.)
      const subject = encodeURIComponent(`✅ Gate Pass #${approvedPass.pass_number} Approved — Envirocab`);
      const body = encodeURIComponent(
        `Dear ${approvedPass.requested_by_name},\n\n` +
        `Your gate pass request has been APPROVED.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `GATE PASS DETAILS\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Pass Number   : #${approvedPass.pass_number}\n` +
        `Visit Date    : ${new Date(approvedPass.visit_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n` +
        `Arrival Time  : ${approvedPass.expected_arrival_time}\n` +
        `Departure Time: ${approvedPass.expected_departure_time}\n` +
        `Purpose       : ${approvedPass.purpose}\n` +
        (approvedPass.department ? `Department    : ${approvedPass.department}\n` : "") +
        (approvedPass.vehicle_plate_number ? `Vehicle Plate : ${approvedPass.vehicle_plate_number}\n` : "") +
        `\n` +
        `Please present Pass #${approvedPass.pass_number} to the security guard upon arrival.\n\n` +
        `${approvedPass.admin_notes ? `Admin Notes: ${approvedPass.admin_notes}\n\n` : ""}` +
        `Regards,\nEnvirocab Administration\nbpmtnvs@gmail.com`
      );

      // Open mail client — in production swap this for an API call to Resend/SendGrid
      window.open(`mailto:${approvedPass.email}?subject=${subject}&body=${body}`, "_blank");

      addToast(`Pass #${approvedPass.pass_number} approved. Email client opened for ${approvedPass.email}.`, "success");
      addToast(`Tip: For auto-send emails, connect Resend or SendGrid in your backend.`, "info");
    } catch {
      addToast("Approved, but failed to open email client.", "error");
    } finally { setSendingEmail(false); }
  };

  if (!open || !pass) return null;
  const gm = GATE_META[pass.status];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 lg:pl-72">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl animate-in zoom-in-95 fade-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                <FileCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Gate Pass</h2>
                  <span className="text-xs font-black text-slate-400 dark:text-slate-500">#{pass.pass_number}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${gm.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${gm.dot}`} /> {gm.label}
                  </span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Requested by {pass.requested_by_name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={17} /></button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Mail size={12} />, label: "Email", value: pass.email },
                { icon: <Building2 size={12} />, label: "Department", value: pass.department || "—" },
                { icon: <CalendarDays size={12} />, label: "Visit Date", value: new Date(pass.visit_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                { icon: <Users size={12} />, label: "Participants", value: `${pass.participants_count} person${pass.participants_count !== 1 ? "s" : ""}` },
                { icon: <Timer size={12} />, label: "Arrival", value: pass.expected_arrival_time },
                { icon: <Timer size={12} />, label: "Departure", value: pass.expected_departure_time },
                ...(pass.vehicle_plate_number ? [{ icon: <Car size={12} />, label: "Vehicle Plate", value: pass.vehicle_plate_number }] : []),
                ...(pass.items_to_carry ? [{ icon: <Package size={12} />, label: "Items to Carry", value: pass.items_to_carry }] : []),
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-slate-400">{item.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Purpose */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 mb-1">
                <ClipboardList size={12} className="text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Purpose</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{pass.purpose}</p>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                Admin Notes <span className="normal-case font-medium text-slate-300 dark:text-slate-600">(optional — included in email)</span>
              </label>
              <textarea rows={2} className={inputCls + " resize-none"} placeholder="Add a note for the requester..."
                value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
            </div>

            {/* Action Buttons */}
            {pass.status === "pending" && (
              <div className="flex gap-2.5">
                <button onClick={() => updateStatus("declined")} disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-sm font-bold transition-colors disabled:opacity-50">
                  <XCircle size={15} /> Decline
                </button>
                <button onClick={() => updateStatus("approved")} disabled={saving || sendingEmail}
                  className="flex-2 flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
                  {saving || sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <><ShieldCheck size={15} /><Send size={13} /></>}
                  Approve & Send Email
                </button>
              </div>
            )}

            {pass.status === "approved" && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Approved — Pass #{pass.pass_number} was issued to {pass.email}
                </p>
                <button onClick={() => sendApprovalEmail(pass)} disabled={sendingEmail}
                  className="ml-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50">
                  {sendingEmail ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                  Resend
                </button>
              </div>
            )}

            {(pass.status === "declined" || pass.status === "expired") && (
              <button onClick={() => updateStatus("pending")} disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold transition-colors">
                <RefreshCw size={14} /> Reopen as Pending
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component 

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "Checked In", label: "Checked In" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

const GATE_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
];

type TabType = "walkin" | "online";

export default function Visitors() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [activeTab, setActiveTab] = useState<TabType>("walkin");

  // Walk-in state 
  const [visitors, setVisitors] = useState<WalkInVisitor[]>([]);
  const [allVisitors, setAllVisitors] = useState<WalkInVisitor[]>([]);
  const [walkInLoading, setWalkInLoading] = useState(true);
  const [walkInSearch, setWalkInSearch] = useState("");
  const [walkInStatusFilter, setWalkInStatusFilter] = useState("all");
  const [walkInTypeFilter, setWalkInTypeFilter] = useState("all");
  const [walkInPage, setWalkInPage] = useState(0);
  const [walkInTotal, setWalkInTotal] = useState(0);
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [walkInEditing, setWalkInEditing] = useState<WalkInVisitor | null>(null);

  // Gate pass state
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [gateLoading, setGateLoading] = useState(true);
  const [gateSearch, setGateSearch] = useState("");
  const [gateStatusFilter, setGateStatusFilter] = useState("all");
  const [gatePage, setGatePage] = useState(0);
  const [gateTotal, setGateTotal] = useState(0);
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [gateViewing, setGateViewing] = useState<GatePass | null>(null);

  // Shared state
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: "", description: "", confirmLabel: "", danger: false, onConfirm: () => { } });

  const toastId = useRef(0);
  const addToast = (message: string, type: "success" | "error" | "info") => {
    const id = ++toastId.current;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  };
  const removeToast = (id: number) => setToasts((p) => p.filter((t) => t.id !== id));

  // Fetch walk-ins 
  const fetchWalkIns = useCallback(async (isInitial = false) => {
    if (isInitial) setWalkInLoading(true);
    const from = walkInPage * ROWS_PER_PAGE;
    const to = from + ROWS_PER_PAGE - 1;
    try {
      let q = supabase.from("administrative_walkin_visitors").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
      if (walkInSearch) q = q.ilike("name", `%${walkInSearch}%`);
      if (walkInStatusFilter !== "all") q = q.eq("status", walkInStatusFilter);
      if (walkInTypeFilter !== "all") q = q.eq("type", walkInTypeFilter);
      const { data, error, count } = await q;
      if (error) throw error;
      if (data) { setVisitors(data as WalkInVisitor[]); setWalkInTotal(count ?? 0); }
    } catch (err: any) {
      if (err?.name !== "AbortError") addToast(err.message, "error");
    } finally { setWalkInLoading(false); }
  }, [walkInPage, walkInSearch, walkInStatusFilter, walkInTypeFilter]);

  const fetchAllWalkIns = useCallback(async () => {
    const { data } = await supabase.from("administrative_walkin_visitors").select("*").order("created_at", { ascending: false });
    if (data) setAllVisitors(data as WalkInVisitor[]);
  }, []);

  // ── Fetch gate passes ──────────────────────────────────────────────────────
  const fetchGatePasses = useCallback(async (isInitial = false) => {
    if (isInitial) setGateLoading(true);
    const from = gatePage * ROWS_PER_PAGE;
    const to = from + ROWS_PER_PAGE - 1;
    try {
      let q = supabase.from("administrative_online_gatepass").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
      if (gateSearch) q = q.or(`requested_by_name.ilike.%${gateSearch}%,email.ilike.%${gateSearch}%`);
      if (gateStatusFilter !== "all") q = q.eq("status", gateStatusFilter);
      const { data, error, count } = await q;
      if (error) throw error;
      if (data) { setGatePasses(data as GatePass[]); setGateTotal(count ?? 0); }
    } catch (err: any) {
      if (err?.name !== "AbortError") addToast(err.message, "error");
    } finally { setGateLoading(false); }
  }, [gatePage, gateSearch, gateStatusFilter]);

  useEffect(() => { fetchWalkIns(true); fetchAllWalkIns(); }, [fetchWalkIns]);
  useEffect(() => { fetchGatePasses(true); }, [fetchGatePasses]);

  // Realtime subscriptions
  useEffect(() => {
    const ch = supabase.channel("walkin_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "administrative_walkin_visitors" }, () => { fetchWalkIns(false); fetchAllWalkIns(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [walkInPage, walkInSearch, walkInStatusFilter, walkInTypeFilter]);

  useEffect(() => {
    const ch = supabase.channel("gate_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "administrative_online_gatepass" }, () => fetchGatePasses(false))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [gatePage, gateSearch, gateStatusFilter]);

  useEffect(() => { setWalkInPage(0); }, [walkInSearch, walkInStatusFilter, walkInTypeFilter]);
  useEffect(() => { setGatePage(0); }, [gateSearch, gateStatusFilter]);

  // Walk-in stats
  const checkedIn = allVisitors.filter((v) => v.status === "Checked In").length;
  const completed = allVisitors.filter((v) => v.status === "Completed").length;
  const cancelled = allVisitors.filter((v) => v.status === "Cancelled").length;
  const donutData = [
    { label: "Checked In", value: checkedIn, color: "#10b981" },
    { label: "Completed", value: completed, color: "#64748b" },
    { label: "Cancelled", value: cancelled, color: "#ef4444" },
  ];

  // Gate pass stats
  const pendingCount = gatePasses.filter((g) => g.status === "pending").length;

  const handleWalkInSaved = (v: WalkInVisitor) => {
    setVisitors((prev) => { const exists = prev.find((x) => x.id === v.id); return exists ? prev.map((x) => (x.id === v.id ? v : x)) : [v, ...prev]; });
    setAllVisitors((prev) => { const exists = prev.find((x) => x.id === v.id); return exists ? prev.map((x) => (x.id === v.id ? v : x)) : [v, ...prev]; });
    if (!walkInEditing) setWalkInTotal((c) => c + 1);
  };

  const handleWalkInDelete = (visitor: WalkInVisitor) => {
    setConfirm({
      open: true, title: "Delete Visitor", danger: true, confirmLabel: "Delete",
      description: `Permanently remove "${visitor.name}" from the log? This cannot be undone.`,
      onConfirm: async () => {
        const { error } = await supabase.from("administrative_walkin_visitors").delete().eq("id", visitor.id);
        if (error) addToast(error.message, "error");
        else {
          setVisitors((p) => p.filter((v) => v.id !== visitor.id));
          setAllVisitors((p) => p.filter((v) => v.id !== visitor.id));
          setWalkInTotal((c) => c - 1);
          addToast(`"${visitor.name}" removed.`, "success");
        }
      },
    });
  };

  const handleWalkInStatusToggle = async (visitor: WalkInVisitor) => {
    const next = visitor.status === "Checked In" ? "Completed" : "Checked In";
    const { error } = await supabase.from("administrative_walkin_visitors").update({ status: next, exit_time: next === "Completed" ? new Date().toISOString() : null }).eq("id", visitor.id);
    if (error) addToast(error.message, "error");
    else {
      const updated = { ...visitor, status: next as WalkInVisitor["status"] };
      setVisitors((p) => p.map((v) => (v.id === visitor.id ? updated : v)));
      setAllVisitors((p) => p.map((v) => (v.id === visitor.id ? updated : v)));
      addToast(`Marked as "${next}".`, "success");
    }
  };

  const handleGatePassDelete = (pass: GatePass) => {
    setConfirm({
      open: true, title: "Delete Gate Pass", danger: true, confirmLabel: "Delete",
      description: `Permanently remove Gate Pass #${pass.pass_number} by "${pass.requested_by_name}"? This cannot be undone.`,
      onConfirm: async () => {
        const { error } = await supabase.from("administrative_online_gatepass").delete().eq("id", pass.id);
        if (error) addToast(error.message, "error");
        else {
          setGatePasses((p) => p.filter((g) => g.id !== pass.id));
          setGateTotal((c) => c - 1);
          addToast(`Gate Pass #${pass.pass_number} deleted.`, "success");
        }
      },
    });
  };

  const handleGatePassUpdated = (updated: GatePass) => {
    setGatePasses((p) => p.map((g) => (g.id === updated.id ? updated : g)));
  };

  const walkInTotalPages = Math.ceil(walkInTotal / ROWS_PER_PAGE);
  const gateTotalPages = Math.ceil(gateTotal / ROWS_PER_PAGE);

  return (
    <>
      <Toast toasts={toasts} remove={removeToast} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm((p) => ({ ...p, open: false }))} />
      <WalkInModal open={walkInModalOpen} onClose={() => { setWalkInModalOpen(false); setWalkInEditing(null); }}
        editing={walkInEditing} onSaved={handleWalkInSaved} addToast={addToast} />
      <GatePassModal open={gateModalOpen} onClose={() => { setGateModalOpen(false); setGateViewing(null); }}
        pass={gateViewing} onUpdated={handleGatePassUpdated} addToast={addToast} />

      <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Visitor Management</h1>
              <span className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full shrink-0 shadow-[0_0_12px_-3px_rgba(16,185,129,0.3)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.15em]">
                  LOGGED
                </span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Walk-in check-ins and online gate pass requests.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => { fetchWalkIns(true); fetchAllWalkIns(); fetchGatePasses(true); }} disabled={walkInLoading || gateLoading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all">
              <RefreshCw size={13} className={(walkInLoading || gateLoading) ? "animate-spin" : ""} />
              Refresh
            </button>
            {activeTab === "walkin" && (
              <button onClick={() => { setWalkInEditing(null); setWalkInModalOpen(true); }}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold uppercase tracking-wide rounded-xl transition-all shadow-sm shadow-sky-500/20">
                <UserPlus size={14} /> New Check-in
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher  */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-700/60">
          <button onClick={() => setActiveTab("walkin")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 ${activeTab === "walkin" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
            <UserCheck size={13} /> Walk-in
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeTab === "walkin" ? "bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}>
              {walkInTotal}
            </span>
          </button>
          <button onClick={() => setActiveTab("online")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 ${activeTab === "online" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
            <FileCheck size={13} /> Online Gate Pass
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                {pendingCount} pending
              </span>
            )}
          </button>
        </div>

        {/* WALK-IN TAB */}
        {activeTab === "walkin" && (
          <>
            {/* Analytics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Status Overview</p>
                <div className="flex items-center gap-5">
                  <DonutChart data={donutData} size={100} />
                  <div className="flex flex-col gap-2.5 flex-1">
                    {donutData.map((d) => (
                      <div key={d.label} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{d.label}</span>
                        </div>
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
                <TrendingUp className="absolute -right-2 -bottom-2 w-16 h-16 opacity-5 text-sky-400" />
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">7-Day Activity</p>
                  <span className="text-xs font-black text-white">{allVisitors.length}<span className="text-slate-500 font-medium ml-1">total</span></span>
                </div>
                <ActivitySparkline visitors={allVisitors} />
              </div>
              <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow-sm sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">By Visitor Type</p>
                  <Activity size={14} className="text-slate-300 dark:text-slate-600" />
                </div>
                <TypeBreakdownBar visitors={allVisitors} />
              </div>
            </div>

            {/* Walk-in Table */}
            <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center p-3 sm:p-4 border-b border-slate-100 dark:border-slate-700/60">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  <input type="text" placeholder="Search by name…" value={walkInSearch} onChange={(e) => setWalkInSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none transition-all" />
                </div>
                <div className="flex gap-1 shrink-0 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg overflow-x-auto">
                  {STATUS_FILTERS.map((f) => (
                    <button key={f.value} onClick={() => setWalkInStatusFilter(f.value)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${walkInStatusFilter === f.value ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 shrink-0 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg overflow-x-auto">
                  <button onClick={() => setWalkInTypeFilter("all")}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${walkInTypeFilter === "all" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                    All Types
                  </button>
                  {VISITOR_TYPES.map((t) => (
                    <button key={t} onClick={() => setWalkInTypeFilter(t)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${walkInTypeFilter === t ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/20">
                      {["Visitor", "Type", "Status", "Entry Time", "Actions"].map((h) => (
                        <th key={h} className="px-4 sm:px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
                    {walkInLoading && visitors.length === 0 ? (
                      <tr><td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3"><Loader2 className="animate-spin text-slate-300 dark:text-slate-600" size={28} />
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Loading…</span></div>
                      </td></tr>
                    ) : visitors.length === 0 ? (
                      <tr><td colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Clock size={22} className="text-slate-300 dark:text-slate-600" /></div>
                          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No visitor records found.</p>
                          {(walkInSearch || walkInStatusFilter !== "all" || walkInTypeFilter !== "all") && (
                            <button onClick={() => { setWalkInSearch(""); setWalkInStatusFilter("all"); setWalkInTypeFilter("all"); }} className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">Clear filters</button>
                          )}
                        </div>
                      </td></tr>
                    ) : visitors.map((v) => {
                      const tm = TYPE_META[v.type]; const sm = STATUS_META[v.status];
                      return (
                        <tr key={v.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors duration-100">
                          <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm" style={{ backgroundColor: TYPE_HEX[v.type] + "cc" }}>
                                {v.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{v.name}</p>
                                {v.notes && <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5 max-w-[160px]">{v.notes}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${tm.bg} ${tm.border} ${tm.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${tm.dot}`} />{v.type}
                            </span>
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${sm.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />{v.status}
                            </span>
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {new Date(v.entry_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                              <CalendarDays size={10} />{new Date(v.entry_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right">
                            <WalkInActionMenu visitor={v} onEdit={() => { setWalkInEditing(v); setWalkInModalOpen(true); }}
                              onDelete={() => handleWalkInDelete(v)} onStatusToggle={() => handleWalkInStatusToggle(v)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {walkInTotalPages > 0 && (
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-transparent">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {walkInPage * ROWS_PER_PAGE + 1}–{Math.min((walkInPage + 1) * ROWS_PER_PAGE, walkInTotal)} of {walkInTotal}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setWalkInPage((p) => Math.max(p - 1, 0))} disabled={walkInPage === 0} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-slate-500 dark:text-slate-400"><ChevronLeft size={15} /></button>
                    {Array.from({ length: walkInTotalPages }, (_, i) => i).map((pn) => {
                      if (walkInTotalPages > 5 && pn > 2 && pn < walkInTotalPages - 1 && Math.abs(pn - walkInPage) > 1) { if (pn === 3) return <span key="d" className="w-7 sm:w-8 text-center text-xs text-slate-400 leading-8">…</span>; return null; }
                      return <button key={pn} onClick={() => setWalkInPage(pn)} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all ${walkInPage === pn ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>{pn + 1}</button>;
                    })}
                    <button onClick={() => setWalkInPage((p) => Math.min(p + 1, walkInTotalPages - 1))} disabled={walkInPage >= walkInTotalPages - 1} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-slate-500 dark:text-slate-400"><ChevronRight size={15} /></button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ONLINE GATE PASS TAB */}
        {activeTab === "online" && (
          <>
            {/* Gate Pass Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {GATE_PASS_STATUSES.map((s) => {
                const count = gatePasses.filter((g) => g.status === s).length;
                const gm = GATE_META[s];
                const icons: Record<string, React.ReactNode> = {
                  pending: <Timer size={16} className="text-amber-500" />,
                  approved: <ShieldCheck size={16} className="text-emerald-500" />,
                  declined: <XCircle size={16} className="text-rose-500" />,
                  expired: <Clock size={16} className="text-slate-400" />,
                };
                return (
                  <div key={s} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      {icons[s]}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${gm.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${gm.dot}`} />{gm.label}
                      </span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{count}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">gate passes</p>
                  </div>
                );
              })}
            </div>

            {/* Gate Pass Table */}
            <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center p-3 sm:p-4 border-b border-slate-100 dark:border-slate-700/60">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  <input type="text" placeholder="Search by name or email…" value={gateSearch} onChange={(e) => setGateSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none transition-all" />
                </div>
                <div className="flex gap-1 shrink-0 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg overflow-x-auto">
                  {GATE_FILTERS.map((f) => (
                    <button key={f.value} onClick={() => setGateStatusFilter(f.value)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${gateStatusFilter === f.value ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/20">
                      {["Pass #", "Requester", "Visit Date", "Purpose", "Status", "Actions"].map((h) => (
                        <th key={h} className="px-4 sm:px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
                    {gateLoading && gatePasses.length === 0 ? (
                      <tr><td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3"><Loader2 className="animate-spin text-slate-300 dark:text-slate-600" size={28} />
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Loading…</span></div>
                      </td></tr>
                    ) : gatePasses.length === 0 ? (
                      <tr><td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><FileCheck size={22} className="text-slate-300 dark:text-slate-600" /></div>
                          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No gate pass requests found.</p>
                          {(gateSearch || gateStatusFilter !== "all") && (
                            <button onClick={() => { setGateSearch(""); setGateStatusFilter("all"); }} className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">Clear filters</button>
                          )}
                        </div>
                      </td></tr>
                    ) : gatePasses.map((g) => {
                      const gm = GATE_META[g.status];
                      return (
                        <tr key={g.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors duration-100">
                          <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                            <div className="flex items-center gap-1.5">
                              <Hash size={12} className="text-slate-400" />
                              <span className="text-sm font-black text-slate-700 dark:text-slate-300">{g.pass_number}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[150px]">{g.requested_by_name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[150px] mt-0.5">{g.email}</p>
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {new Date(g.visit_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{g.expected_arrival_time} – {g.expected_departure_time}</p>
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                            <p className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[180px]">{g.purpose}</p>
                            {g.participants_count > 1 && (
                              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Users size={10} />{g.participants_count} people</p>
                            )}
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${gm.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${gm.dot}`} />{gm.label}
                            </span>
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right">
                            <GatePassActionMenu pass={g}
                              onView={() => { setGateViewing(g); setGateModalOpen(true); }}
                              onDelete={() => handleGatePassDelete(g)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {gateTotalPages > 0 && (
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-transparent">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {gatePage * ROWS_PER_PAGE + 1}–{Math.min((gatePage + 1) * ROWS_PER_PAGE, gateTotal)} of {gateTotal}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setGatePage((p) => Math.max(p - 1, 0))} disabled={gatePage === 0} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-slate-500 dark:text-slate-400"><ChevronLeft size={15} /></button>
                    {Array.from({ length: gateTotalPages }, (_, i) => i).map((pn) => {
                      if (gateTotalPages > 5 && pn > 2 && pn < gateTotalPages - 1 && Math.abs(pn - gatePage) > 1) { if (pn === 3) return <span key="d" className="w-7 sm:w-8 text-center text-xs text-slate-400 leading-8">…</span>; return null; }
                      return <button key={pn} onClick={() => setGatePage(pn)} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all ${gatePage === pn ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>{pn + 1}</button>;
                    })}
                    <button onClick={() => setGatePage((p) => Math.min(p + 1, gateTotalPages - 1))} disabled={gatePage >= gateTotalPages - 1} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-slate-500 dark:text-slate-400"><ChevronRight size={15} /></button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}