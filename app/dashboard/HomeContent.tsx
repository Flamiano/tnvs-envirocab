"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Calendar, Car, ShieldCheck, CheckCircle2, Clock, Users, FileText,
  DoorOpen, TrendingUp, AlertCircle, RefreshCw, Activity, Wifi, WifiOff,
  Newspaper, Plus, Pencil, Trash2, X, Upload, Megaphone,
  BriefcaseBusiness, Eye, EyeOff, ImageIcon, ChevronDown, Tag,
  Sparkles, Building2, Heart, BookOpen,
} from "lucide-react";

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardStats {
  totalFleet: number; activeFleet: number; onboardingFleet: number;
  todayVisitors: number; checkedInVisitors: number;
  pendingGatepasses: number; approvedGatepasses: number;
  activeContracts: number; expiringContracts: number;
  totalEmployees: number; recentHires: number;
}
interface NewsPost {
  id: number; title: string; category: string; description: string;
  body: string | null; image_path: string | null; image_url: string | null;
  is_promo: boolean; promo_start: string | null; promo_end: string | null;
  is_hiring: boolean; status: string; published_at: string; created_at: string;
}
interface RecentVisitor { id: string; name: string; type: string; status: string; entry_time: string; }
interface RecentGatepass { id: string; requested_by_name: string; purpose: string; status: string; visit_date: string; department: string; }
interface FleetVehicle { id: string; unit_id: string; plate_number: string; model: string; type: string; status: string; driver_name: string; }
interface HomeContentProps { currentTab: string; setCurrentTab: (t: string) => void; adminName: string; }

const CATEGORIES = ["Company News", "Announcement", "Update", "Event"];
const STATUS_OPTIONS = ["published", "draft", "archived"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildStoragePath(isPromo: boolean, isHiring: boolean, filename: string): string {
  const folder = isPromo ? "promo" : isHiring ? "hiring" : "company";
  const base = isPromo ? "promo" : isHiring ? "hiring" : "company";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  // Result: "promo/promo_1710000000000.jpg" — matches your DB convention
  return `${folder}/${base}_${Date.now()}.${ext}`;
}

const inp = "w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 text-slate-800 placeholder:text-slate-400 transition-all";

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Checked In": "bg-emerald-100 text-emerald-700",
    Completed: "bg-slate-100 text-slate-500",
    Cancelled: "bg-red-100 text-red-600",
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    declined: "bg-red-100 text-red-600",
    expired: "bg-slate-100 text-slate-500",
    Active: "bg-emerald-100 text-emerald-700",
    Onboarding: "bg-sky-100 text-sky-700",
    Inactive: "bg-slate-100 text-slate-500",
    Maintenance: "bg-amber-100 text-amber-700",
    published: "bg-emerald-100 text-emerald-700",
    draft: "bg-amber-100 text-amber-700",
    archived: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize whitespace-nowrap ${map[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

// ─── StatCard — colored gradient (matches screenshot) ─────────────────────────
function StatCard({ icon, label, value, sub, gradient, loading }: {
  icon: React.ReactNode; label: string; value: number | string;
  sub?: string; gradient: string; loading?: boolean;
}) {
  return (
    <div className={`relative rounded-3xl p-5 overflow-hidden border border-white/10 shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${gradient}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 bg-white/20 rounded-2xl">{icon}</div>
        {sub && <span className="text-[10px] font-bold text-white/80 bg-white/20 px-2.5 py-1 rounded-full">{sub}</span>}
      </div>
      {loading
        ? <div className="h-9 w-16 bg-white/30 rounded-xl animate-pulse mb-1" />
        : <p className="text-4xl font-black text-white tracking-tight">{value}</p>}
      <p className="text-[11px] text-white/80 font-semibold mt-1">{label}</p>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{label}</label>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── NewsFormModal ─────────────────────────────────────────────────────────────
// FIX: Modal is constrained to viewport height and sits BELOW the header.
// On mobile it slides up from bottom. On desktop it's centered with max-height.
function NewsFormModal({ post, onClose, onSaved }: {
  post?: NewsPost | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!post;
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setFormState] = useState({
    title: post?.title ?? "",
    category: post?.category ?? "Company News",
    description: post?.description ?? "",
    body: post?.body ?? "",
    is_promo: post?.is_promo ?? false,
    promo_start: post?.promo_start ?? "",
    promo_end: post?.promo_end ?? "",
    is_hiring: post?.is_hiring ?? false,
    status: post?.status ?? "published",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(post?.image_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, val: unknown) =>
    setFormState(p => ({ ...p, [key]: val }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    setError(null);
    if (form.title.trim().length < 4) { setError("Title must be at least 4 characters."); return; }
    if (form.description.trim().length < 20) { setError("Description must be at least 20 characters."); return; }
    if (form.is_promo && (!form.promo_start || !form.promo_end)) { setError("Promo posts need both start and end dates."); return; }
    if (form.is_promo && form.promo_start && form.promo_end && form.promo_end < form.promo_start) { setError("Promo end must be on or after start date."); return; }

    setSaving(true);
    try {
      let image_path: string | null = post?.image_path ?? null;
      let image_url: string | null = post?.image_url ?? null;

      if (imageFile) {
        const storagePath = buildStoragePath(form.is_promo, form.is_hiring, imageFile.name);
        const { error: upErr } = await supabase.storage
          .from("news_images")
          .upload(storagePath, imageFile, { upsert: true, contentType: imageFile.type });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        const { data: urlData } = supabase.storage.from("news_images").getPublicUrl(storagePath);
        image_path = storagePath;
        image_url = urlData.publicUrl;
      }

      // Only include columns that exist in news_posts — no extra fields
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        body: form.body.trim() || null,
        is_promo: form.is_promo,
        is_hiring: form.is_hiring,
        status: form.status,
        image_path,
        image_url,
        promo_start: form.is_promo ? (form.promo_start || null) : null,
        promo_end: form.is_promo ? (form.promo_end || null) : null,
      };

      if (isEdit) {
        const { error: e } = await supabase.from("news_posts").update(payload).eq("id", post!.id);
        if (e) throw new Error(`Update failed: ${e.message}`);
      } else {
        const { error: e } = await supabase.from("news_posts").insert(payload);
        if (e) throw new Error(`Insert failed: ${e.message}`);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      console.error("[NewsFormModal]", err);
    } finally {
      setSaving(false);
    }
  };

  const folder = form.is_promo ? "promo" : form.is_hiring ? "hiring" : "company";

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/*
        ── Modal container ──
        DESKTOP: fixed, centered, max-w-2xl, does NOT exceed viewport.
                 top: accounts for the ~64px header so it never goes behind it.
        MOBILE:  slides up from bottom, max-height 90dvh so it doesn't exceed screen.
        Key: we use `inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2`
             so mobile = full-width bottom sheet, desktop = centered dialog.
      */}
      <div
        className={[
          // Positioning
          "fixed z-50",
          // Mobile — bottom sheet
          "inset-x-0 bottom-0",
          // Desktop — centered, below header
          "sm:top-[72px] sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2",
          // Sizing
          "w-full sm:max-w-2xl",
          // Height: never taller than available space
          "max-h-[90dvh] sm:max-h-[calc(100dvh-88px)]",
          // Shape
          "rounded-t-3xl sm:rounded-3xl",
          // Style
          "bg-white shadow-2xl border border-slate-200",
          // Scroll
          "flex flex-col overflow-hidden",
        ].join(" ")}
      >
        {/* ── Header (sticky inside modal) ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 rounded-xl border border-sky-100">
              <Newspaper size={16} className="text-sky-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{isEdit ? "Edit Post" : "New Post"}</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                news_posts · <span className="text-sky-500">news_images/{folder}/</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Title + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="sm:col-span-3">
              <Field label="Title" hint="* min 4 chars">
                <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Enter post title..." className={inp} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Category">
                <div className="relative">
                  <select value={form.category} onChange={e => set("category", e.target.value)} className={`${inp} appearance-none pr-9`}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </Field>
            </div>
          </div>

          {/* Description */}
          <Field label="Description" hint="* min 20 chars">
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Short description shown on preview cards..."
              rows={2}
              className={`${inp} resize-none`}
            />
            <p className={`text-right text-[10px] font-mono mt-1 ${form.description.trim().length < 20 ? "text-red-400" : "text-emerald-500"}`}>
              {form.description.trim().length} / 20 min
            </p>
          </Field>

          {/* Body */}
          <Field label="Body Content" hint="optional — full article">
            <textarea
              value={form.body}
              onChange={e => set("body", e.target.value)}
              placeholder="Full article content..."
              rows={4}
              className={`${inp} resize-none`}
            />
          </Field>

          {/* Image Upload */}
          <Field label="Cover Image" hint={`→ news_images/${folder}/`}>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-sky-400 rounded-2xl transition-colors cursor-pointer group overflow-hidden"
            >
              {imagePreview ? (
                <div className="flex items-center gap-4 p-4">
                  <div className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="preview" className="w-24 h-16 object-cover rounded-xl ring-2 ring-sky-200" />
                    <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload size={16} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Image ready</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{imageFile?.name ?? "existing image"}</p>
                    <p className="text-[10px] text-sky-500 mt-0.5 font-mono">{folder}/{imageFile?.name ?? "—"}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-7 gap-2">
                  <div className="w-11 h-11 bg-slate-100 group-hover:bg-sky-100 rounded-2xl flex items-center justify-center transition-colors">
                    <Upload size={18} className="text-slate-400 group-hover:text-sky-500 transition-colors" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">Click to upload image</p>
                  <p className="text-[11px] text-slate-400">JPG, PNG, WEBP</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </Field>

          {/* Flags */}
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: "is_promo", val: form.is_promo, label: "Promo Post", sub: "→ promo/ folder", icon: <Megaphone size={13} />, accent: "amber" },
              { key: "is_hiring", val: form.is_hiring, label: "Hiring Post", sub: "→ hiring/ folder", icon: <BriefcaseBusiness size={13} />, accent: "emerald" },
            ] as const).map(flag => (
              <label
                key={flag.key}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all select-none ${flag.val
                    ? flag.accent === "amber" ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
              >
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${flag.val
                    ? flag.accent === "amber" ? "bg-amber-500 border-amber-500" : "bg-emerald-500 border-emerald-500"
                    : "border-slate-300"
                  }`}>
                  {flag.val && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                </div>
                <input type="checkbox" className="hidden" checked={flag.val} onChange={e => set(flag.key, e.target.checked)} />
                <div>
                  <p className={`text-xs font-bold flex items-center gap-1.5 ${flag.val
                      ? flag.accent === "amber" ? "text-amber-700" : "text-emerald-700"
                      : "text-slate-600"
                    }`}>{flag.icon} {flag.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{flag.sub}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Promo dates */}
          {form.is_promo && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-200">
              {([
                { key: "promo_start", label: "Start Date", val: form.promo_start },
                { key: "promo_end", label: "End Date", val: form.promo_end },
              ] as const).map(d => (
                <Field key={d.key} label={d.label} hint="*">
                  <input
                    type="date"
                    value={d.val}
                    onChange={e => set(d.key, e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-300/50 text-slate-700"
                  />
                </Field>
              ))}
            </div>
          )}

          {/* Status */}
          <Field label="Status">
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("status", s)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all capitalize ${form.status === s
                      ? s === "published" ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200"
                        : s === "draft" ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200"
                          : "bg-slate-500 border-slate-500 text-white"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white"
                    }`}
                >
                  {s === "published" ? <Eye size={11} /> : s === "draft" ? <EyeOff size={11} /> : <Tag size={11} />}
                  {s}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* ── Footer (sticky inside modal) ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-sky-200"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : isEdit ? <Pencil size={14} /> : <Plus size={14} />}
            {saving ? "Saving…" : isEdit ? "Save Changes" : "+ Publish Post"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── DeleteConfirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ title, onClose, onConfirm, loading }: {
  title: string; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed z-50 inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-red-50 rounded-2xl border border-red-100">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Delete Post</h3>
            <p className="text-[10px] text-slate-400">This cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed mb-5">
          Delete <span className="font-bold text-slate-800">"{title}"</span>?
          The associated image will also be removed from storage.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-xl transition-all flex items-center justify-center gap-2">
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── NewsViewModal ────────────────────────────────────────────────────────────
function NewsViewModal({ post, onClose, onEdit, onDelete }: {
  post: NewsPost; onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={[
        "fixed z-50",
        "inset-x-0 bottom-0",
        "sm:top-[72px] sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2",
        "w-full sm:max-w-2xl",
        "max-h-[90dvh] sm:max-h-[calc(100dvh-88px)]",
        "rounded-t-3xl sm:rounded-3xl",
        "bg-white shadow-2xl border border-slate-200",
        "flex flex-col overflow-hidden",
      ].join(" ")}>
        {post.image_url ? (
          <div className="relative h-48 flex-shrink-0 overflow-hidden rounded-t-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent" />
            <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-black/30 backdrop-blur-sm rounded-xl border border-white/20 transition-all">
              <X size={15} className="text-white" />
            </button>
            <div className="absolute top-3 left-3 flex gap-1.5">
              {post.is_promo && <span className="bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">PROMO</span>}
              {post.is_hiring && <span className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">HIRING</span>}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {post.is_promo && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full">PROMO</span>}
              {post.is_hiring && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full">HIRING</span>}
              <StatusBadge status={post.status} />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X size={15} className="text-slate-400" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-black tracking-widest text-sky-500 uppercase">{post.category}</span>
              {post.image_url && <StatusBadge status={post.status} />}
            </div>
            <h2 className="text-xl font-black text-slate-800 leading-snug">{post.title}</h2>
            <p className="text-[11px] text-slate-400 mt-1">{new Date(post.published_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Description</p>
            <p className="text-sm text-slate-600 leading-relaxed">{post.description}</p>
          </div>
          {post.body && <p className="text-sm text-slate-500 leading-loose whitespace-pre-wrap">{post.body}</p>}
          {post.is_promo && post.promo_start && post.promo_end && (
            <div className="flex items-center gap-3 p-3.5 bg-amber-50 rounded-2xl border border-amber-100">
              <Megaphone size={14} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">Promo: <strong>{post.promo_start}</strong> → <strong>{post.promo_end}</strong></p>
            </div>
          )}
          {post.image_path && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <ImageIcon size={11} className="text-slate-400 flex-shrink-0" />
              <span className="text-[10px] font-mono text-slate-400 truncate">{post.image_path}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-white">
          <button onClick={onDelete} className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-red-500 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 rounded-xl transition-all">
            <Trash2 size={12} /> Delete
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">Close</button>
          <button onClick={onEdit} className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 rounded-xl transition-all shadow-md shadow-sky-200">
            <Pencil size={12} /> Edit Post
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HomeContent({ currentTab, setCurrentTab, adminName }: HomeContentProps) {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.toLocaleString("default", { month: "short" });
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, now.getMonth(), 1).getDay();

  // Dashboard state
  const [stats, setStats] = useState<DashboardStats>({
    totalFleet: 0, activeFleet: 0, onboardingFleet: 0,
    todayVisitors: 0, checkedInVisitors: 0,
    pendingGatepasses: 0, approvedGatepasses: 0,
    activeContracts: 0, expiringContracts: 0,
    totalEmployees: 0, recentHires: 0,
  });
  const [recentVisitors, setRecentVisitors] = useState<RecentVisitor[]>([]);
  const [recentGatepasses, setRecentGatepasses] = useState<RecentGatepass[]>([]);
  const [fleetList, setFleetList] = useState<FleetVehicle[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // News state
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsFilter, setNewsFilter] = useState<"all" | "published" | "draft" | "promo" | "hiring">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [viewingPost, setViewingPost] = useState<NewsPost | null>(null);
  const [deletingPost, setDeletingPost] = useState<NewsPost | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── fetchDashboardData ──────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const ago30 = new Date(Date.now() - 30 * 864e5).toISOString().split("T")[0];
      const fwd30 = new Date(Date.now() + 30 * 864e5).toISOString().split("T")[0];

      const [fleetRes, visitorsRes, gpRes, contractsRes, expiringRes, empRes, hiresRes, visitorList, gpList, fleetItems] =
        await Promise.all([
          supabase.from("log2_fleet").select("status", { count: "exact" }),
          supabase.from("administrative_walkin_visitors").select("*", { count: "exact" }).gte("created_at", `${today}T00:00:00`).lte("created_at", `${today}T23:59:59`),
          supabase.from("administrative_online_gatepass").select("status", { count: "exact" }).in("status", ["pending", "approved"]),
          supabase.from("administrative_contracts").select("*", { count: "exact" }).eq("status", "Active"),
          supabase.from("administrative_contracts").select("*", { count: "exact" }).eq("status", "Active").lte("expiry_date", fwd30).gte("expiry_date", today),
          supabase.from("hr_proceedlist").select("*", { count: "exact" }).eq("active_employee", true),
          supabase.from("hr_proceedlist").select("*", { count: "exact" }).gte("hireddate", `${ago30}T00:00:00`),
          supabase.from("administrative_walkin_visitors").select("id, name, type, status, entry_time").order("created_at", { ascending: false }).limit(5),
          supabase.from("administrative_online_gatepass").select("id, requested_by_name, purpose, status, visit_date, department").order("created_at", { ascending: false }).limit(5),
          supabase.from("log2_fleet").select("id, unit_id, plate_number, model, type, status, driver_name").order("created_at", { ascending: false }).limit(6),
        ]);

      const fd = fleetRes.data ?? [], gpd = gpRes.data ?? [];
      setStats({
        totalFleet: fleetRes.count ?? 0,
        activeFleet: fd.filter(v => v.status === "Active").length,
        onboardingFleet: fd.filter(v => v.status === "Onboarding").length,
        todayVisitors: visitorsRes.count ?? 0,
        checkedInVisitors: (visitorsRes.data ?? []).filter(v => v.status === "Checked In").length,
        pendingGatepasses: gpd.filter(g => g.status === "pending").length,
        approvedGatepasses: gpd.filter(g => g.status === "approved").length,
        activeContracts: contractsRes.count ?? 0,
        expiringContracts: expiringRes.count ?? 0,
        totalEmployees: empRes.count ?? 0,
        recentHires: hiresRes.count ?? 0,
      });
      setRecentVisitors(visitorList.data ?? []);
      setRecentGatepasses(gpList.data ?? []);
      setFleetList(fleetItems.data ?? []);
      setLastUpdated(new Date());
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── fetchNews ───────────────────────────────────────────────────────────────
  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      let q = supabase.from("news_posts").select("*").order("published_at", { ascending: false });
      if (newsFilter === "published") q = q.eq("status", "published");
      else if (newsFilter === "draft") q = q.eq("status", "draft");
      else if (newsFilter === "promo") q = q.eq("is_promo", true);
      else if (newsFilter === "hiring") q = q.eq("is_hiring", true);
      const { data } = await q;
      setNewsPosts(data ?? []);
    } finally {
      setNewsLoading(false);
    }
  }, [newsFilter]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  useEffect(() => { if (currentTab === "News") fetchNews(); }, [currentTab, fetchNews]);

  // ── Realtime ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const channels = [
      supabase.channel("wk-rt").on("postgres_changes", { event: "*", schema: "public", table: "administrative_walkin_visitors" }, fetchDashboardData).subscribe(),
      supabase.channel("gp-rt").on("postgres_changes", { event: "*", schema: "public", table: "administrative_online_gatepass" }, fetchDashboardData).subscribe(),
      supabase.channel("fl-rt").on("postgres_changes", { event: "*", schema: "public", table: "log2_fleet" }, fetchDashboardData).subscribe(),
      supabase.channel("ct-rt").on("postgres_changes", { event: "*", schema: "public", table: "administrative_contracts" }, fetchDashboardData).subscribe(),
      supabase.channel("nw-rt").on("postgres_changes", { event: "*", schema: "public", table: "news_posts" }, () => {
        fetchDashboardData();
        if (currentTab === "News") fetchNews();
      }).subscribe(),
    ];
    return () => { channels.forEach(c => supabase.removeChannel(c)); };
  }, [fetchDashboardData, fetchNews, currentTab]);

  // ── handleDeletePost ────────────────────────────────────────────────────────
  const handleDeletePost = async () => {
    if (!deletingPost) return;
    setDeleteLoading(true);
    try {
      if (deletingPost.image_path) {
        await supabase.storage.from("news_images").remove([deletingPost.image_path]);
      }
      await supabase.from("news_posts").delete().eq("id", deletingPost.id);
      setDeletingPost(null);
      setViewingPost(null);
      fetchNews();
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {(showForm || editingPost) && (
        <NewsFormModal
          post={editingPost}
          onClose={() => { setShowForm(false); setEditingPost(null); }}
          onSaved={fetchNews}
        />
      )}
      {viewingPost && !editingPost && !deletingPost && (
        <NewsViewModal
          post={viewingPost}
          onClose={() => setViewingPost(null)}
          onEdit={() => { setEditingPost(viewingPost); setViewingPost(null); }}
          onDelete={() => { setDeletingPost(viewingPost); setViewingPost(null); }}
        />
      )}
      {deletingPost && (
        <DeleteConfirm
          title={deletingPost.title}
          onClose={() => setDeletingPost(null)}
          onConfirm={handleDeletePost}
          loading={deleteLoading}
        />
      )}

      {/* ── Page layout ────────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-5">

        {/* Main column */}
        <div className="flex-[3] flex flex-col gap-5 min-w-0">

          {/* Tab bar + Live pill */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
              {["Dashboard", "News", "Welcome"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setCurrentTab(tab)}
                  className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${currentTab === tab
                      ? "bg-sky-500 text-white shadow-md shadow-sky-200"
                      : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm w-fit">
              {isOnline ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <Wifi size={10} className="text-emerald-500" /> LIVE
                </>
              ) : (
                <><WifiOff size={10} className="text-red-400" /> OFFLINE</>
              )}
              {lastUpdated && (
                <span className="text-slate-300">
                  · {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
              <button onClick={fetchDashboardData} className="hover:text-sky-500 transition-colors ml-1">
                <RefreshCw size={10} className={statsLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* ══ DASHBOARD ════════════════════════════════════════════════════ */}
          {currentTab === "Dashboard" && (
            <>
              {/* Hero banner */}
              <div className="relative w-full h-52 sm:h-64 rounded-[2rem] overflow-hidden bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700 flex items-end shadow-xl shadow-sky-200 border-4 border-white group">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                <div className="absolute top-6 left-8 z-10">
                  <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 rounded-full text-[10px] font-bold text-white/90 tracking-wider mb-3">
                    <Activity size={9} /> ADMIN SESSION ACTIVE
                  </span>
                  <p className="text-white/80 text-base font-medium">Welcome back,</p>
                  <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-0.5 drop-shadow-lg">{adminName}</h1>
                </div>
                <div className="absolute bottom-5 right-5 z-10 flex gap-2.5">
                  {[
                    { l: "Fleet", v: stats.totalFleet },
                    { l: "On-Site", v: stats.checkedInVisitors },
                    { l: "Pending GP", v: stats.pendingGatepasses },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl px-3.5 py-2.5 text-center">
                      <p className="text-xl font-black text-white leading-none">{statsLoading ? "—" : v}</p>
                      <p className="text-[9px] text-white/70 font-bold mt-0.5">{l}</p>
                    </div>
                  ))}
                </div>
                <div className="absolute -bottom-6 -right-6 opacity-10 group-hover:opacity-15 group-hover:scale-110 transition-all duration-1000">
                  <Car size={200} strokeWidth={1.5} className="text-white" />
                </div>
              </div>

              {/* Stats grid — colored gradients matching screenshot */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={<Car size={16} className="text-white" />} label="Total Fleet" value={stats.totalFleet} sub={`${stats.activeFleet} active`} gradient="bg-gradient-to-br from-sky-500 to-sky-700" loading={statsLoading} />
                <StatCard icon={<Users size={16} className="text-white" />} label="Today's Visitors" value={stats.todayVisitors} sub={`${stats.checkedInVisitors} on-site`} gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" loading={statsLoading} />
                <StatCard icon={<DoorOpen size={16} className="text-white" />} label="Pending GPs" value={stats.pendingGatepasses} sub={`${stats.approvedGatepasses} approved`} gradient="bg-gradient-to-br from-violet-500 to-violet-700" loading={statsLoading} />
                <StatCard icon={<FileText size={16} className="text-white" />} label="Active Contracts" value={stats.activeContracts} sub={stats.expiringContracts > 0 ? `⚠ ${stats.expiringContracts} expiring` : "All good"} gradient="bg-gradient-to-br from-amber-500 to-orange-600" loading={statsLoading} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<TrendingUp size={16} className="text-white" />} label="Active Employees" value={stats.totalEmployees} sub={`+${stats.recentHires} this month`} gradient="bg-gradient-to-br from-rose-500 to-pink-700" loading={statsLoading} />
                <StatCard icon={<ShieldCheck size={16} className="text-white" />} label="Onboarding Fleet" value={stats.onboardingFleet} sub="pending activation" gradient="bg-gradient-to-br from-teal-500 to-teal-700" loading={statsLoading} />
              </div>

              {/* Activity feed */}
              <div className="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm">
                <h4 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2 mb-5">
                  <Activity size={13} className="text-sky-500" /> Recent Activity
                </h4>

                <p className="text-[10px] font-bold tracking-widest text-slate-300 uppercase mb-3">Walk-in Visitors · Today</p>
                {statsLoading
                  ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse mb-2" />)
                  : recentVisitors.length === 0
                    ? <div className="flex items-center gap-3 py-6 text-slate-400 text-xs justify-center"><Users size={22} strokeWidth={1.5} className="opacity-40" /> No visitors today</div>
                    : <div className="space-y-2 mb-5">
                      {recentVisitors.map(v => (
                        <div key={v.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center"><Users size={13} className="text-sky-600" /></div>
                            <div><p className="text-xs font-bold text-slate-700">{v.name}</p><p className="text-[10px] text-slate-400">{v.type}</p></div>
                          </div>
                          <StatusBadge status={v.status} />
                        </div>
                      ))}
                    </div>
                }

                <p className="text-[10px] font-bold tracking-widest text-slate-300 uppercase mb-3">Gate Passes</p>
                {statsLoading
                  ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse mb-2" />)
                  : recentGatepasses.length === 0
                    ? <div className="flex items-center gap-3 py-6 text-slate-400 text-xs justify-center"><DoorOpen size={22} strokeWidth={1.5} className="opacity-40" /> No gate passes</div>
                    : <div className="space-y-2">
                      {recentGatepasses.map(gp => (
                        <div key={gp.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0"><DoorOpen size={13} className="text-violet-600" /></div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate">{gp.requested_by_name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{gp.department ?? "—"} · {gp.visit_date}</p>
                            </div>
                          </div>
                          <StatusBadge status={gp.status} />
                        </div>
                      ))}
                    </div>
                }
              </div>
            </>
          )}

          {/* ══ NEWS ══════════════════════════════════════════════════════════ */}
          {currentTab === "News" && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Newspaper size={20} className="text-sky-500" /> News Posts
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">news_posts · news_images bucket</p>
                </div>
                <button
                  onClick={() => { setEditingPost(null); setShowForm(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-2xl shadow-lg shadow-sky-200 transition-all w-fit"
                >
                  <Plus size={14} /> New Post
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-2 flex-wrap items-center">
                {(["all", "published", "draft", "promo", "hiring"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setNewsFilter(f)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${newsFilter === f
                        ? "bg-slate-800 text-white"
                        : "bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
                      }`}
                  >
                    {f === "promo" ? "🏷 Promo" : f === "hiring" ? "💼 Hiring" : f}
                  </button>
                ))}
                <span className="ml-auto text-[11px] text-slate-400">{newsPosts.length} post{newsPosts.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Grid */}
              {newsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-56 bg-slate-100 rounded-3xl animate-pulse" />)}
                </div>
              ) : newsPosts.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <Newspaper size={40} strokeWidth={1.2} className="mb-3 opacity-30" />
                  <p className="font-bold text-sm text-slate-500">No posts found</p>
                  <p className="text-xs mt-1">Click "New Post" to create one</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {newsPosts.map(post => (
                    <div
                      key={post.id}
                      onClick={() => setViewingPost(post)}
                      className="bg-white border border-slate-100 hover:border-slate-200 rounded-3xl overflow-hidden cursor-pointer group transition-all hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-0.5"
                    >
                      <div className="relative h-40 bg-slate-100 overflow-hidden">
                        {post.image_url
                          ? <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={36} strokeWidth={1.2} /></div>
                        }
                        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                          {post.is_promo && <span className="bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">PROMO</span>}
                          {post.is_hiring && <span className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">HIRING</span>}
                        </div>
                        <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); setEditingPost(post); }}
                            className="p-1.5 bg-white/90 hover:bg-sky-500 hover:text-white text-slate-600 rounded-xl shadow-sm transition-all"
                          ><Pencil size={12} /></button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeletingPost(post); }}
                            className="p-1.5 bg-white/90 hover:bg-red-500 hover:text-white text-slate-600 rounded-xl shadow-sm transition-all"
                          ><Trash2 size={12} /></button>
                        </div>
                        {post.image_path && (
                          <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white/80 text-[9px] font-mono px-2 py-0.5 rounded-lg">
                            {post.image_path}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[9px] font-black tracking-widest text-sky-500 uppercase">{post.category}</span>
                          <span className="text-slate-200">·</span>
                          <StatusBadge status={post.status} />
                        </div>
                        <h5 className="font-black text-sm text-slate-800 truncate">{post.title}</h5>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mt-1 mb-3">{post.description}</p>
                        <span className="text-[10px] text-slate-400">
                          {new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ WELCOME ═══════════════════════════════════════════════════════ */}
          {currentTab === "Welcome" && (
            <div className="flex flex-col gap-5">
              <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700 p-8 sm:p-10 shadow-xl shadow-sky-100">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-white/20 border border-white/30 rounded-2xl"><Sparkles size={22} className="text-white" /></div>
                    <div>
                      <h2 className="text-xl font-black text-white">Admin Portal</h2>
                      <p className="text-xs text-white/70">TNVS Fleet Management System</p>
                    </div>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed max-w-lg">
                    Welcome to the administrative portal. Manage fleet, visitors, gate passes, contracts, and company news — all in one place.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-5">
                    {[
                      { icon: <Car size={11} />, label: "Fleet Management" },
                      { icon: <Users size={11} />, label: "Visitor Tracking" },
                      { icon: <FileText size={11} />, label: "Contracts" },
                      { icon: <Newspaper size={11} />, label: "News & Posts" },
                    ].map(item => (
                      <span key={item.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 border border-white/30 rounded-xl text-[11px] font-bold text-white/90">
                        {item.icon} {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: <Building2 size={20} className="text-sky-500" />, title: "Company Overview", body: "Real-time fleet, visitor, and operational metrics pulled live from your Supabase backend.", bg: "bg-sky-50", border: "border-sky-100" },
                  { icon: <BookOpen size={20} className="text-violet-500" />, title: "News & Announcements", body: "Create, publish, and manage company news with image uploads to organized storage buckets.", bg: "bg-violet-50", border: "border-violet-100" },
                  { icon: <Heart size={20} className="text-rose-500" />, title: "Live Monitoring", body: "All data updates in real-time via Supabase subscriptions — no manual refresh needed.", bg: "bg-rose-50", border: "border-rose-100" },
                  { icon: <ShieldCheck size={20} className="text-emerald-500" />, title: "Secure & Reliable", body: "RLS policies ensure only authenticated admins can write, while the public can read.", bg: "bg-emerald-50", border: "border-emerald-100" },
                ].map(card => (
                  <div key={card.title} className={`p-5 ${card.bg} border ${card.border} rounded-2xl`}>
                    <div className="mb-3">{card.icon}</div>
                    <h4 className="font-black text-sm text-slate-800 mb-1.5">{card.title}</h4>
                    <p className="text-[12px] text-slate-500 leading-relaxed">{card.body}</p>
                  </div>
                ))}
              </div>

              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <h4 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
                  <Activity size={12} className="text-sky-500" /> System Snapshot
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Fleet Units", val: stats.totalFleet, color: "text-sky-500" },
                    { label: "Active Staff", val: stats.totalEmployees, color: "text-emerald-500" },
                    { label: "Live Contracts", val: stats.activeContracts, color: "text-amber-500" },
                    { label: "Today Visitors", val: stats.todayVisitors, color: "text-violet-500" },
                  ].map(s => (
                    <div key={s.label} className="text-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className={`text-2xl font-black ${s.color}`}>{statsLoading ? "—" : s.val}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ─────────────────────────────────────────────────── */}
        <div className="flex-1 xl:max-w-[280px] space-y-4">

          {/* Calendar */}
          <div className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-sky-500" />
              <h5 className="font-black text-xs tracking-wider text-slate-700">{currentMonth} {currentYear}</h5>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[10px] text-center font-bold text-slate-400 mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`b-${i}`} className="aspect-square" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1, isToday = day === currentDay;
                return (
                  <div key={day} className={`aspect-square flex items-center justify-center text-[11px] rounded-xl transition-all font-bold ${isToday ? "bg-sky-500 text-white shadow-lg shadow-sky-200 scale-110" : "text-slate-500 hover:bg-slate-100"
                    }`}>{day}</div>
                );
              })}
            </div>
          </div>

          {/* Fleet */}
          <div className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-black text-xs tracking-wider text-slate-700 flex items-center gap-2"><Car size={13} className="text-sky-500" /> Fleet</h5>
              <span className="text-[10px] text-slate-400 font-bold">{stats.totalFleet} units</span>
            </div>
            <div className="space-y-2">
              {statsLoading
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-2xl animate-pulse" />)
                : fleetList.length === 0
                  ? <p className="text-center py-4 text-slate-400 text-xs">No fleet data</p>
                  : fleetList.map(v => (
                    <div key={v.id} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-colors">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-slate-700 truncate">{v.unit_id} · {v.plate_number}</p>
                        <p className="text-[10px] text-slate-400 truncate">{v.driver_name}</p>
                      </div>
                      <StatusBadge status={v.status} />
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Infrastructure */}
          <div className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-black text-xs tracking-wider text-slate-700 flex items-center gap-2"><ShieldCheck size={13} className="text-emerald-500" /> Infrastructure</h5>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: "Main Database", stat: "STABLE", w: "98%", color: "bg-emerald-500", icon: <CheckCircle2 size={10} strokeWidth={3} />, tc: "text-emerald-600" },
                { label: "API Gateway", stat: "12ms", w: "35%", color: "bg-sky-500", icon: <Clock size={10} strokeWidth={3} />, tc: "text-sky-600" },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-[10px] font-bold mb-1.5">
                    <span className="text-slate-400">{item.label}</span>
                    <span className={`${item.tc} flex items-center gap-1`}>{item.icon} {item.stat}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full">
                    <div className={`${item.color} h-full rounded-full`} style={{ width: item.w }} />
                  </div>
                </div>
              ))}
              {stats.expiringContracts > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <AlertCircle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-bold text-amber-700">Expiring Soon</p>
                    <p className="text-[10px] text-amber-500">{stats.expiringContracts} contract{stats.expiringContracts > 1 ? "s" : ""} within 30 days</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}