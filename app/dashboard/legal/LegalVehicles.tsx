"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/app/utils/supabase";
import {
    Car, Search, Loader2, X, ChevronLeft, ChevronRight,
    Download, Maximize2, ExternalLink, Eye, Calendar,
    Filter, ImageOff, AlertTriangle, CheckCircle2,
    FileText, ShieldCheck, ShieldAlert, Image as ImageIcon,
    RefreshCw, Clock, Battery, Fuel,
} from "lucide-react";

// ══════════════════════════════════════════════════════════════════
// TYPES  — match exact Supabase schema
// ══════════════════════════════════════════════════════════════════

interface VehicleDoc {
    id: string;
    vehicle_id: string;
    document_type: string;
    file_url: string;       // always a fully-resolved public URL after load()
    verified: boolean | null;
    created_at: string;
}

interface Vehicle {
    id: string;
    unit_id: string;
    plate_number: string;
    model: string;
    type: string;
    status: string | null;
    condition: string | null;
    battery_health: string | null;
    fuel_level: string | null;
    driver_name: string | null;
    email: string | null;
    docs: VehicleDoc[];
}

const PER_PAGE = 8;
const BUCKET = "log2_vehicle-docs";

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
    });
}

function isImage(url: string) {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff?)(\?.*)?$/i.test(url);
}

function isPdf(url: string) {
    return /\.pdf(\?.*)?$/i.test(url);
}

// Status badge colours
const STATUS_BADGE: Record<string, string> = {
    Active: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30",
    Onboarding: "bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30",
    Inactive: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600",
    Suspended: "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30",
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
            <button onClick={onClose}
                className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all hover:scale-110">
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
                            className={`w-full rounded-2xl shadow-2xl transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
                            style={{ height: "75vh" }} />
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <FileText size={48} className="text-white/20" />
                            <p className="text-white/50 text-sm">Preview unavailable</p>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-center">
                    <div className="flex items-center gap-2 bg-white/10 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
                        <FileText size={10} className="text-white/50" />
                        <span className="text-white/80 text-xs font-semibold">{title}</span>
                    </div>
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
// DOC THUMBNAIL
// ══════════════════════════════════════════════════════════════════

function DocThumb({ doc, onClick }: { doc: VehicleDoc; onClick: () => void }) {
    const [imgErr, setImgErr] = useState(false);
    const url = doc.file_url;
    const isImg = isImage(url) && !imgErr;
    const isPDF = isPdf(url);
    const isInsurance = doc.document_type === "Insurance";

    return (
        <div onClick={onClick}
            className="group relative cursor-pointer rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg transition-all"
            style={{ height: 120 }}>
            {isImg ? (
                <img src={url} alt={doc.document_type} onError={() => setImgErr(true)}
                    className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300" />
            ) : isPDF ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-rose-50 dark:bg-rose-500/10">
                    <FileText size={22} className="text-rose-400" />
                    <span className="text-[9px] font-bold text-slate-500">PDF</span>
                </div>
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <ImageOff size={18} className="text-slate-300" />
                </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 size={14} className="text-white" />
            </div>
            <div className="absolute top-1.5 left-1.5">
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${isInsurance ? "bg-violet-600 text-white" : "bg-sky-600 text-white"}`}>
                    {doc.document_type}
                </span>
            </div>
            <div className="absolute top-1.5 right-1.5">
                {doc.verified
                    ? <span className="text-[8px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">✓</span>
                    : <span className="text-[8px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full">?</span>}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// VEHICLE CARD
// ══════════════════════════════════════════════════════════════════

function VehicleCard({ vehicle, onLightbox }: {
    vehicle: Vehicle;
    onLightbox: (url: string, title: string) => void;
}) {
    const insurance = vehicle.docs.find(d => d.document_type === "Insurance");
    const photos = vehicle.docs.filter(d => d.document_type === "Unit_Photos" || d.document_type === "Unit Photos");
    const otherDocs = vehicle.docs.filter(d =>
        d.document_type !== "Insurance" &&
        d.document_type !== "Unit_Photos" &&
        d.document_type !== "Unit Photos"
    );
    const insuranceUrl = insurance?.file_url ?? null;
    const isInsuranceVerified = insurance?.verified ?? false;
    const displayName = `${vehicle.model} (${vehicle.plate_number})`;
    const statusBadge = STATUS_BADGE[vehicle.status ?? ""] ?? STATUS_BADGE.Inactive;

    return (
        <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden hover:shadow-md transition-all">

            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center shrink-0">
                    <Car size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate">{vehicle.model}</p>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${statusBadge}`}>
                            {vehicle.status ?? "Unknown"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-[9px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-md">
                            {vehicle.plate_number}
                        </span>
                        <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-md">
                            {vehicle.unit_id}
                        </span>
                        {vehicle.type && (
                            <span className="text-[9px] text-slate-400">{vehicle.type}</span>
                        )}
                    </div>
                </div>

                {/* Legal status */}
                <div className="shrink-0">
                    {!insurance ? (
                        <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                            <ShieldAlert size={9} /> No Insurance
                        </span>
                    ) : isInsuranceVerified ? (
                        <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                            <ShieldCheck size={9} /> Legal to Drive
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                            <Clock size={9} /> Pending Verify
                        </span>
                    )}
                </div>
            </div>

            {/* ── Meta row (driver / condition / battery / fuel) ── */}
            <div className="px-4 py-2 flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-100 dark:border-slate-700/40 bg-white dark:bg-transparent">
                {vehicle.driver_name && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        👤 {vehicle.driver_name}
                    </span>
                )}
                {vehicle.condition && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        🔧 {vehicle.condition}
                    </span>
                )}
                {vehicle.battery_health && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <Battery size={9} /> {vehicle.battery_health}
                    </span>
                )}
                {vehicle.fuel_level && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <Fuel size={9} /> {vehicle.fuel_level}
                    </span>
                )}
            </div>

            {/* ── Body ── */}
            <div className="p-3 space-y-3">

                {/* Insurance section */}
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1">
                        <ShieldCheck size={9} /> Insurance
                    </p>
                    {insurance && insuranceUrl ? (
                        <div className="flex items-center gap-2">
                            <DocThumb doc={insurance} onClick={() => onLightbox(insuranceUrl, `Insurance — ${displayName}`)} />
                            <div className="flex-1 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    {isInsuranceVerified ? (
                                        <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                                            <CheckCircle2 size={8} /> Verified
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                                            <AlertTriangle size={8} /> Unverified
                                        </span>
                                    )}
                                </div>
                                <p className="text-[9px] text-slate-400 flex items-center gap-1">
                                    <Calendar size={8} /> {formatDate(insurance.created_at)}
                                </p>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => onLightbox(insuranceUrl, `Insurance — ${displayName}`)}
                                        className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors">
                                        <Eye size={9} /> View
                                    </button>
                                    <a href={insuranceUrl} download target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 border border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                        <Download size={9} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-16 rounded-xl bg-rose-50/50 dark:bg-rose-500/5 border border-dashed border-rose-200 dark:border-rose-500/20">
                            <p className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                                <AlertTriangle size={10} /> No insurance document
                            </p>
                        </div>
                    )}
                </div>

                {/* Unit Photos */}
                {photos.length > 0 && (
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1">
                            <ImageIcon size={9} /> Unit Photos
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {photos.map(doc => (
                                <DocThumb key={doc.id} doc={doc}
                                    onClick={() => onLightbox(doc.file_url, `Photo — ${displayName}`)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Other docs */}
                {otherDocs.length > 0 && (
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
                            Other Documents ({otherDocs.length})
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {otherDocs.map(doc => (
                                <DocThumb key={doc.id} doc={doc}
                                    onClick={() => onLightbox(doc.file_url, `${doc.document_type} — ${displayName}`)} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// PAGINATION
// ══════════════════════════════════════════════════════════════════

function PaginationBar({ cur, total, from, to, count, onChange }: {
    cur: number; total: number; from: number; to: number; count: number;
    onChange: (p: number) => void;
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
                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${cur === p
                                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600"
                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
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
                <div className={`w-6 h-6 rounded-lg ${iconBg} flex items-center justify-center`}>
                    <Icon size={12} className={iconColor} />
                </div>
            </div>
            <p className={`text-2xl sm:text-3xl font-black tabular-nums ${valueColor}`}>{value}</p>
            {sub && <p className="text-[9px] text-slate-400 mt-1">{sub}</p>}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function LegalVehicles() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [fVerified, setFVerified] = useState<"all" | "verified" | "unverified" | "no-insurance">("all");
    const [page, setPage] = useState(1);
    const [lightbox, setLightbox] = useState<{ url: string; title: string } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const sb = createClient();

            const [fleetRes, docsRes] = await Promise.all([
                sb.from("log2_fleet")
                    .select("id, unit_id, plate_number, model, type, status, condition, battery_health, fuel_level, driver_name, email")
                    .order("created_at", { ascending: false }),
                sb.from("log2_vehicle_documents")
                    .select("id, vehicle_id, document_type, file_url, verified, created_at")
                    .in("document_type", ["Insurance", "Unit_Photos", "Unit Photos"]),
            ]);

            if (fleetRes.error) throw fleetRes.error;
            if (docsRes.error) throw docsRes.error;

            // ── Resolve every file_url to a full public URL at fetch time ──
            const resolvedDocs: VehicleDoc[] = (docsRes.data ?? []).map((d: any) => {
                let url = d.file_url ?? "";
                if (url && !url.startsWith("http")) {
                    const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(url);
                    url = urlData?.publicUrl ?? "";
                }
                return {
                    id: d.id,
                    vehicle_id: d.vehicle_id,
                    document_type: d.document_type,
                    file_url: url,
                    verified: d.verified,
                    created_at: d.created_at,
                };
            });

            // Group docs by vehicle_id
            const docsByVehicle: Record<string, VehicleDoc[]> = {};
            for (const doc of resolvedDocs) {
                if (!doc.vehicle_id) continue;
                if (!docsByVehicle[doc.vehicle_id]) docsByVehicle[doc.vehicle_id] = [];
                docsByVehicle[doc.vehicle_id].push(doc);
            }

            const enriched: Vehicle[] = (fleetRes.data ?? []).map((v: any) => ({
                id: v.id,
                unit_id: v.unit_id,
                plate_number: v.plate_number,
                model: v.model,
                type: v.type,
                status: v.status,
                condition: v.condition,
                battery_health: v.battery_health,
                fuel_level: v.fuel_level,
                driver_name: v.driver_name,
                email: v.email,
                docs: docsByVehicle[v.id] ?? [],
            }));

            setVehicles(enriched);
        } catch (err: any) {
            setError(err?.message ?? "Failed to load vehicle documents.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [search, fVerified]);

    // ── Stats ──
    const withInsurance = vehicles.filter(v => v.docs.some(d => d.document_type === "Insurance")).length;
    const verified = vehicles.filter(v => v.docs.some(d => d.document_type === "Insurance" && d.verified)).length;
    const unverified = withInsurance - verified;
    const noInsurance = vehicles.length - withInsurance;

    // ── Filter ──
    const filtered = vehicles.filter(v => {
        const q = search.toLowerCase();
        const display = [v.model, v.plate_number, v.unit_id, v.type, v.driver_name, v.status, v.condition]
            .filter(Boolean).join(" ").toLowerCase();
        const nameMatch = display.includes(q);
        const ins = v.docs.find(d => d.document_type === "Insurance");
        if (fVerified === "verified") return nameMatch && !!ins?.verified;
        if (fVerified === "unverified") return nameMatch && !!ins && !ins.verified;
        if (fVerified === "no-insurance") return nameMatch && !ins;
        return nameMatch;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const pageFrom = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const pageTo = Math.min(page * PER_PAGE, filtered.length);
    const paginated = filtered.slice(pageFrom - 1, pageTo);

    return (
        <>
            {lightbox && (
                <Lightbox url={lightbox.url} title={lightbox.title} onClose={() => setLightbox(null)} />
            )}

            <div className="space-y-4">

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Total Vehicles" value={vehicles.length} icon={Car}
                        iconBg="bg-sky-50 dark:bg-sky-500/15" iconColor="text-sky-600 dark:text-sky-400" />
                    <StatCard label="Legal to Drive" value={verified} icon={ShieldCheck}
                        iconBg="bg-emerald-50 dark:bg-emerald-500/15" iconColor="text-emerald-600 dark:text-emerald-400"
                        valueColor="text-emerald-600 dark:text-emerald-400"
                        borderOverride="border-emerald-200 dark:border-emerald-500/20" sub="Verified insurance" />
                    <StatCard label="Pending Verify" value={unverified} icon={AlertTriangle}
                        iconBg="bg-amber-50 dark:bg-amber-500/15" iconColor="text-amber-600 dark:text-amber-400"
                        valueColor="text-amber-600 dark:text-amber-400"
                        borderOverride="border-amber-200 dark:border-amber-500/20" sub="Insurance uploaded" />
                    <StatCard label="No Insurance" value={noInsurance} icon={ShieldAlert}
                        iconBg="bg-rose-50 dark:bg-rose-500/15" iconColor="text-rose-600 dark:text-rose-400"
                        valueColor="text-rose-600 dark:text-rose-400"
                        borderOverride="border-rose-200 dark:border-rose-500/20" sub="Not road legal" />
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3 space-y-2.5">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                            <input type="text" placeholder="Search by plate, unit ID, model, driver, status…"
                                value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none transition-all" />
                        </div>
                        <button onClick={load}
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 transition-all" title="Refresh">
                            <RefreshCw size={14} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Filter size={11} className="text-slate-400 shrink-0" />
                        <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl">
                            {([
                                { v: "all", label: "All Vehicles" },
                                { v: "verified", label: "✓ Legal to Drive" },
                                { v: "unverified", label: "⚠ Pending" },
                                { v: "no-insurance", label: "✗ No Insurance" },
                            ] as const).map(opt => (
                                <button key={opt.v} onClick={() => setFVerified(opt.v)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${fVerified === opt.v
                                            ? opt.v === "verified" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-sm"
                                                : opt.v === "unverified" ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-sm"
                                                    : opt.v === "no-insurance" ? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 shadow-sm"
                                                        : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                                        }`}>
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
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading vehicles…</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 flex items-center justify-center">
                            <AlertTriangle size={20} className="text-rose-500" />
                        </div>
                        <p className="text-sm font-semibold text-rose-600">{error}</p>
                        <button onClick={load} className="text-xs font-bold text-slate-500 hover:underline">Try again</button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl">
                        <Car size={22} className="text-slate-300 dark:text-slate-600" />
                        <p className="text-sm font-semibold text-slate-400">No vehicles match</p>
                        <button onClick={() => { setSearch(""); setFVerified("all"); }}
                            className="text-xs font-bold text-sky-600 hover:underline">Clear filters</button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden">
                        <div className="flex items-center px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20">
                            <span className="text-xs font-semibold text-slate-400">
                                {filtered.length} vehicle{filtered.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                            {paginated.map(v => (
                                <VehicleCard key={v.id} vehicle={v}
                                    onLightbox={(url, title) => setLightbox({ url, title })} />
                            ))}
                        </div>
                        <PaginationBar
                            cur={page} total={totalPages} from={pageFrom} to={pageTo} count={filtered.length}
                            onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
                    </div>
                )}
            </div>
        </>
    );
}