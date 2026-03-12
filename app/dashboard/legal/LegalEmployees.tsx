"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/app/utils/supabase";
import {
    User, Search, Loader2, X, ChevronLeft, ChevronRight,
    Download, Maximize2, ExternalLink, Eye, Calendar,
    Filter, ImageOff, AlertTriangle, CheckCircle2, FileText,
    ChevronDown, List, LayoutGrid, FolderOpen, BadgeCheck,
} from "lucide-react";

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════

interface EmployeeContract {
    id: number;
    employee_id: number;
    firstname: string | null;
    middlename: string | null;
    lastname: string | null;
    suffix: string | null;
    email: string | null;
    picture: string | null;
    hireddate: string | null;
    contract: string | null;
    position_label: string | null;
    method_label: string | null;
}

const PER_PAGE = 10;

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

function resolveUrl(raw: string | null, bucket: string): string {
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const sb = createClient();
    const { data } = sb.storage.from(bucket).getPublicUrl(raw);
    return data?.publicUrl ?? "";
}

function isImage(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff?)(\?.*)?$/i.test(url);
}

function isPdf(url: string): boolean {
    return /\.pdf(\?.*)?$/i.test(url);
}

function fullName(first: string | null, mid: string | null, last: string | null, suffix: string | null): string {
    return [first, mid ? mid[0] + "." : null, last, suffix].filter(Boolean).join(" ") || "—";
}

function initials(first: string | null, last: string | null): string {
    return [(first ?? "?")[0], (last ?? "?")[0]].join("").toUpperCase();
}

function maskEmail(email: string | null): string {
    if (!email) return "—";
    const at = email.indexOf("@");
    if (at === -1) return email;
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    if (local.length <= 4) {
        const masked = local[0] + "*".repeat(Math.max(1, local.length - 2)) + (local.length > 1 ? local[local.length - 1] : "");
        return `${masked}@${domain}`;
    }
    return `${local.slice(0, 2)}${"*".repeat(Math.min(6, local.length - 4))}${local.slice(-2)}@${domain}`;
}

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

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
// AVATAR
// ══════════════════════════════════════════════════════════════════

function EmpAvatar({ emp }: { emp: EmployeeContract }) {
    const [err, setErr] = useState(false);
    const picUrl = resolveUrl(emp.picture, "hr_documents");
    if (picUrl && !err) {
        return <img src={picUrl} alt={fullName(emp.firstname, emp.middlename, emp.lastname, emp.suffix)}
            onError={() => setErr(true)} className="w-10 h-10 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm shrink-0" />;
    }
    return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center shrink-0 border-2 border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs font-black text-white">{initials(emp.firstname, emp.lastname)}</span>
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
// INLINE PREVIEW
// ══════════════════════════════════════════════════════════════════

function ContractInlinePreview({ url, name, onOpen }: { url: string; name: string; onOpen: () => void }) {
    const [imgErr, setImgErr] = useState(false);
    const isImg = isImage(url) && !imgErr;
    const isPDF = isPdf(url);

    return (
        <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div onClick={onOpen}
                className="group relative w-full sm:w-44 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:shadow-lg transition-all"
                style={{ height: 130 }}>
                {isImg ? (
                    <img src={url} alt="contract" onError={() => setImgErr(true)}
                        className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300" />
                ) : isPDF ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <FileText size={26} className="text-rose-400" />
                        <span className="text-[10px] font-bold text-slate-400">PDF Document</span>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ImageOff size={20} className="text-slate-300" />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 size={16} className="text-white" />
                </div>
            </div>
            <div className="flex-1 space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Employment Contract</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{name}</p>
                <p className="text-[10px] text-slate-400 font-mono break-all">{url.split("/").pop()}</p>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button onClick={onOpen} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors">
                        <Maximize2 size={11} /> Preview
                    </button>
                    <a href={url} download target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">
                        <Download size={11} /> Download
                    </a>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">
                        <ExternalLink size={11} /> Open
                    </a>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// GRID CARD
// ══════════════════════════════════════════════════════════════════

function ContractGridCard({ emp, url, hasFile, onPreview }: {
    emp: EmployeeContract; url: string; hasFile: boolean; onPreview: () => void;
}) {
    const [imgErr, setImgErr] = useState(false);
    return (
        <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden flex flex-col hover:shadow-md transition-all">
            <div onClick={hasFile ? onPreview : undefined}
                className={`relative w-full flex items-center justify-center bg-white dark:bg-slate-800 overflow-hidden ${hasFile ? "cursor-pointer group" : ""}`}
                style={{ height: 130 }}>
                {hasFile ? (
                    isImage(url) && !imgErr ? (
                        <img src={url} alt="contract"
                            className="w-full h-full object-contain group-hover:scale-[1.04] transition-transform duration-300"
                            onError={() => setImgErr(true)} />
                    ) : isPdf(url) ? (
                        <div className="flex flex-col items-center gap-2">
                            <FileText size={26} className="text-rose-400" />
                            <span className="text-[10px] font-bold text-slate-400">PDF Contract</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <FileText size={22} className="text-slate-300" />
                            <span className="text-[10px] text-slate-400">Document</span>
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center gap-2 opacity-40">
                        <ImageOff size={22} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400">No Contract</span>
                    </div>
                )}
                {hasFile && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 size={18} className="text-white" />
                    </div>
                )}
                <div className="absolute top-2 right-2">
                    {hasFile
                        ? <span className="text-[8px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">✓ On file</span>
                        : <span className="text-[8px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full">Missing</span>}
                </div>
            </div>
            <div className="p-3 flex items-center gap-2.5">
                <EmpAvatar emp={emp} />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {fullName(emp.firstname, emp.middlename, emp.lastname, emp.suffix)}
                    </p>
                    <p className="text-[9px] font-mono text-slate-400">EMP-{emp.employee_id}</p>
                    {emp.position_label && (
                        <p className="text-[9px] text-violet-600 dark:text-violet-400 font-bold mt-0.5">{emp.position_label}</p>
                    )}
                </div>
                {hasFile && (
                    <a href={url} download target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-all shrink-0">
                        <Download size={12} />
                    </a>
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// STAT CARD
// ══════════════════════════════════════════════════════════════════

function StatCard({ label, value, icon: Icon, iconBg, iconColor, valueColor = "text-slate-900 dark:text-white", sub, progress, progressColor, borderOverride }: {
    label: string; value: number; icon: React.ElementType; iconBg: string; iconColor: string;
    valueColor?: string; sub?: string; progress?: number; progressColor?: string; borderOverride?: string;
}) {
    return (
        <div className={`bg-white dark:bg-slate-800/70 border rounded-2xl p-4 ${borderOverride ?? "border-slate-200 dark:border-slate-700/60"}`}>
            <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                <div className={`w-6 h-6 rounded-lg ${iconBg} flex items-center justify-center`}><Icon size={12} className={iconColor} /></div>
            </div>
            <p className={`text-2xl sm:text-3xl font-black tabular-nums ${valueColor}`}>{value}</p>
            {progress !== undefined && progressColor && (
                <div className="mt-2 w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${progressColor} rounded-full transition-all duration-700`} style={{ width: `${progress}%` }} />
                </div>
            )}
            {sub && <p className="text-[9px] text-slate-400 mt-1">{sub}</p>}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════

export default function LegalEmployees() {
    const [employees, setEmployees] = useState<EmployeeContract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [fContract, setFContract] = useState<"all" | "has" | "missing">("all");
    const [view, setView] = useState<"list" | "grid">("list");
    const [page, setPage] = useState(1);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const sb = createClient();
            const [empRes, posRes, metRes] = await Promise.all([
                sb.from("hr_proceedlist")
                    .select("id, employee_id, firstname, middlename, lastname, suffix, email, picture, hireddate, contract, active_employee, position, method")
                    .eq("active_employee", true)
                    .not("contract", "is", null)
                    .order("hireddate", { ascending: false }),
                sb.from("hr_position").select("position_id, position"),
                sb.from("hr_method").select("method_id, type"),
            ]);

            if (empRes.error) throw empRes.error;
            const posMap: Record<number, string> = Object.fromEntries((posRes.data ?? []).map(p => [Number(p.position_id), p.position ?? "Unknown"]));
            const metMap: Record<number, string> = Object.fromEntries((metRes.data ?? []).map(m => [Number(m.method_id), m.type ?? "Unknown"]));

            setEmployees((empRes.data ?? []).map((e: any) => ({
                id: e.id, employee_id: e.employee_id, firstname: e.firstname, middlename: e.middlename,
                lastname: e.lastname, suffix: e.suffix, email: e.email, picture: e.picture,
                hireddate: e.hireddate, contract: e.contract,
                position_label: e.position != null ? (posMap[Number(e.position)] ?? null) : null,
                method_label: e.method != null ? (metMap[Number(e.method)] ?? null) : null,
            })));
        } catch (err: any) {
            setError(err?.message ?? "Failed to load contracts.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); setExpanded(null); }, [search, fContract, view]);

    const getUrl = (emp: EmployeeContract) => resolveUrl(emp.contract, "hr_documents");

    const filtered = employees.filter(e => {
        const q = search.toLowerCase();
        const nameMatch = fullName(e.firstname, e.middlename, e.lastname, e.suffix).toLowerCase().includes(q)
            || (e.email ?? "").toLowerCase().includes(q)
            || String(e.employee_id).includes(q)
            || (e.position_label ?? "").toLowerCase().includes(q);
        const url = getUrl(e);
        if (fContract === "has") return nameMatch && !!url;
        if (fContract === "missing") return nameMatch && !url;
        return nameMatch;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const pageFrom = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const pageTo = Math.min(page * PER_PAGE, filtered.length);
    const paginated = filtered.slice(pageFrom - 1, pageTo);

    const withContract = employees.filter(e => !!getUrl(e)).length;
    const missing = employees.length - withContract;

    return (
        <>
            {lightbox && (
                <Lightbox url={lightbox.url} title={`Contract — ${lightbox.name}`} onClose={() => setLightbox(null)} />
            )}

            <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <StatCard label="Active Employees" value={employees.length} icon={User}
                        iconBg="bg-violet-50 dark:bg-violet-500/15" iconColor="text-violet-600 dark:text-violet-400" sub="With active status" />
                    <StatCard label="Have Contract" value={withContract} icon={BadgeCheck}
                        iconBg="bg-emerald-50 dark:bg-emerald-500/15" iconColor="text-emerald-600 dark:text-emerald-400"
                        valueColor="text-emerald-600 dark:text-emerald-400"
                        progress={employees.length > 0 ? Math.round((withContract / employees.length) * 100) : 0}
                        progressColor="bg-emerald-500" />
                    <div className="col-span-2 sm:col-span-1">
                        <StatCard label="Missing Contract" value={missing} icon={AlertTriangle}
                            iconBg="bg-rose-50 dark:bg-rose-500/15" iconColor="text-rose-600 dark:text-rose-400"
                            valueColor="text-rose-600 dark:text-rose-400"
                            borderOverride="border-rose-200 dark:border-rose-500/20" sub="No file uploaded" />
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3 space-y-2.5">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                            <input type="text" placeholder="Search by name, email, employee ID or position…"
                                value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all" />
                        </div>
                        <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-1 rounded-xl gap-0.5 shrink-0">
                            <button onClick={() => setView("list")} className={`p-1.5 rounded-lg transition-all ${view === "list" ? "bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white" : "text-slate-400"}`}>
                                <List size={13} />
                            </button>
                            <button onClick={() => setView("grid")} className={`p-1.5 rounded-lg transition-all ${view === "grid" ? "bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white" : "text-slate-400"}`}>
                                <LayoutGrid size={13} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter size={11} className="text-slate-400 shrink-0" />
                        <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl">
                            {([{ v: "all", label: "All" }, { v: "has", label: "✓ Has Contract" }, { v: "missing", label: "✗ Missing" }] as const).map(opt => (
                                <button key={opt.v} onClick={() => setFContract(opt.v)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${fContract === opt.v
                                        ? opt.v === "has" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-sm"
                                            : opt.v === "missing" ? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 shadow-sm"
                                                : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-3">
                        <Loader2 className="w-8 h-8 text-slate-300 dark:text-slate-600 animate-spin" />
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading contracts…</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 flex items-center justify-center">
                            <AlertTriangle size={20} className="text-rose-500" />
                        </div>
                        <p className="text-sm font-semibold text-rose-600">{error}</p>
                        <button onClick={load} className="text-xs font-bold text-slate-500 hover:underline">Try again</button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20">
                            <span className="text-xs font-semibold text-slate-400">{filtered.length} employee{filtered.length !== 1 ? "s" : ""}</span>
                            {expanded !== null && (
                                <button onClick={() => setExpanded(null)} className="text-[11px] font-bold text-slate-400 hover:text-slate-600">Collapse ↑</button>
                            )}
                        </div>

                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <FolderOpen size={22} className="text-slate-300 dark:text-slate-600" />
                                <p className="text-sm font-semibold text-slate-400">No employees match</p>
                                <button onClick={() => { setSearch(""); setFContract("all"); }} className="text-xs font-bold text-violet-600 hover:underline">Clear filters</button>
                            </div>
                        ) : view === "list" ? (
                            <div className="divide-y divide-slate-50 dark:divide-slate-700/40">
                                {paginated.map((emp, i) => {
                                    const url = getUrl(emp);
                                    const hasFile = !!url;
                                    const isExp = expanded === emp.id;
                                    return (
                                        <div key={emp.id}>
                                            <div onClick={() => hasFile && setExpanded(p => p === emp.id ? null : emp.id)}
                                                className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${hasFile ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/20" : ""}`}>
                                                <span className="w-6 text-center text-[11px] font-black text-slate-300 shrink-0 tabular-nums">{pageFrom + i}</span>
                                                <EmpAvatar emp={emp} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                            {fullName(emp.firstname, emp.middlename, emp.lastname, emp.suffix)}
                                                        </span>
                                                        <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded-md">EMP-{emp.employee_id}</span>
                                                        {emp.position_label && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30">
                                                                {emp.position_label}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">{maskEmail(emp.email)} · Hired {formatDate(emp.hireddate)}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {hasFile ? (
                                                        <>
                                                            <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                                                                <CheckCircle2 size={9} /> Uploaded
                                                            </span>
                                                            <button onClick={e => { e.stopPropagation(); setLightbox({ url, name: fullName(emp.firstname, emp.middlename, emp.lastname, emp.suffix) }); }}
                                                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 transition-all"><Eye size={13} /></button>
                                                            <a href={url} download target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 transition-all"><Download size={13} /></a>
                                                            <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${isExp ? "rotate-180" : ""}`} />
                                                        </>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                                                            <AlertTriangle size={9} /> Missing
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {isExp && hasFile && (
                                                <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/20 px-4 py-4">
                                                    <ContractInlinePreview url={url} name={fullName(emp.firstname, emp.middlename, emp.lastname, emp.suffix)}
                                                        onOpen={() => setLightbox({ url, name: fullName(emp.firstname, emp.middlename, emp.lastname, emp.suffix) })} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {paginated.map(emp => {
                                    const url = getUrl(emp);
                                    const hasFile = !!url;
                                    return (
                                        <ContractGridCard key={emp.id} emp={emp} url={url} hasFile={hasFile}
                                            onPreview={() => hasFile && setLightbox({ url, name: fullName(emp.firstname, emp.middlename, emp.lastname, emp.suffix) })} />
                                    );
                                })}
                            </div>
                        )}

                        <PaginationBar cur={page} total={totalPages} from={pageFrom} to={pageTo} count={filtered.length}
                            onChange={p => { setPage(p); setExpanded(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
                    </div>
                )}
            </div>
        </>
    );
}