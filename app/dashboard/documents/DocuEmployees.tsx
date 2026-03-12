"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/app/utils/supabase";
import {
    Users, FileText, Search, RefreshCw, Loader2, X,
    ChevronDown, ChevronLeft, ChevronRight, CheckCircle2,
    Clock, Download, AlertTriangle, LayoutGrid, List,
    Filter, Maximize2, Briefcase,
    ShieldCheck, GraduationCap, Heart, CreditCard,
    FileCheck2, IdCard, Stethoscope, Receipt, Globe,
    Building2, UserCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Position { position_id: number; position: string | null; }   // label col = position
interface Method { method_id: number; type: string | null; }       // label col = type

interface Employee {
    id: number;
    employee_id: number;
    firstname: string | null;
    middlename: string | null;
    lastname: string | null;
    suffix: string | null;
    gender: string | null;
    email: string | null;
    contactno: number | null;
    active_employee: boolean | null;
    picture: string | null;
    hireddate: string | null;
    // position & method refs
    position: number | null;
    method: number | null;
    dept_name: number | null;
    // document columns
    contract: string | null;
    coe: string | null;
    barangays: string | null;
    nbi: string | null;
    psa: string | null;
    validId1: string | null;
    validId2: string | null;
    diploma: string | null;
    medical: string | null;
    bir: string | null;
    resume: string | null;
    // joined / enriched labels
    position_label?: string;  // resolved from hr_position.position
    method_label?: string;    // resolved from hr_method.type
}

// ─── Document definitions ─────────────────────────────────────────────────────

const DOC_COLS: {
    key: keyof Employee;
    label: string;
    icon: React.ElementType;
    color: CK;
    desc: string;
}[] = [
        { key: "contract", label: "Contract", icon: FileCheck2, color: "sky", desc: "Employment contract" },
        { key: "coe", label: "COE", icon: Briefcase, color: "emerald", desc: "Certificate of Employment" },
        { key: "resume", label: "Resume", icon: FileText, color: "violet", desc: "Applicant résumé" },
        { key: "nbi", label: "NBI Clearance", icon: ShieldCheck, color: "rose", desc: "National Bureau of Investigation" },
        { key: "barangays", label: "Barangay Clearance", icon: Building2, color: "amber", desc: "Barangay clearance certificate" },
        { key: "psa", label: "PSA / Birth Cert", icon: Heart, color: "pink", desc: "PSA birth certificate" },
        { key: "validId1", label: "Valid ID 1", icon: IdCard, color: "indigo", desc: "Primary government ID" },
        { key: "validId2", label: "Valid ID 2", icon: CreditCard, color: "teal", desc: "Secondary government ID" },
        { key: "diploma", label: "Diploma / TOR", icon: GraduationCap, color: "orange", desc: "Educational credentials" },
        { key: "medical", label: "Medical Certificate", icon: Stethoscope, color: "cyan", desc: "Medical clearance" },
        { key: "bir", label: "BIR / TIN", icon: Receipt, color: "lime", desc: "Tax identification" },
    ];

type CK = "sky" | "emerald" | "violet" | "rose" | "amber" | "pink" | "indigo" | "teal" | "orange" | "cyan" | "lime";

const C: Record<CK, { bg: string; border: string; text: string; badge: string }> = {
    sky: { bg: "bg-sky-50 dark:bg-sky-500/10", border: "border-sky-200 dark:border-sky-500/30", text: "text-sky-700 dark:text-sky-300", badge: "bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
    violet: { bg: "bg-violet-50 dark:bg-violet-500/10", border: "border-violet-200 dark:border-violet-500/30", text: "text-violet-700 dark:text-violet-300", badge: "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300" },
    rose: { bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-200 dark:border-rose-500/30", text: "text-rose-700 dark:text-rose-300", badge: "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300" },
    amber: { bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/30", text: "text-amber-700 dark:text-amber-300", badge: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" },
    pink: { bg: "bg-pink-50 dark:bg-pink-500/10", border: "border-pink-200 dark:border-pink-500/30", text: "text-pink-700 dark:text-pink-300", badge: "bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300" },
    indigo: { bg: "bg-indigo-50 dark:bg-indigo-500/10", border: "border-indigo-200 dark:border-indigo-500/30", text: "text-indigo-700 dark:text-indigo-300", badge: "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300" },
    teal: { bg: "bg-teal-50 dark:bg-teal-500/10", border: "border-teal-200 dark:border-teal-500/30", text: "text-teal-700 dark:text-teal-300", badge: "bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300" },
    orange: { bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/30", text: "text-orange-700 dark:text-orange-300", badge: "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300" },
    cyan: { bg: "bg-cyan-50 dark:bg-cyan-500/10", border: "border-cyan-200 dark:border-cyan-500/30", text: "text-cyan-700 dark:text-cyan-300", badge: "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300" },
    lime: { bg: "bg-lime-50 dark:bg-lime-500/10", border: "border-lime-200 dark:border-lime-500/30", text: "text-lime-700 dark:text-lime-300", badge: "bg-lime-100 dark:bg-lime-500/20 text-lime-700 dark:text-lime-300" },
};

const PER_PAGE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fullName(e: Employee) {
    return [e.firstname, e.middlename ? e.middlename[0] + "." : null, e.lastname, e.suffix]
        .filter(Boolean).join(" ") || "—";
}

function initials(e: Employee) {
    return [(e.firstname ?? "?")[0], (e.lastname ?? "?")[0]].join("").toUpperCase();
}

/** Count how many doc columns have a value */
function docCount(e: Employee) {
    return DOC_COLS.filter(d => !!e[d.key]).length;
}

function pctInfo(e: Employee) {
    const pct = Math.round((docCount(e) / DOC_COLS.length) * 100);
    return {
        pct,
        bar: pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500",
        text: pct === 100 ? "text-emerald-500 dark:text-emerald-400" : pct >= 50 ? "text-amber-500 dark:text-amber-400" : "text-rose-500 dark:text-rose-400",
    };
}

/** Mask email: jo******ab@gmail.com — shows first 2 + last 2 chars of local part */
function maskEmail(email: string | null): string {
    if (!email) return "—";
    const [local, domain] = email.split("@");
    if (!domain) return email;
    if (local.length <= 4) {
        // very short local part — mask the middle char(s)
        const masked = local[0] + "*".repeat(Math.max(1, local.length - 2)) + (local.length > 1 ? local[local.length - 1] : "");
        return `${masked}@${domain}`;
    }
    const visible = 2;
    const start = local.slice(0, visible);
    const end = local.slice(-visible);
    const stars = "*".repeat(Math.min(6, local.length - visible * 2));
    return `${start}${stars}${end}@${domain}`;
}

/** Resolve picture URL — could be full https or path inside hr_documents bucket */
function resolvePicUrl(raw: string | null): string {
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const sb = createClient();
    const { data } = sb.storage.from("hr_documents").getPublicUrl(raw);
    return data?.publicUrl ?? "";
}

/** Resolve document URL — same logic */
function resolveDocUrl(raw: string | null): string {
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const sb = createClient();
    const { data } = sb.storage.from("hr_documents").getPublicUrl(raw);
    return data?.publicUrl ?? "";
}

// ─── Full-Screen Lightbox ─────────────────────────────────────────────────────

function Lightbox({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.97)" }}>
            <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose} />
            <button onClick={onClose}
                className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 border border-white/10">
                <X size={16} />
            </button>
            <div className="relative z-10 flex flex-col items-center gap-4 max-w-5xl w-full px-8 sm:px-16">
                <div className="relative flex items-center justify-center w-full" style={{ minHeight: "60vh" }}>
                    {!loaded && <Loader2 size={28} className="absolute text-white/30 animate-spin" />}
                    <img src={url} alt={label}
                        onLoad={() => setLoaded(true)}
                        className={`max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`} />
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center">
                    <div className="flex items-center gap-2 bg-white/10 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
                        <FileText size={11} className="text-white/60" />
                        <span className="text-white/80 text-xs font-semibold">{label}</span>
                    </div>
                    <a href={url} download target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold text-white/60 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 rounded-full transition-all">
                        <Download size={11} /> Download
                    </a>
                </div>
            </div>
        </div>
    );
}

// ─── Single Document Card ─────────────────────────────────────────────────────

function DocCard({ label, url, ck, icon: Icon, desc }: {
    label: string; url: string; ck: CK; icon: React.ElementType; desc: string;
}) {
    const c = C[ck];
    const [err, setErr] = useState(false);
    const [lb, setLb] = useState(false);

    return (
        <>
            {lb && <Lightbox url={url} label={label} onClose={() => setLb(false)} />}
            <div onClick={() => setLb(true)}
                className={`group relative rounded-xl border-2 ${c.border} bg-white dark:bg-slate-800 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-0.5 flex flex-col`}>

                {/* Image area — natural aspect ratio, no cropping */}
                <div className={`relative w-full ${c.bg} flex items-center justify-center overflow-hidden`}>
                    {!err ? (
                        <img src={url} alt={label}
                            className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                            style={{ display: "block", maxHeight: 260 }}
                            onError={() => setErr(true)} />
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-12">
                            <Icon size={28} className={`${c.text} opacity-40`} />
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">No preview</span>
                        </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <span className="p-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/10">
                            <Maximize2 size={15} className="text-white" />
                        </span>
                        <a href={url} download target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/10">
                            <Download size={15} className="text-white" />
                        </a>
                    </div>
                </div>

                {/* Footer label */}
                <div className={`px-3 py-2.5 ${c.bg} border-t ${c.border}`}>
                    <div className="flex items-center gap-1.5">
                        <Icon size={10} className={c.text} />
                        <p className={`text-[10px] font-bold truncate ${c.text}`}>{label}</p>
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{desc}</p>
                </div>
            </div>
        </>
    );
}

// ─── Missing Document Placeholder ────────────────────────────────────────────

function DocMissing({ label, ck, icon: Icon, desc }: {
    label: string; ck: CK; icon: React.ElementType; desc: string;
}) {
    const c = C[ck];
    return (
        <div className={`rounded-xl border-2 border-dashed ${c.border} flex flex-col items-center justify-center gap-2 py-8 opacity-35`}>
            <Icon size={20} className={c.text} />
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 text-center px-2">{label}</p>
            <p className="text-[8px] text-slate-300 dark:text-slate-600 text-center px-2">{desc}</p>
        </div>
    );
}

// ─── Employee Avatar ──────────────────────────────────────────────────────────

function EmpAvatar({ emp, size = "md" }: { emp: Employee; size?: "sm" | "md" | "lg" }) {
    const [err, setErr] = useState(false);
    const picUrl = resolvePicUrl(emp.picture);
    const sz = size === "sm" ? "w-9 h-9 text-xs" : size === "lg" ? "w-16 h-16 text-xl" : "w-11 h-11 text-sm";

    if (picUrl && !err) {
        return (
            <img src={picUrl} alt={fullName(emp)} onError={() => setErr(true)}
                className={`${sz} rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm shrink-0`} />
        );
    }
    return (
        <div className={`${sz} rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700 flex items-center justify-center shrink-0 shadow-sm border-2 border-slate-200 dark:border-slate-700`}>
            <span className="font-black text-white" style={{ fontSize: size === "sm" ? 11 : size === "lg" ? 20 : 13 }}>{initials(emp)}</span>
        </div>
    );
}

// ─── Method Badge ─────────────────────────────────────────────────────────────

function MethodBadge({ name }: { name?: string }) {
    if (!name) return null;
    const isOnline = name.toLowerCase().includes("online");
    return (
        <span className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${isOnline
                ? "bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"
            }`}>
            {isOnline ? <Globe size={8} /> : <UserCheck size={8} />}
            {name}
        </span>
    );
}

// ─── Position Color map (cycling) ─────────────────────────────────────────────

const POS_COLORS: CK[] = ["sky", "emerald", "violet", "amber", "rose", "indigo", "teal", "pink", "orange", "cyan", "lime"];
function posColor(posId: number | null, idx: number): CK {
    return POS_COLORS[idx % POS_COLORS.length];
}

// ─── Employee Documents Section ───────────────────────────────────────────────

function EmployeeDocSection({ emp }: { emp: Employee }) {
    const docs = DOC_COLS.map(d => ({ ...d, url: resolveDocUrl(emp[d.key] as string | null) }));
    const present = docs.filter(d => !!d.url);
    const missing = docs.filter(d => !d.url);

    return (
        <div className="space-y-5">
            {/* Profile row */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                <EmpAvatar emp={emp} size="lg" />
                <div className="flex-1 min-w-0">
                    <p className="text-base font-black text-slate-900 dark:text-white truncate">{fullName(emp)}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{maskEmail(emp.email)}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {emp.position_label && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {emp.position_label}
                            </span>
                        )}
                        <MethodBadge name={emp.method_label} />
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">
                            Hired {emp.hireddate ? new Date(emp.hireddate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </span>
                    </div>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white">{present.length}/{DOC_COLS.length}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">documents</span>
                </div>
            </div>

            {/* Present documents */}
            {present.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Uploaded Documents</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {present.map(d => (
                            <DocCard key={d.key} label={d.label} url={d.url} ck={d.color} icon={d.icon} desc={d.desc} />
                        ))}
                    </div>
                </div>
            )}

            {/* Missing documents */}
            {missing.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 dark:text-slate-600">Missing Documents</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {missing.map(d => (
                            <DocMissing key={d.key} label={d.label} ck={d.color} icon={d.icon} desc={d.desc} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── List Row ────────────────────────────────────────────────────────────────

function EmpListRow({ emp, posColorIdx, expanded, onToggle, num }: {
    emp: Employee; posColorIdx: number; expanded: boolean; onToggle: () => void; num: number;
}) {
    const { pct, bar, text } = pctInfo(emp);
    const c = C[posColor(emp.position, posColorIdx)];

    return (
        <div className={`bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden transition-all duration-200 ${expanded ? "shadow-lg" : "hover:shadow-md"}`}>
            <div onClick={onToggle}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/25 transition-colors select-none">

                <span className="w-6 text-center text-[11px] font-black text-slate-300 dark:text-slate-600 shrink-0 tabular-nums">{num}</span>

                <EmpAvatar emp={emp} size="sm" />

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{fullName(emp)}</span>
                        <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md">
                            EMP-{emp.employee_id}
                        </span>
                        {emp.position_label && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${c.badge} ${c.border}`}>
                                {emp.position_label}
                            </span>
                        )}
                        <MethodBadge name={emp.method_label} />
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {maskEmail(emp.email)} &middot; Hired {emp.hireddate ? new Date(emp.hireddate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
                    </p>
                </div>

                {/* Doc count */}
                <span className={`hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${docCount(emp) > 0 ? "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300" : "bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400"}`}>
                    {docCount(emp)}/{DOC_COLS.length}
                </span>

                {/* Progress */}
                <div className="hidden md:flex flex-col items-end gap-0.5 w-20 shrink-0">
                    <span className={`text-[10px] font-black ${text}`}>{pct}%</span>
                    <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                </div>

                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${expanded ? "bg-slate-100 dark:bg-slate-700" : ""}`}>
                    <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                </div>
            </div>

            {expanded && (
                <div className="border-t border-slate-100 dark:border-slate-700/50 px-4 pb-5 pt-4 bg-slate-50/40 dark:bg-slate-900/20">
                    <EmployeeDocSection emp={emp} />
                </div>
            )}
        </div>
    );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────

function EmpGridCard({ emp, posColorIdx, expanded, onToggle, num }: {
    emp: Employee; posColorIdx: number; expanded: boolean; onToggle: () => void; num: number;
}) {
    const { pct, bar, text } = pctInfo(emp);
    const c = C[posColor(emp.position, posColorIdx)];
    const picUrl = resolvePicUrl(emp.picture);
    const [picErr, setPicErr] = useState(false);

    return (
        <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden flex flex-col hover:shadow-lg transition-all duration-200">

            {/* Hero - profile picture */}
            <div className="relative w-full bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950 overflow-hidden" style={{ height: 100 }}>
                {picUrl && !picErr ? (
                    <img src={picUrl} alt={fullName(emp)} onError={() => setPicErr(true)}
                        className="w-full h-full object-cover opacity-60" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl font-black text-white/20 select-none">{initials(emp)}</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Number + method */}
                <div className="absolute top-2 left-2 text-[9px] font-black text-white/40">#{num}</div>
                <div className="absolute top-2 right-2"><MethodBadge name={emp.method_label} /></div>

                {/* Avatar bottom-left */}
                <div className="absolute -bottom-5 left-4">
                    <EmpAvatar emp={emp} size="md" />
                </div>
            </div>

            {/* Info */}
            <div onClick={onToggle} className="pt-7 px-4 pb-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors select-none">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{fullName(emp)}</p>
                <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">EMP-{emp.employee_id}</p>
                {emp.position_label && (
                    <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${c.badge} ${c.border}`}>
                        {emp.position_label}
                    </span>
                )}
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 truncate">{maskEmail(emp.email)}</p>

                <div className="mt-2.5 space-y-1">
                    <div className="flex justify-between">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">{docCount(emp)}/{DOC_COLS.length} docs</span>
                        <span className={`text-[9px] font-black ${text}`}>{pct}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                </div>
            </div>

            {/* Doc type quick pills */}
            <div className="px-4 pb-3 flex flex-wrap gap-1">
                {DOC_COLS.map(d => {
                    const has = !!emp[d.key];
                    const dc = C[d.color];
                    return (
                        <span key={d.key} className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border ${has ? `${dc.badge} ${dc.border}` : "bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700"}`}>
                            {d.label}
                        </span>
                    );
                })}
            </div>

            <button onClick={onToggle}
                className={`w-full py-2 border-t border-slate-100 dark:border-slate-700/50 text-[10px] font-bold transition-colors flex items-center justify-center gap-1.5 ${expanded ? "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/30"}`}>
                {expanded ? "Hide documents" : "View documents"}
                <ChevronDown size={10} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
            </button>

            {expanded && (
                <div className="border-t border-slate-100 dark:border-slate-700/50 px-4 pb-4 pt-4 bg-slate-50/40 dark:bg-slate-900/20">
                    <EmployeeDocSection emp={emp} />
                </div>
            )}
        </div>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

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
        <div className="flex items-center justify-between px-1 py-2.5 border-t border-slate-200 dark:border-slate-700/60">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium tabular-nums">{from}–{to} of {count}</span>
            <div className="flex items-center gap-1">
                <button onClick={() => onChange(cur - 1)} disabled={cur === 1}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-25 transition-all text-slate-400">
                    <ChevronLeft size={14} />
                </button>
                {pages.map((p, i) => p === "..." ? (
                    <span key={`d${i}`} className="w-7 text-center text-xs text-slate-400 select-none">…</span>
                ) : (
                    <button key={p} onClick={() => onChange(p as number)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${cur === p ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                        {p}
                    </button>
                ))}
                <button onClick={() => onChange(cur + 1)} disabled={cur === total}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-25 transition-all text-slate-400">
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DocuEmployees() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [methods, setMethods] = useState<Method[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [fPosition, setFPosition] = useState("all");
    const [fMethod, setFMethod] = useState("all");
    const [page, setPage] = useState(1);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [view, setView] = useState<"list" | "grid">("list");

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const sb = createClient();
            const [eRes, pRes, mRes] = await Promise.all([
                sb.from("hr_proceedlist")
                    .select(`id, employee_id, firstname, middlename, lastname, suffix,
                             gender, email, contactno, active_employee, picture, hireddate,
                             position, method, dept_name,
                             contract, coe, barangays, nbi, psa, "validId1", "validId2",
                             diploma, medical, bir, resume`)
                    .eq("active_employee", true)
                    .order("hireddate", { ascending: false }),
                sb.from("hr_position").select("position_id, position"),
                sb.from("hr_method").select("method_id, type"),
            ]);
            if (eRes.error) throw eRes.error;
            if (pRes.error) throw pRes.error;
            if (mRes.error) throw mRes.error;

            // posMap: position_id → hr_position.position (the label)
            const posMap = Object.fromEntries((pRes.data ?? []).map(p => [Number(p.position_id), p.position ?? "Unknown"]));
            // metMap: method_id  → hr_method.type (the label, e.g. "Walk-in" / "Online")
            const metMap = Object.fromEntries((mRes.data ?? []).map(m => [Number(m.method_id), m.type ?? "Unknown"]));

            const enriched: Employee[] = (eRes.data ?? []).map(e => ({
                ...e,
                position_label: e.position != null ? posMap[Number(e.position)] ?? "Unknown" : undefined,
                method_label: e.method != null ? metMap[Number(e.method)] ?? "Unknown" : undefined,
            }));

            setEmployees(enriched);
            setPositions(pRes.data ?? []);
            setMethods(mRes.data ?? []);
        } catch (err: any) {
            setError(err?.message ?? "Failed to load.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); setExpanded(null); }, [search, fPosition, fMethod]);

    // ── Derived ─────────────────────────────────────────────────────────────

    // Dynamic position filter options from actual data
    const usedPositionIds = Array.from(new Set(employees.map(e => Number(e.position)).filter(Boolean)));
    const filterPositions = positions.filter(p => usedPositionIds.includes(Number(p.position_id)));

    // Dynamic method filter
    const usedMethodIds = Array.from(new Set(employees.map(e => Number(e.method)).filter(Boolean)));
    const filterMethods = methods.filter(m => usedMethodIds.includes(Number(m.method_id)));

    // Build a posColor index map (stable, by position_id order)
    const posColorMap = Object.fromEntries(filterPositions.map((p, i) => [p.position_id, i]));

    const filtered = employees.filter(e => {
        const q = search.toLowerCase();
        const nameMatch = fullName(e).toLowerCase().includes(q) ||
            (e.email ?? "").toLowerCase().includes(q) ||
            String(e.employee_id).includes(q) ||
            (e.position_label ?? "").toLowerCase().includes(q);
        const posMatch = fPosition === "all" || Number(e.position) === Number(fPosition);
        const metMatch = fMethod === "all" || Number(e.method) === Number(fMethod);
        return nameMatch && posMatch && metMatch;
    });

    // Stats
    const totalEmp = employees.length;
    const fullyDone = employees.filter(e => docCount(e) === DOC_COLS.length).length;
    const withSomeDocs = employees.filter(e => docCount(e) > 0 && docCount(e) < DOC_COLS.length).length;
    const noDocs = employees.filter(e => docCount(e) === 0).length;
    const totalDocs = employees.reduce((acc, e) => acc + docCount(e), 0);

    // Breakdown by position
    const byPosition = filterPositions.map(p => ({
        ...p,
        count: employees.filter(e => Number(e.position) === Number(p.position_id)).length,
        colorIdx: posColorMap[p.position_id] ?? 0,
    }));

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const pageFrom = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const pageTo = Math.min(page * PER_PAGE, filtered.length);
    const paginated = filtered.slice(pageFrom - 1, pageTo);

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500">

            {/* ── Page header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-900 dark:from-indigo-500 dark:to-indigo-800 flex items-center justify-center shadow-sm">
                            <Users size={15} className="text-white" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            Employee Documents
                        </h1>
                    </div>
                    <p className="text-sm text-slate-400 dark:text-slate-500 ml-10">
                        Compliance & HR documents for all active employees
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {/* View toggle */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl gap-0.5">
                        <button onClick={() => setView("list")}
                            className={`p-1.5 rounded-lg transition-all ${view === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                            <List size={14} />
                        </button>
                        <button onClick={() => setView("grid")}
                            className={`p-1.5 rounded-lg transition-all ${view === "grid" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                            <LayoutGrid size={14} />
                        </button>
                    </div>
                    <button onClick={load} disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all">
                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>
            </div>

            {/* ── Stats row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Active Employees</p>
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center">
                            <Users size={12} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black tabular-nums text-slate-900 dark:text-white">{totalEmp}</p>
                    {/* Mini breakdown by position */}
                    <div className="mt-2 flex flex-wrap gap-1">
                        {byPosition.map(p => {
                            const c = C[posColor(p.position_id, p.colorIdx)];
                            return (
                                <span key={p.position_id} className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border ${c.badge} ${c.border}`}>
                                    {p.position}: {p.count}
                                </span>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Documents</p>
                        <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-500/15 flex items-center justify-center">
                            <FileText size={12} className="text-sky-600 dark:text-sky-400" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black tabular-nums text-slate-900 dark:text-white">{totalDocs}</p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">of {totalEmp * DOC_COLS.length} possible</p>
                </div>

                <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Fully Complete</p>
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center">
                            <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">{fullyDone}</p>
                    <div className="mt-2 w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                            style={{ width: totalEmp > 0 ? `${Math.round((fullyDone / totalEmp) * 100)}%` : "0%" }} />
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                        {totalEmp > 0 ? `${Math.round((fullyDone / totalEmp) * 100)}%` : "—"} of employees
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Incomplete</p>
                        <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center">
                            <Clock size={12} className="text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black tabular-nums text-amber-600 dark:text-amber-400">{withSomeDocs + noDocs}</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                            Partial: {withSomeDocs}
                        </span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                            Empty: {noDocs}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3 space-y-2.5">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                    <input type="text" placeholder="Search name, email, employee ID or position…"
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <Filter size={11} className="text-slate-400 shrink-0" />

                    {/* Position filter — dynamic from DB */}
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl overflow-x-auto max-w-full">
                        <button onClick={() => setFPosition("all")}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${fPosition === "all" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}>
                            All Positions
                        </button>
                        {filterPositions.map(p => {
                            const c = C[posColor(p.position_id, posColorMap[p.position_id] ?? 0)];
                            const active = fPosition === String(p.position_id);
                            return (
                                <button key={p.position_id} onClick={() => setFPosition(String(p.position_id))}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border ${active ? `${c.badge} ${c.border} shadow-sm` : "text-slate-500 dark:text-slate-400 hover:text-slate-700 border-transparent"}`}>
                                    {p.position}
                                </button>
                            );
                        })}
                    </div>

                    {/* Application method filter */}
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl overflow-x-auto">
                        <button onClick={() => setFMethod("all")}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${fMethod === "all" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}>
                            All Methods
                        </button>
                        {filterMethods.map(m => {
                            const isOnline = m.type?.toLowerCase().includes("online");
                            const active = fMethod === String(m.method_id);
                            return (
                                <button key={m.method_id} onClick={() => setFMethod(String(m.method_id))}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${active
                                        ? isOnline
                                            ? "bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 shadow-sm"
                                            : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}>
                                    {isOnline ? <Globe size={9} /> : <UserCheck size={9} />}
                                    {m.type ?? "Unknown"}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-3">
                    <Loader2 className="w-8 h-8 text-slate-300 dark:text-slate-600 animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading employees…</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center">
                        <AlertTriangle size={20} className="text-rose-500" />
                    </div>
                    <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
                    <button onClick={load} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Try again</button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        <Users size={20} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-400">No employees match your filters</p>
                    <button onClick={() => { setSearch(""); setFPosition("all"); setFMethod("all"); }}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                        Clear all filters
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20">
                        <span className="text-xs font-semibold text-slate-400">
                            {filtered.length} employee{filtered.length !== 1 ? "s" : ""} found
                        </span>
                        {expanded !== null && (
                            <button onClick={() => setExpanded(null)}
                                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors">
                                Collapse all ↑
                            </button>
                        )}
                    </div>

                    <div className={view === "grid"
                        ? "p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                        : "p-3 space-y-2"}>
                        {paginated.map((emp, i) =>
                            view === "list" ? (
                                <EmpListRow key={emp.id} emp={emp}
                                    posColorIdx={posColorMap[emp.position ?? -1] ?? 0}
                                    expanded={expanded === emp.id}
                                    onToggle={() => setExpanded(p => p === emp.id ? null : emp.id)}
                                    num={pageFrom + i} />
                            ) : (
                                <EmpGridCard key={emp.id} emp={emp}
                                    posColorIdx={posColorMap[emp.position ?? -1] ?? 0}
                                    expanded={expanded === emp.id}
                                    onToggle={() => setExpanded(p => p === emp.id ? null : emp.id)}
                                    num={pageFrom + i} />
                            )
                        )}
                    </div>

                    <div className="px-4">
                        <PaginationBar cur={page} total={totalPages} from={pageFrom} to={pageTo} count={filtered.length}
                            onChange={p => { setPage(p); setExpanded(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
                    </div>
                </div>
            )}
        </div>
    );
}