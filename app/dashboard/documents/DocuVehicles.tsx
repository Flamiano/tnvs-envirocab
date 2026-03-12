"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/app/utils/supabase";
import {
    Car, FileText, Image as ImageIcon, ShieldCheck, FileCheck2,
    Search, RefreshCw, Loader2, X, ZoomIn, ChevronDown,
    ChevronLeft, ChevronRight, CheckCircle2, Clock, Download,
    AlertTriangle, LayoutGrid, List, Filter, FolderOpen,
    Maximize2, Eye,
} from "lucide-react";

// Types

interface Vehicle {
    id: string;
    unit_id: string;
    plate_number: string;
    model: string;
    type: string;
    status: string;
    driver_name: string | null;
    email: string | null;
}

interface VehicleDocument {
    id: string;
    vehicle_id: string;
    document_type: string;
    file_url: string;
    verified: boolean;
    created_at: string;
}

// Constants

const DOC_TYPES = [
    { key: "Unit Photos", icon: ImageIcon, color: "sky" as const, desc: "Vehicle imagery" },
    { key: "LTO OR", icon: FileCheck2, color: "emerald" as const, desc: "Official Receipt" },
    { key: "LTO CR", icon: FileText, color: "violet" as const, desc: "Certificate of Registration" },
    { key: "Insurance", icon: ShieldCheck, color: "amber" as const, desc: "Insurance documents" },
];

type CK = "sky" | "emerald" | "violet" | "amber";

const C: Record<CK, { bg: string; border: string; text: string; badge: string; accent: string; glow: string }> = {
    sky: {
        bg: "bg-sky-50 dark:bg-sky-500/10",
        border: "border-sky-200 dark:border-sky-500/30",
        text: "text-sky-700 dark:text-sky-300",
        badge: "bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300",
        accent: "bg-sky-500",
        glow: "shadow-sky-500/20",
    },
    emerald: {
        bg: "bg-emerald-50 dark:bg-emerald-500/10",
        border: "border-emerald-200 dark:border-emerald-500/30",
        text: "text-emerald-700 dark:text-emerald-300",
        badge: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
        accent: "bg-emerald-500",
        glow: "shadow-emerald-500/20",
    },
    violet: {
        bg: "bg-violet-50 dark:bg-violet-500/10",
        border: "border-violet-200 dark:border-violet-500/30",
        text: "text-violet-700 dark:text-violet-300",
        badge: "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300",
        accent: "bg-violet-500",
        glow: "shadow-violet-500/20",
    },
    amber: {
        bg: "bg-amber-50 dark:bg-amber-500/10",
        border: "border-amber-200 dark:border-amber-500/30",
        text: "text-amber-700 dark:text-amber-300",
        badge: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300",
        accent: "bg-amber-500",
        glow: "shadow-amber-500/20",
    },
};

const STATUS_BADGE: Record<string, string> = {
    Active: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30",
    Onboarding: "bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30",
    Inactive: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600",
    Suspended: "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30",
};

const PER_PAGE = 10;

// URL Resolver 

function toPublicUrl(raw: string): string {
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const sb = createClient();
    const { data } = sb.storage.from("log2_vehicle-docs").getPublicUrl(raw);
    return data?.publicUrl ?? "";
}

// Full-Screen Photo Lightbox

function PhotoLightbox({ imgs, idx, onClose, onNav }: {
    imgs: VehicleDocument[]; idx: number; onClose: () => void; onNav: (i: number) => void;
}) {
    const doc = imgs[idx];
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setLoaded(false);
        const h = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft" && idx > 0) onNav(idx - 1);
            if (e.key === "ArrowRight" && idx < imgs.length - 1) onNav(idx + 1);
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [idx, imgs.length, onClose, onNav]);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.97)" }}>
            {/* Backdrop blur effect */}
            <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose} />

            {/* Close */}
            <button onClick={onClose}
                className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 border border-white/10">
                <X size={16} />
            </button>

            {/* Nav left */}
            {idx > 0 && (
                <button onClick={() => onNav(idx - 1)}
                    className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 border border-white/10">
                    <ChevronLeft size={20} />
                </button>
            )}

            {/* Nav right */}
            {idx < imgs.length - 1 && (
                <button onClick={() => onNav(idx + 1)}
                    className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 border border-white/10">
                    <ChevronRight size={20} />
                </button>
            )}

            {/* Image container */}
            <div className="relative z-10 flex flex-col items-center gap-4 max-w-5xl w-full px-16 sm:px-24">
                <div className="relative w-full flex items-center justify-center" style={{ minHeight: "60vh" }}>
                    {!loaded && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 size={28} className="text-white/30 animate-spin" />
                        </div>
                    )}
                    <img
                        src={doc.file_url}
                        alt={doc.document_type}
                        onLoad={() => setLoaded(true)}
                        className={`max-h-[72vh] max-w-full object-contain rounded-2xl shadow-2xl transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
                        style={{ boxShadow: "0 25px 80px rgba(0,0,0,0.5)" }}
                    />
                </div>

                {/* Bottom info bar */}
                <div className="flex items-center gap-3 flex-wrap justify-center">
                    <div className="flex items-center gap-2 bg-white/10 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
                        <ImageIcon size={11} className="text-sky-400" />
                        <span className="text-white/80 text-xs font-semibold">{doc.document_type}</span>
                    </div>
                    {doc.verified
                        ? <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-3 py-1.5 rounded-full">
                            <CheckCircle2 size={11} /> Verified
                        </span>
                        : <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/15 border border-amber-500/25 px-3 py-1.5 rounded-full">
                            <Clock size={11} /> Pending Review
                        </span>
                    }
                    <span className="text-white/30 text-xs font-mono bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                        {idx + 1} / {imgs.length}
                    </span>
                    <a href={doc.file_url} download target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold text-white/60 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 rounded-full transition-all">
                        <Download size={11} /> Download
                    </a>
                </div>

                {/* Dot indicators */}
                {imgs.length > 1 && (
                    <div className="flex items-center gap-1.5">
                        {imgs.map((_, i) => (
                            <button key={i} onClick={() => onNav(i)}
                                className={`rounded-full transition-all ${i === idx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/25 hover:bg-white/50"}`} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Unit Photos Gallery (hero section)

function UnitPhotosGallery({ docs }: { docs: VehicleDocument[] }) {
    const [lbIdx, setLbIdx] = useState<number | null>(null);
    const [mainIdx, setMainIdx] = useState(0);
    const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

    if (docs.length === 0) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-sky-200 dark:border-sky-500/20 py-8 flex flex-col items-center gap-2 opacity-40">
                <ImageIcon size={22} className="text-sky-400" />
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">No unit photos uploaded</p>
            </div>
        );
    }

    const mainDoc = docs[mainIdx];

    return (
        <>
            {lbIdx !== null && (
                <PhotoLightbox imgs={docs} idx={lbIdx} onClose={() => setLbIdx(null)} onNav={setLbIdx} />
            )}

            <div className="space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center">
                            <ImageIcon size={11} className="text-sky-600 dark:text-sky-400" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">Unit Photos</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 hidden sm:inline">— Vehicle imagery</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30">
                        {docs.length} photo{docs.length !== 1 ? "s" : ""}
                    </span>
                </div>

                {/* Main photo + thumbnails layout */}
                <div className="flex gap-2 h-auto">

                    {/* Thumbnail strip — left side (desktop), bottom (mobile) */}
                    {docs.length > 1 && (
                        <div className="hidden sm:flex flex-col gap-1.5 w-16 shrink-0" style={{ maxHeight: 220 }}>
                            <div className="flex flex-col gap-1.5 overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
                                {docs.map((doc, i) => (
                                    <button key={doc.id} onClick={() => setMainIdx(i)}
                                        className={`relative rounded-lg overflow-hidden shrink-0 transition-all duration-200 border-2 ${mainIdx === i
                                            ? "border-sky-500 shadow-lg shadow-sky-500/20 scale-[1.03]"
                                            : "border-transparent hover:border-slate-300 dark:hover:border-slate-600 opacity-60 hover:opacity-100"
                                            }`}
                                        style={{ height: 52 }}>
                                        {!imgErrors[i] ? (
                                            <img src={doc.file_url} alt=""
                                                className="w-full h-full object-cover"
                                                onError={() => setImgErrors(p => ({ ...p, [i]: true }))} />
                                        ) : (
                                            <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                                <FileText size={10} className="text-slate-400" />
                                            </div>
                                        )}
                                        {mainIdx === i && (
                                            <div className="absolute inset-0 ring-2 ring-sky-500 ring-inset rounded-lg" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Main large photo */}
                    <div className="flex-1 min-w-0">
                        <div
                            className="relative w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer group border border-slate-200 dark:border-slate-700/60"
                            style={{ height: docs.length > 1 ? 220 : 180 }}
                            onClick={() => setLbIdx(mainIdx)}>
                            {!imgErrors[mainIdx] ? (
                                <img src={mainDoc.file_url} alt="Unit Photo"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    onError={() => setImgErrors(p => ({ ...p, [mainIdx]: true }))} />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                    <ImageIcon size={28} className="text-slate-300 dark:text-slate-600" />
                                    <span className="text-[10px] text-slate-400">No preview</span>
                                </div>
                            )}

                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full">
                                    <Maximize2 size={12} className="text-white" />
                                    <span className="text-white text-xs font-bold">View Full</span>
                                </div>
                            </div>

                            {/* Verified badge */}
                            <div className="absolute top-2 left-2">
                                {mainDoc.verified
                                    ? <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full shadow">
                                        <CheckCircle2 size={9} /> Verified
                                    </span>
                                    : <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-amber-500 px-2 py-0.5 rounded-full shadow">
                                        <Clock size={9} /> Pending
                                    </span>
                                }
                            </div>

                            {/* Counter */}
                            {docs.length > 1 && (
                                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm border border-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {mainIdx + 1} / {docs.length}
                                </div>
                            )}

                            {/* Nav arrows on main photo */}
                            {docs.length > 1 && (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); setMainIdx(p => Math.max(0, p - 1)); }}
                                        className={`absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white transition-all hover:bg-black/70 ${mainIdx === 0 ? "opacity-30 pointer-events-none" : "opacity-0 group-hover:opacity-100"}`}>
                                        <ChevronLeft size={14} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setMainIdx(p => Math.min(docs.length - 1, p + 1)); }}
                                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white transition-all hover:bg-black/70 ${mainIdx === docs.length - 1 ? "opacity-30 pointer-events-none" : "opacity-0 group-hover:opacity-100"}`}>
                                        <ChevronRight size={14} />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Mobile thumbnail strip — below main image */}
                        {docs.length > 1 && (
                            <div className="sm:hidden flex gap-1.5 mt-2 overflow-x-auto pb-1">
                                {docs.map((doc, i) => (
                                    <button key={doc.id} onClick={() => setMainIdx(i)}
                                        className={`relative rounded-lg overflow-hidden shrink-0 border-2 transition-all ${mainIdx === i ? "border-sky-500 shadow-md shadow-sky-500/20" : "border-transparent opacity-55 hover:opacity-90"}`}
                                        style={{ width: 52, height: 40 }}>
                                        {!imgErrors[i] ? (
                                            <img src={doc.file_url} alt="" className="w-full h-full object-cover"
                                                onError={() => setImgErrors(p => ({ ...p, [i]: true }))} />
                                        ) : (
                                            <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                                <FileText size={8} className="text-slate-400" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* "View all in gallery" link when more than 3 */}
                {docs.length > 3 && (
                    <button onClick={() => setLbIdx(0)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 transition-all">
                        <Eye size={12} />
                        View all {docs.length} photos in gallery
                    </button>
                )}
            </div>
        </>
    );
}

// Document Thumbnail Card (non-photo docs) 

function DocThumb({ doc, ck, onClick }: { doc: VehicleDocument; ck: CK; onClick: () => void }) {
    const c = C[ck];
    const [err, setErr] = useState(false);
    return (
        <div onClick={onClick}
            className={`group relative rounded-xl border-2 ${c.border} bg-white dark:bg-slate-800 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-0.5 flex flex-col`}>

            {/* Image area — natural aspect ratio, no cropping */}
            <div className={`relative w-full ${c.bg} flex items-center justify-center overflow-hidden`}>
                {!err ? (
                    <img
                        src={doc.file_url}
                        alt={doc.document_type}
                        className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                        style={{ display: "block", maxHeight: 280 }}
                        onError={() => setErr(true)}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-10">
                        <FileText size={28} className="text-slate-300 dark:text-slate-600" />
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">No preview</span>
                    </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm border border-white/10">
                        <ZoomIn size={14} className="text-white" />
                    </span>
                    <a href={doc.file_url} download target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm border border-white/10">
                        <Download size={14} className="text-white" />
                    </a>
                </div>

                {/* Verified / Pending dot */}
                {doc.verified
                    ? <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800 flex items-center justify-center shadow">
                        <CheckCircle2 size={8} className="text-white" />
                    </div>
                    : <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 border-2 border-white dark:border-slate-800 flex items-center justify-center shadow">
                        <Clock size={8} className="text-white" />
                    </div>
                }
            </div>

            {/* Label footer */}
            <div className={`px-2.5 py-2 ${c.bg} border-t ${c.border}`}>
                <p className={`text-[10px] font-bold truncate ${c.text}`}>{doc.document_type}</p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                    {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <span className={`inline-flex items-center gap-1 mt-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${doc.verified ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"}`}>
                    {doc.verified ? <><CheckCircle2 size={7} /> Verified</> : <><Clock size={7} /> Pending</>}
                </span>
            </div>
        </div>
    );
}

// Document Type Section (non-photo) 

function DocSection({ type, docs, ck, icon: Icon, desc }: {
    type: string; docs: VehicleDocument[]; ck: CK; icon: React.ElementType; desc: string;
}) {
    const [lbIdx, setLbIdx] = useState<number | null>(null);
    const c = C[ck];

    // Unit Photos uses the gallery component
    if (type === "Unit Photos") {
        return <UnitPhotosGallery docs={docs} />;
    }

    return (
        <>
            {lbIdx !== null && <PhotoLightbox imgs={docs} idx={lbIdx} onClose={() => setLbIdx(null)} onNav={setLbIdx} />}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-md ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
                            <Icon size={11} className={c.text} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">{type}</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 hidden sm:inline">— {desc}</span>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${c.badge} ${c.border}`}>
                        {docs.length} file{docs.length !== 1 ? "s" : ""}
                    </span>
                </div>
                {docs.length === 0 ? (
                    <div className={`rounded-xl border-2 border-dashed ${c.border} py-4 flex flex-col items-center gap-1 opacity-40`}>
                        <Icon size={16} className={c.text} />
                        <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">No {type} uploaded</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {docs.map((doc, i) => (
                            <DocThumb key={doc.id} doc={doc} ck={ck} onClick={() => setLbIdx(i)} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

// Completeness helpers

function pctInfo(docs: VehicleDocument[]) {
    const done = DOC_TYPES.filter((t) => docs.some((d) => d.document_type === t.key)).length;
    const pct = Math.round((done / DOC_TYPES.length) * 100);
    return {
        pct,
        bar: pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500",
        text: pct === 100 ? "text-emerald-500 dark:text-emerald-400" : pct >= 50 ? "text-amber-500 dark:text-amber-400" : "text-rose-500 dark:text-rose-400",
    };
}

// Vehicle List Row 

function VehicleListRow({ v, docs, expanded, onToggle, num }: {
    v: Vehicle; docs: VehicleDocument[]; expanded: boolean; onToggle: () => void; num: number;
}) {
    const { pct, bar, text } = pctInfo(docs);
    const sb = STATUS_BADGE[v.status] ?? STATUS_BADGE.Inactive;
    const unitPhotos = docs.filter((d) => d.document_type === "Unit Photos");
    const firstPhoto = unitPhotos[0]?.file_url;

    return (
        <div className={`bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden transition-all duration-200 ${expanded ? "shadow-lg dark:shadow-slate-900/50" : "hover:shadow-md"}`}>
            <div onClick={onToggle}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/25 transition-colors select-none">

                <span className="w-6 text-center text-[11px] font-black text-slate-300 dark:text-slate-600 shrink-0 tabular-nums">{num}</span>

                {/* Car icon or unit photo thumbnail */}
                <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-sm border border-slate-200 dark:border-slate-700">
                    {firstPhoto ? (
                        <img src={firstPhoto} alt={v.plate_number} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700 flex items-center justify-center">
                            <Car size={14} className="text-white" />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{v.plate_number}</span>
                        <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md">{v.unit_id}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sb}`}>{v.status}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{v.type}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {v.model} &middot; {v.driver_name ?? "Unassigned"}
                    </p>
                </div>

                {/* Unit photo mini-strip */}
                {unitPhotos.length > 0 && (
                    <div className="hidden lg:flex items-center gap-0.5 shrink-0">
                        {unitPhotos.slice(0, 3).map((p, i) => (
                            <div key={p.id} className={`w-7 h-7 rounded-lg overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm ${i > 0 ? "-ml-2" : ""}`} style={{ zIndex: 3 - i }}>
                                <img src={p.file_url} alt="" className="w-full h-full object-cover" />
                            </div>
                        ))}
                        {unitPhotos.length > 3 && (
                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 border-2 border-white dark:border-slate-800 -ml-2 flex items-center justify-center shadow-sm" style={{ zIndex: 0 }}>
                                <span className="text-[8px] font-black text-slate-500 dark:text-slate-400">+{unitPhotos.length - 3}</span>
                            </div>
                        )}
                    </div>
                )}

                <span className={`hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${docs.length > 0 ? "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300" : "bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400"}`}>
                    {docs.length} doc{docs.length !== 1 ? "s" : ""}
                </span>

                <div className="hidden md:flex flex-col items-end gap-0.5 w-20 shrink-0">
                    <span className={`text-[10px] font-black ${text}`}>{pct}%</span>
                    <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                </div>

                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${expanded ? "bg-slate-100 dark:bg-slate-700" : ""}`}>
                    <ChevronDown size={12} className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                </div>
            </div>

            {expanded && (
                <div className="border-t border-slate-100 dark:border-slate-700/50 px-4 pb-5 pt-4 space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
                    {DOC_TYPES.map((dt) => (
                        <DocSection key={dt.key} type={dt.key}
                            docs={docs.filter((d) => d.document_type === dt.key)}
                            ck={dt.color} icon={dt.icon} desc={dt.desc} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Vehicle Grid Card

function VehicleGridCard({ v, docs, expanded, onToggle, num }: {
    v: Vehicle; docs: VehicleDocument[]; expanded: boolean; onToggle: () => void; num: number;
}) {
    const { pct, bar, text } = pctInfo(docs);
    const sb = STATUS_BADGE[v.status] ?? STATUS_BADGE.Inactive;
    const unitPhotos = docs.filter((d) => d.document_type === "Unit Photos");
    const firstPhoto = unitPhotos[0]?.file_url;

    return (
        <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg flex flex-col">

            {/* Hero photo strip at top */}
            {unitPhotos.length > 0 && (
                <div className="relative w-full overflow-hidden bg-slate-100 dark:bg-slate-900" style={{ height: 120 }}>
                    <img src={firstPhoto} alt={v.plate_number}
                        className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* Plate over photo */}
                    <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                        <div>
                            <p className="text-white font-black text-base leading-tight drop-shadow-lg">{v.plate_number}</p>
                            <p className="text-white/60 text-[10px] font-mono">{v.unit_id}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            {unitPhotos.length > 1 && (
                                <span className="bg-black/50 backdrop-blur-sm border border-white/10 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                    +{unitPhotos.length - 1} photos
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Status badge */}
                    <div className="absolute top-2 right-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${sb}`}>{v.status}</span>
                    </div>
                    <div className="absolute top-2 left-2 text-[9px] font-black text-white/40">#{num}</div>
                </div>
            )}

            <div onClick={onToggle} className={`${unitPhotos.length > 0 ? "pt-3" : "pt-4"} px-4 pb-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors select-none`}>

                {/* Show plate/id only if no photo hero */}
                {unitPhotos.length === 0 && (
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700 flex items-center justify-center shadow-sm shrink-0">
                            <Car size={16} className="text-white" />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] font-black text-slate-300 dark:text-slate-600">#{num}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sb}`}>{v.status}</span>
                        </div>
                    </div>
                )}

                {unitPhotos.length === 0 && (
                    <>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{v.plate_number}</p>
                        <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">{v.unit_id}</p>
                    </>
                )}

                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{v.model}</p>
                <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{v.type}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{v.driver_name ?? "Unassigned"}</span>
                </div>

                <div className="mt-2.5 space-y-1">
                    <div className="flex justify-between">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">{docs.length} file{docs.length !== 1 ? "s" : ""}</span>
                        <span className={`text-[9px] font-black ${text}`}>{pct}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                </div>
            </div>

            {/* Doc type pills */}
            <div className="px-4 pb-3 flex flex-wrap gap-1">
                {DOC_TYPES.map((dt) => {
                    const has = docs.some((d) => d.document_type === dt.key);
                    const c = C[dt.color];
                    return (
                        <span key={dt.key} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${has ? `${c.badge} ${c.border}` : "bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700"}`}>
                            {dt.key}
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
                <div className="border-t border-slate-100 dark:border-slate-700/50 px-4 pb-4 pt-4 space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
                    {DOC_TYPES.map((dt) => (
                        <DocSection key={dt.key} type={dt.key}
                            docs={docs.filter((d) => d.document_type === dt.key)}
                            ck={dt.color} icon={dt.icon} desc={dt.desc} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Pagination Bar 

function PaginationBar({ cur, total, from, to, count, onChange }: {
    cur: number; total: number; from: number; to: number; count: number;
    onChange: (p: number) => void;
}) {
    const pages: (number | "...")[] = [];
    if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i);
    } else {
        pages.push(1);
        if (cur > 3) pages.push("...");
        for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
        if (cur < total - 2) pages.push("...");
        pages.push(total);
    }

    return (
        <div className="flex items-center justify-between px-1 py-2.5 border-t border-slate-200 dark:border-slate-700/60">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium tabular-nums">
                {from}–{to} of {count}
            </span>
            <div className="flex items-center gap-1">
                <button onClick={() => onChange(cur - 1)} disabled={cur === 1}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-25 transition-all text-slate-400 dark:text-slate-500">
                    <ChevronLeft size={14} />
                </button>
                {pages.map((p, i) =>
                    p === "..." ? (
                        <span key={`d${i}`} className="w-7 text-center text-xs text-slate-400 dark:text-slate-500 select-none">…</span>
                    ) : (
                        <button key={p} onClick={() => onChange(p as number)}
                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${cur === p
                                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600"
                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                            {p}
                        </button>
                    )
                )}
                <button onClick={() => onChange(cur + 1)} disabled={cur === total}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-25 transition-all text-slate-400 dark:text-slate-500">
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

// Main Component 

export default function DocuVehicles() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [documents, setDocuments] = useState<VehicleDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [fStatus, setFStatus] = useState("all");
    const [fType, setFType] = useState("all");
    const [page, setPage] = useState(1);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [view, setView] = useState<"list" | "grid">("list");

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const sb = createClient();
            const [vRes, dRes] = await Promise.all([
                sb.from("log2_fleet")
                    .select("id,unit_id,plate_number,model,type,status,driver_name,email")
                    .order("created_at", { ascending: false }),
                sb.from("log2_vehicle_documents")
                    .select("*")
                    .order("created_at", { ascending: false }),
            ]);
            if (vRes.error) throw vRes.error;
            if (dRes.error) throw dRes.error;

            const docs = (dRes.data ?? []).map((d) => {
                if (!d.file_url) return { ...d, file_url: "" };
                if (d.file_url.startsWith("http")) return { ...d };
                const { data: urlData } = sb.storage.from("log2_vehicle-docs").getPublicUrl(d.file_url);
                return { ...d, file_url: urlData?.publicUrl ?? "" };
            });

            setVehicles(vRes.data ?? []);
            setDocuments(docs);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); setExpanded(null); }, [search, fStatus, fType]);

    const statuses = ["all", ...Array.from(new Set(vehicles.map((v) => v.status).filter(Boolean)))];
    const types = ["all", ...Array.from(new Set(vehicles.map((v) => v.type).filter(Boolean)))];

    const filtered = vehicles.filter((v) => {
        const q = search.toLowerCase();
        return (
            (v.plate_number.toLowerCase().includes(q) ||
                v.unit_id.toLowerCase().includes(q) ||
                v.model.toLowerCase().includes(q) ||
                (v.driver_name ?? "").toLowerCase().includes(q)) &&
            (fStatus === "all" || v.status === fStatus) &&
            (fType === "all" || v.type === fType)
        );
    });

    const totalVehicles = vehicles.length;
    const totalDocFiles = documents.length;
    const verifiedCount = documents.filter((d) => d.verified).length;
    const pendingCount = documents.filter((d) => !d.verified).length;

    const byType = DOC_TYPES.map((dt) => ({
        ...dt,
        count: documents.filter((d) => d.document_type === dt.key).length,
    }));

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const pageFrom = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const pageTo = Math.min(page * PER_PAGE, filtered.length);
    const paginated = filtered.slice(pageFrom - 1, pageTo);

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500">

            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-500 dark:to-slate-700 flex items-center justify-center shadow-sm">
                            <Car size={15} className="text-white" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            Vehicle Documents
                        </h1>
                    </div>
                    <p className="text-sm text-slate-400 dark:text-slate-500 ml-10">
                        LTO, insurance and compliance files per vehicle
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl gap-0.5">
                        <button onClick={() => setView("list")} title="List view"
                            className={`p-1.5 rounded-lg transition-all ${view === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                            <List size={14} />
                        </button>
                        <button onClick={() => setView("grid")} title="Grid view"
                            className={`p-1.5 rounded-lg transition-all ${view === "grid" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                            <LayoutGrid size={14} />
                        </button>
                    </div>
                    <button onClick={load} disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all">
                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Vehicles</p>
                        <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            <Car size={12} className="text-slate-500 dark:text-slate-400" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black tabular-nums text-slate-900 dark:text-white">{totalVehicles}</p>
                </div>
                <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Document Files</p>
                        <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-500/15 flex items-center justify-center">
                            <FolderOpen size={12} className="text-sky-600 dark:text-sky-400" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black tabular-nums text-slate-900 dark:text-white">{totalDocFiles}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                        {byType.map((dt) => (
                            <span key={dt.key} className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border ${C[dt.color].badge} ${C[dt.color].border}`}>
                                {dt.key.replace("Unit Photos", "Photos")}: {dt.count}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Verified</p>
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center">
                            <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">{verifiedCount}</p>
                    <div className="mt-2 w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                            style={{ width: totalDocFiles > 0 ? `${Math.round((verifiedCount / totalDocFiles) * 100)}%` : "0%" }} />
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                        {totalDocFiles > 0 ? `${Math.round((verifiedCount / totalDocFiles) * 100)}%` : "—"} of all files
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Pending Review</p>
                        <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center">
                            <Clock size={12} className="text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black tabular-nums text-amber-600 dark:text-amber-400">{pendingCount}</p>
                    <div className="mt-2 w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full transition-all duration-700"
                            style={{ width: totalDocFiles > 0 ? `${Math.round((pendingCount / totalDocFiles) * 100)}%` : "0%" }} />
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                        {totalDocFiles > 0 ? `${Math.round((pendingCount / totalDocFiles) * 100)}%` : "—"} awaiting verification
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3 space-y-2.5">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={13} />
                    <input type="text" placeholder="Search plate number, unit ID, model or driver…"
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none transition-all" />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <Filter size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl overflow-x-auto">
                        {statuses.map((s) => (
                            <button key={s} onClick={() => setFStatus(s)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${fStatus === s ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>
                                {s === "all" ? "All Status" : s}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl overflow-x-auto">
                        {types.map((t) => (
                            <button key={t} onClick={() => setFType(t)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap capitalize transition-all ${fType === t ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>
                                {t === "all" ? "All Types" : t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-3">
                    <Loader2 className="w-8 h-8 text-slate-300 dark:text-slate-600 animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Loading vehicles…</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center">
                        <AlertTriangle size={20} className="text-rose-500" />
                    </div>
                    <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
                    <button onClick={load} className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">Try again</button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        <Car size={20} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No vehicles match your search</p>
                    <button onClick={() => { setSearch(""); setFStatus("all"); setFType("all"); }}
                        className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">Clear all filters</button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20">
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                            {filtered.length} vehicle{filtered.length !== 1 ? "s" : ""} found
                        </span>
                        {expanded && (
                            <button onClick={() => setExpanded(null)}
                                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                Collapse all ↑
                            </button>
                        )}
                    </div>

                    <div className={view === "grid" ? "p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" : "divide-y divide-slate-100 dark:divide-slate-700/40 p-3 space-y-2"}>
                        {paginated.map((v, i) =>
                            view === "list" ? (
                                <VehicleListRow key={v.id} v={v}
                                    docs={documents.filter((d) => d.vehicle_id === v.id)}
                                    expanded={expanded === v.id}
                                    onToggle={() => setExpanded((p) => p === v.id ? null : v.id)}
                                    num={pageFrom + i} />
                            ) : (
                                <VehicleGridCard key={v.id} v={v}
                                    docs={documents.filter((d) => d.vehicle_id === v.id)}
                                    expanded={expanded === v.id}
                                    onToggle={() => setExpanded((p) => p === v.id ? null : v.id)}
                                    num={pageFrom + i} />
                            )
                        )}
                    </div>

                    <div className="px-4">
                        <PaginationBar
                            cur={page} total={totalPages} from={pageFrom} to={pageTo} count={filtered.length}
                            onChange={(p) => { setPage(p); setExpanded(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}