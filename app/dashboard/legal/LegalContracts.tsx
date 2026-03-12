"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/app/utils/supabase";
import {
    FileText, Search, Loader2, X, ChevronLeft, ChevronRight,
    Download, Maximize2, ExternalLink, Eye, Calendar,
    AlertTriangle, CheckCircle2, Plus, Pencil, Trash2,
    Building2, Filter, Clock, Ban, RefreshCw, Upload,
    FolderOpen, ChevronDown,
} from "lucide-react";

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════

type ContractType = "Internal" | "External";
type ContractStatus = "Active" | "Expired" | "Terminated";

interface AdminContract {
    id: string;
    contract_title: string;
    organization_name: string;
    contract_url: string;
    contract_type: ContractType;
    status: ContractStatus;
    expiry_date: string | null;
    created_at: string;
    updated_at: string;
}

const PER_PAGE = 10;
const STORAGE_BUCKET = "administrative_contract";

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

function resolveUrl(raw: string): string {
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const sb = createClient();
    const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(raw);
    return data?.publicUrl ?? "";
}

function isImage(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff?)(\?.*)?$/i.test(url);
}

function isPdf(url: string): boolean {
    return /\.pdf(\?.*)?$/i.test(url);
}

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isExpiringSoon(date: string | null): boolean {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // within 30 days
}

// ══════════════════════════════════════════════════════════════════
// BADGE CONFIGS
// ══════════════════════════════════════════════════════════════════

const STATUS_CFG: Record<ContractStatus, { bg: string; text: string; border: string; icon: React.ElementType }> = {
    Active: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-500/30", icon: CheckCircle2 },
    Expired: { bg: "bg-slate-100 dark:bg-slate-700", text: "text-slate-500 dark:text-slate-400", border: "border-slate-200 dark:border-slate-600", icon: Clock },
    Terminated: { bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-500/30", icon: Ban },
};

const TYPE_CFG: Record<ContractType, { bg: string; text: string; border: string }> = {
    Internal: { bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-500/30" },
    External: { bg: "bg-sky-50 dark:bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", border: "border-sky-200 dark:border-sky-500/30" },
};

// ══════════════════════════════════════════════════════════════════
// LIGHTBOX
// ══════════════════════════════════════════════════════════════════

function Lightbox({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.97)" }}>
            <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose} />
            <button onClick={onClose} className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all">
                <X size={16} />
            </button>
            <div className="relative z-10 flex flex-col items-center gap-4 max-w-5xl w-full px-6 sm:px-16">
                <div className="relative flex items-center justify-center w-full" style={{ minHeight: "65vh" }}>
                    {!loaded && <Loader2 size={28} className="absolute text-white/30 animate-spin" />}
                    {isImage(url) ? (
                        <img src={url} alt={title} onLoad={() => setLoaded(true)}
                            className={`max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`} />
                    ) : isPdf(url) ? (
                        <iframe src={url} title={title} onLoad={() => setLoaded(true)}
                            className={`w-full rounded-2xl shadow-2xl transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`} style={{ height: "75vh" }} />
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <FileText size={48} className="text-white/20" />
                            <p className="text-white/50 text-sm">Preview unavailable</p>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-center">
                    <span className="flex items-center gap-2 bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-white/80 text-xs font-semibold">
                        <FileText size={10} className="text-white/50" /> {title}
                    </span>
                    <a href={url} download target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold text-white/60 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 rounded-full transition-all">
                        <Download size={11} /> Download
                    </a>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold text-white/60 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 rounded-full transition-all">
                        <ExternalLink size={11} /> Open in tab
                    </a>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// CONTRACT FORM MODAL
// ══════════════════════════════════════════════════════════════════

interface FormState {
    contract_title: string;
    organization_name: string;
    contract_type: ContractType;
    status: ContractStatus;
    expiry_date: string;
    file: File | null;
}

const EMPTY_FORM: FormState = {
    contract_title: "",
    organization_name: "",
    contract_type: "Internal",
    status: "Active",
    expiry_date: "",
    file: null,
};

function ContractFormModal({
    mode,
    existing,
    onClose,
    onSaved,
}: {
    mode: "create" | "edit";
    existing?: AdminContract;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState<FormState>(() =>
        existing
            ? {
                contract_title: existing.contract_title,
                organization_name: existing.organization_name,
                contract_type: existing.contract_type,
                status: existing.status,
                expiry_date: existing.expiry_date ?? "",
                file: null,
            }
            : EMPTY_FORM
    );
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        setErr(null);
        if (!form.contract_title.trim() || !form.organization_name.trim()) {
            setErr("Title and organization name are required.");
            return;
        }
        if (mode === "create" && !form.file) {
            setErr("Please upload a contract file.");
            return;
        }

        setSaving(true);
        try {
            const sb = createClient();
            let contract_url = existing?.contract_url ?? "";

            if (form.file) {
                const ext = form.file.name.split(".").pop();
                const path = `contracts/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                const { error: upErr } = await sb.storage.from(STORAGE_BUCKET).upload(path, form.file, { upsert: true });
                if (upErr) throw upErr;
                contract_url = path;
            }

            const payload = {
                contract_title: form.contract_title.trim(),
                organization_name: form.organization_name.trim(),
                contract_type: form.contract_type,
                status: form.status,
                expiry_date: form.expiry_date || null,
                contract_url,
                updated_at: new Date().toISOString(),
            };

            if (mode === "create") {
                const { error: insErr } = await sb.from("administrative_contracts").insert([payload]);
                if (insErr) throw insErr;
            } else {
                const { error: updErr } = await sb.from("administrative_contracts").update(payload).eq("id", existing!.id);
                if (updErr) throw updErr;
            }

            onSaved();
        } catch (e: any) {
            setErr(e?.message ?? "Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
                            <FileText size={14} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                                {mode === "create" ? "Add New Contract" : "Edit Contract"}
                            </p>
                            <p className="text-[10px] text-slate-400">Administrative contract record</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all">
                        <X size={15} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-3.5 max-h-[70vh] overflow-y-auto">
                    {err && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold">
                            <AlertTriangle size={13} /> {err}
                        </div>
                    )}

                    <Field label="Contract Title *">
                        <input type="text" value={form.contract_title} onChange={e => set("contract_title", e.target.value)}
                            placeholder="e.g. Fleet Services Agreement"
                            className="input-style" />
                    </Field>

                    <Field label="Organization / Company *">
                        <input type="text" value={form.organization_name} onChange={e => set("organization_name", e.target.value)}
                            placeholder="e.g. Acme Transport Corp"
                            className="input-style" />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Contract Type">
                            <select value={form.contract_type} onChange={e => set("contract_type", e.target.value as ContractType)}
                                className="input-style">
                                <option value="Internal">Internal</option>
                                <option value="External">External</option>
                            </select>
                        </Field>
                        <Field label="Status">
                            <select value={form.status} onChange={e => set("status", e.target.value as ContractStatus)}
                                className="input-style">
                                <option value="Active">Active</option>
                                <option value="Expired">Expired</option>
                                <option value="Terminated">Terminated</option>
                            </select>
                        </Field>
                    </div>

                    <Field label="Expiry Date (optional)">
                        <input type="date" value={form.expiry_date} onChange={e => set("expiry_date", e.target.value)}
                            className="input-style" />
                    </Field>

                    <Field label={mode === "create" ? "Contract File *" : "Replace File (optional)"}>
                        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                            onChange={e => set("file", e.target.files?.[0] ?? null)} className="hidden" />
                        <button onClick={() => fileRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-500 transition-all">
                            <Upload size={14} />
                            {form.file ? form.file.name : "Click to upload file"}
                        </button>
                        {form.file && (
                            <p className="text-[10px] text-slate-400 mt-1">{(form.file.size / 1024).toFixed(1)} KB</p>
                        )}
                    </Field>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-50">
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        {mode === "create" ? "Save Contract" : "Update Contract"}
                    </button>
                </div>
            </div>

            <style jsx>{`
        .input-style {
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: rgb(248 250 252);
          border: 1px solid rgb(226 232 240);
          border-radius: 0.75rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          outline: none;
          transition: all 0.15s;
        }
        .dark .input-style {
          background: rgb(15 23 42 / 0.6);
          border-color: rgb(51 65 85);
          color: white;
        }
        .input-style:focus {
          border-color: rgb(99 102 241);
          box-shadow: 0 0 0 3px rgb(99 102 241 / 0.15);
        }
      `}</style>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
            {children}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// DELETE CONFIRM MODAL
// ══════════════════════════════════════════════════════════════════

function DeleteModal({ contract, onClose, onDeleted }: {
    contract: AdminContract; onClose: () => void; onDeleted: () => void;
}) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const sb = createClient();
            // Delete file from storage if it's a relative path
            if (contract.contract_url && !contract.contract_url.startsWith("http")) {
                await sb.storage.from(STORAGE_BUCKET).remove([contract.contract_url]);
            }
            const { error } = await sb.from("administrative_contracts").delete().eq("id", contract.id);
            if (error) throw error;
            onDeleted();
        } catch (e: any) {
            console.error(e);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-500/30 overflow-hidden">
                <div className="p-6 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center">
                        <Trash2 size={20} className="text-rose-500" />
                    </div>
                    <p className="text-base font-black text-slate-900 dark:text-white">Delete Contract?</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{contract.contract_title}</span> will be permanently removed along with its file.
                    </p>
                </div>
                <div className="flex gap-2 px-5 pb-5">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Cancel</button>
                    <button onClick={handleDelete} disabled={deleting}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-700 transition-all disabled:opacity-50">
                        {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// PAGINATION
// ══════════════════════════════════════════════════════════════════

function PaginationBar({ cur, total, from, to, count, onChange }: {
    cur: number; total: number; from: number; to: number; count: number; onChange: (p: number) => void;
}) {
    const pages: (number | "...")[] = [];
    if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); }
    else {
        pages.push(1);
        if (cur > 3) pages.push("...");
        for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
        if (cur < total - 2) pages.push("...");
        pages.push(total);
    }
    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700/50">
            <span className="text-xs text-slate-400 font-medium tabular-nums">{from}–{to} of {count}</span>
            <div className="flex items-center gap-1">
                <button onClick={() => onChange(cur - 1)} disabled={cur === 1}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-25 text-slate-400 transition-all">
                    <ChevronLeft size={14} />
                </button>
                {pages.map((p, i) =>
                    p === "..." ? <span key={`d${i}`} className="w-7 text-center text-xs text-slate-400">…</span> : (
                        <button key={p} onClick={() => onChange(p as number)}
                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${cur === p ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                            {p}
                        </button>
                    )
                )}
                <button onClick={() => onChange(cur + 1)} disabled={cur === total}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-25 text-slate-400 transition-all">
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// STAT CARD
// ══════════════════════════════════════════════════════════════════

function StatCard({ label, value, icon: Icon, iconBg, iconColor, valueColor = "text-slate-900 dark:text-white", sub, borderOverride }: {
    label: string; value: number; icon: React.ElementType; iconBg: string; iconColor: string;
    valueColor?: string; sub?: string; borderOverride?: string;
}) {
    return (
        <div className={`bg-white dark:bg-slate-800/70 border rounded-2xl p-4 ${borderOverride ?? "border-slate-200 dark:border-slate-700/60"}`}>
            <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                <div className={`w-6 h-6 rounded-lg ${iconBg} flex items-center justify-center`}><Icon size={12} className={iconColor} /></div>
            </div>
            <p className={`text-2xl sm:text-3xl font-black tabular-nums ${valueColor}`}>{value}</p>
            {sub && <p className="text-[9px] text-slate-400 mt-1">{sub}</p>}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════

export default function LegalContracts() {
    const [contracts, setContracts] = useState<AdminContract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [fType, setFType] = useState<"all" | ContractType>("all");
    const [fStatus, setFStatus] = useState<"all" | ContractStatus>("all");
    const [page, setPage] = useState(1);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [lightbox, setLightbox] = useState<{ url: string; title: string } | null>(null);
    const [formModal, setFormModal] = useState<{ mode: "create" | "edit"; contract?: AdminContract } | null>(null);
    const [deleteModal, setDeleteModal] = useState<AdminContract | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const sb = createClient();
            const { data, error: err } = await sb
                .from("administrative_contracts")
                .select("*")
                .order("created_at", { ascending: false });
            if (err) throw err;
            setContracts(data ?? []);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load contracts.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [search, fType, fStatus]);

    const filtered = contracts.filter(c => {
        const q = search.toLowerCase();
        const match = c.contract_title.toLowerCase().includes(q)
            || c.organization_name.toLowerCase().includes(q)
            || c.contract_type.toLowerCase().includes(q);
        return match
            && (fType === "all" || c.contract_type === fType)
            && (fStatus === "all" || c.status === fStatus);
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const pageFrom = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const pageTo = Math.min(page * PER_PAGE, filtered.length);
    const paginated = filtered.slice(pageFrom - 1, pageTo);

    const activeCount = contracts.filter(c => c.status === "Active").length;
    const expiredCount = contracts.filter(c => c.status === "Expired").length;
    const expiringSoon = contracts.filter(c => c.status === "Active" && isExpiringSoon(c.expiry_date)).length;

    return (
        <>
            {lightbox && <Lightbox url={lightbox.url} title={lightbox.title} onClose={() => setLightbox(null)} />}
            {formModal && (
                <ContractFormModal
                    mode={formModal.mode}
                    existing={formModal.contract}
                    onClose={() => setFormModal(null)}
                    onSaved={() => { setFormModal(null); load(); }}
                />
            )}
            {deleteModal && (
                <DeleteModal
                    contract={deleteModal}
                    onClose={() => setDeleteModal(null)}
                    onDeleted={() => { setDeleteModal(null); load(); }}
                />
            )}

            <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Total Contracts" value={contracts.length} icon={FileText}
                        iconBg="bg-indigo-50 dark:bg-indigo-500/15" iconColor="text-indigo-600 dark:text-indigo-400" />
                    <StatCard label="Active" value={activeCount} icon={CheckCircle2}
                        iconBg="bg-emerald-50 dark:bg-emerald-500/15" iconColor="text-emerald-600 dark:text-emerald-400"
                        valueColor="text-emerald-600 dark:text-emerald-400"
                        borderOverride="border-emerald-200 dark:border-emerald-500/20" sub="Currently valid" />
                    <StatCard label="Expiring Soon" value={expiringSoon} icon={Clock}
                        iconBg="bg-amber-50 dark:bg-amber-500/15" iconColor="text-amber-600 dark:text-amber-400"
                        valueColor="text-amber-600 dark:text-amber-400"
                        borderOverride="border-amber-200 dark:border-amber-500/20" sub="Within 30 days" />
                    <StatCard label="Expired" value={expiredCount} icon={Ban}
                        iconBg="bg-slate-100 dark:bg-slate-700" iconColor="text-slate-500 dark:text-slate-400"
                        valueColor="text-slate-500 dark:text-slate-400" sub="Need renewal" />
                </div>

                {/* Toolbar */}
                <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3 space-y-2.5">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                            <input type="text" placeholder="Search by title, organization, or type…"
                                value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
                        </div>
                        <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 transition-all" title="Refresh">
                            <RefreshCw size={14} />
                        </button>
                        <button onClick={() => setFormModal({ mode: "create" })}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shrink-0">
                            <Plus size={13} /> Add Contract
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        <Filter size={11} className="text-slate-400 shrink-0" />
                        {/* Type filter */}
                        <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl">
                            {(["all", "Internal", "External"] as const).map(v => (
                                <button key={v} onClick={() => setFType(v)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${fType === v
                                        ? v === "Internal" ? `${TYPE_CFG.Internal.bg} ${TYPE_CFG.Internal.text} shadow-sm border ${TYPE_CFG.Internal.border}`
                                            : v === "External" ? `${TYPE_CFG.External.bg} ${TYPE_CFG.External.text} shadow-sm border ${TYPE_CFG.External.border}`
                                                : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}>
                                    {v === "all" ? "All Types" : v}
                                </button>
                            ))}
                        </div>
                        {/* Status filter */}
                        <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl">
                            {(["all", "Active", "Expired", "Terminated"] as const).map(v => {
                                const cfg = v !== "all" ? STATUS_CFG[v] : null;
                                return (
                                    <button key={v} onClick={() => setFStatus(v)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${fStatus === v
                                            ? cfg ? `${cfg.bg} ${cfg.text} shadow-sm border ${cfg.border}` : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}>
                                        {v === "all" ? "All Status" : v}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-3">
                        <Loader2 className="w-8 h-8 text-slate-300 dark:text-slate-600 animate-spin" />
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading contracts…</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                            <AlertTriangle size={20} className="text-rose-500" />
                        </div>
                        <p className="text-sm font-semibold text-rose-600">{error}</p>
                        <button onClick={load} className="text-xs font-bold text-slate-500 hover:underline">Try again</button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20">
                            <span className="text-xs font-semibold text-slate-400">{filtered.length} contract{filtered.length !== 1 ? "s" : ""}</span>
                        </div>

                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <FolderOpen size={22} className="text-slate-300 dark:text-slate-600" />
                                <p className="text-sm font-semibold text-slate-400">No contracts match</p>
                                <button onClick={() => { setSearch(""); setFType("all"); setFStatus("all"); }}
                                    className="text-xs font-bold text-indigo-600 hover:underline">Clear filters</button>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50 dark:divide-slate-700/40">
                                {paginated.map((c, i) => {
                                    const url = resolveUrl(c.contract_url);
                                    const sta = STATUS_CFG[c.status];
                                    const typ = TYPE_CFG[c.contract_type];
                                    const expiring = isExpiringSoon(c.expiry_date);
                                    const isExp = expanded === c.id;

                                    return (
                                        <div key={c.id}>
                                            <div onClick={() => setExpanded(p => p === c.id ? null : c.id)}
                                                className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                                <span className="w-6 text-center text-[11px] font-black text-slate-300 shrink-0 tabular-nums">{pageFrom + i}</span>

                                                {/* Icon */}
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shrink-0">
                                                    <Building2 size={15} className="text-white" />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                                        <span className="text-sm font-black text-slate-900 dark:text-white truncate">{c.contract_title}</span>
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${typ.bg} ${typ.text} ${typ.border}`}>
                                                            {c.contract_type}
                                                        </span>
                                                        <span className={`flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full border ${sta.bg} ${sta.text} ${sta.border}`}>
                                                            <sta.icon size={8} /> {c.status}
                                                        </span>
                                                        {expiring && (
                                                            <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                                                                <Clock size={8} /> Expiring Soon
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                                                        <Building2 size={9} /> {c.organization_name}
                                                        {c.expiry_date && (
                                                            <><span className="text-slate-200 dark:text-slate-700">·</span>
                                                                <Calendar size={9} /> Expires {formatDate(c.expiry_date)}</>
                                                        )}
                                                    </p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button onClick={e => { e.stopPropagation(); if (url) setLightbox({ url, title: c.contract_title }); }}
                                                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 transition-all" title="Preview">
                                                        <Eye size={12} />
                                                    </button>
                                                    <button onClick={e => { e.stopPropagation(); setFormModal({ mode: "edit", contract: c }); }}
                                                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 transition-all" title="Edit">
                                                        <Pencil size={12} />
                                                    </button>
                                                    <button onClick={e => { e.stopPropagation(); setDeleteModal(c); }}
                                                        className="p-2 rounded-xl border border-rose-200 dark:border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 transition-all" title="Delete">
                                                        <Trash2 size={12} />
                                                    </button>
                                                    <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${isExp ? "rotate-180" : ""}`} />
                                                </div>
                                            </div>

                                            {/* Expanded */}
                                            {isExp && (
                                                <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/20 px-4 py-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {/* Preview thumb */}
                                                        {url && (
                                                            <div onClick={() => setLightbox({ url, title: c.contract_title })}
                                                                className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:shadow-md transition-all"
                                                                style={{ height: 140 }}>
                                                                {isImage(url) ? (
                                                                    <img src={url} alt={c.contract_title} className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300" />
                                                                ) : isPdf(url) ? (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                                                        <FileText size={28} className="text-rose-400" />
                                                                        <span className="text-[10px] font-bold text-slate-400">PDF Document</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <FileText size={22} className="text-slate-300" />
                                                                    </div>
                                                                )}
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <Maximize2 size={16} className="text-white" />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Details */}
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contract Details</p>
                                                            {[
                                                                { label: "Title", value: c.contract_title },
                                                                { label: "Organization", value: c.organization_name },
                                                                { label: "Type", value: c.contract_type },
                                                                { label: "Status", value: c.status },
                                                                { label: "Created", value: formatDate(c.created_at) },
                                                                ...(c.expiry_date ? [{ label: "Expires", value: formatDate(c.expiry_date) }] : []),
                                                            ].map(row => (
                                                                <div key={row.label} className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-bold text-slate-400">{row.label}</span>
                                                                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{row.value}</span>
                                                                </div>
                                                            ))}
                                                            {url && (
                                                                <div className="flex items-center gap-2 pt-1">
                                                                    <button onClick={() => setLightbox({ url, title: c.contract_title })}
                                                                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors">
                                                                        <Maximize2 size={11} /> Preview
                                                                    </button>
                                                                    <a href={url} download target="_blank" rel="noopener noreferrer"
                                                                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                                                        <Download size={11} /> Download
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <PaginationBar cur={page} total={totalPages} from={pageFrom} to={pageTo} count={filtered.length}
                            onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
                    </div>
                )}
            </div>
        </>
    );
}