"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/app/utils/supabase";
import {
    FileText, Search, RefreshCw, Loader2, X,
    ChevronLeft, ChevronRight, Download,
    AlertTriangle, LayoutGrid, List,
    Filter, Maximize2, Globe, Lock,
    Building2, Eye, Calendar,
    ExternalLink, FolderOpen, ImageOff,
    Plus, Upload, CheckCircle2, CloudUpload,
    Trash2, Pencil, MoreVertical,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgDocument {
    id: number;
    title: string;
    file_url: string;
    visibility: "Internal" | "External";
    description: string | null;
    created_at: string;
}

const PER_PAGE = 12;
const BUCKET = "org_documents";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveUrl(raw: string | null): string {
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const sb = createClient();
    const { data } = sb.storage.from(BUCKET).getPublicUrl(raw);
    return data?.publicUrl ?? "";
}

function isImage(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff?)(\?.*)?$/i.test(url);
}

function isPdf(url: string): boolean {
    return /\.pdf(\?.*)?$/i.test(url);
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
    });
}

function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9.]/g, "-").replace(/-+/g, "-");
}

/** Returns true if the file_url looks like a bucket path (not a full URL) */
function isBucketPath(raw: string): boolean {
    return !raw.startsWith("http://") && !raw.startsWith("https://");
}

// ─── Visibility Badge ─────────────────────────────────────────────────────────

function VisibilityBadge({ v }: { v: "Internal" | "External" }) {
    const isExt = v === "External";
    return (
        <span className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border ${isExt
                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
            }`}>
            {isExt ? <Globe size={8} /> : <Lock size={8} />}
            {v}
        </span>
    );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);
    const isImg = isImage(url);
    const isPDF = isPdf(url);
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.97)" }}>
            <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose} />
            <button onClick={onClose}
                className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 border border-white/10">
                <X size={16} />
            </button>
            <div className="relative z-10 flex flex-col items-center gap-4 max-w-5xl w-full px-6 sm:px-16">
                <div className="relative flex items-center justify-center w-full" style={{ minHeight: "65vh" }}>
                    {!loaded && <Loader2 size={28} className="absolute text-white/30 animate-spin" />}
                    {isImg ? (
                        <img src={url} alt={title} onLoad={() => setLoaded(true)}
                            className={`max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`} />
                    ) : isPDF ? (
                        <iframe src={url} title={title} onLoad={() => setLoaded(true)}
                            className={`w-full rounded-2xl shadow-2xl transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
                            style={{ height: "75vh" }} />
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <FileText size={48} className="text-white/30" />
                            <p className="text-white/60 text-sm">Preview not available</p>
                            {(() => { if (!loaded) setLoaded(true); return null; })()}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center">
                    <div className="flex items-center gap-2 bg-white/10 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
                        <FileText size={11} className="text-white/60" />
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

// ─── Shared: File Drop Zone ───────────────────────────────────────────────────

interface FileDropZoneProps {
    file: File | null;
    preview: string | null;
    dragging: boolean;
    disabled: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
    onClick: () => void;
    onRemove: (e: React.MouseEvent) => void;
    fileRef: React.RefObject<HTMLInputElement>;
    onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label?: string;
}

function FileDropZone({
    file, preview, dragging, disabled,
    onDragOver, onDragLeave, onDrop, onClick, onRemove, fileRef, onFileInput, label,
}: FileDropZoneProps) {
    const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(2) : null;
    return (
        <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !file && onClick()}
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 overflow-hidden ${file
                    ? "border-teal-300 dark:border-teal-500/40 bg-teal-50/50 dark:bg-teal-500/5 cursor-default"
                    : dragging
                        ? "border-teal-400 bg-teal-50 dark:bg-teal-500/10 scale-[1.01] cursor-copy"
                        : "border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500/40 hover:bg-teal-50/30 dark:hover:bg-teal-500/5 cursor-pointer"
                }`}>
            <input ref={fileRef} type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                className="hidden" onChange={onFileInput} disabled={disabled} />
            {!file ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3 select-none">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all ${dragging
                            ? "bg-teal-100 dark:bg-teal-500/20 border-teal-300 dark:border-teal-500/40"
                            : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        }`}>
                        <CloudUpload size={20} className={dragging ? "text-teal-500" : "text-slate-400 dark:text-slate-500"} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {dragging ? "Drop it here!" : label ?? "Drag & drop or click to browse"}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            Images, PDF, Word, Excel, PowerPoint · Max 10 MB
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 p-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        {preview
                            ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
                            : <FileText size={22} className="text-rose-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{fileSizeMB} MB · {file.type || "unknown"}</p>
                        <button onClick={onRemove} disabled={disabled}
                            className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-600 mt-1.5 disabled:opacity-40 transition-colors">
                            <Trash2 size={10} /> Remove file
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Shared: Visibility Picker ────────────────────────────────────────────────

function VisibilityPicker({
    value, onChange, disabled,
}: { value: "Internal" | "External"; onChange: (v: "Internal" | "External") => void; disabled?: boolean }) {
    return (
        <div className="grid grid-cols-2 gap-2">
            {(["Internal", "External"] as const).map(v => {
                const isExt = v === "External";
                const active = value === v;
                return (
                    <button key={v} onClick={() => onChange(v)} disabled={disabled}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all text-left disabled:opacity-50 ${active
                                ? isExt
                                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/50"
                                    : "border-amber-400 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/50"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50 dark:bg-slate-800/40"
                            }`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active
                                ? isExt ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-amber-100 dark:bg-amber-500/20"
                                : "bg-slate-100 dark:bg-slate-700"
                            }`}>
                            {isExt
                                ? <Globe size={13} className={active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"} />
                                : <Lock size={13} className={active ? "text-amber-600 dark:text-amber-400" : "text-slate-400"} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-black ${active
                                    ? isExt ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
                                    : "text-slate-600 dark:text-slate-400"
                                }`}>{v}</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500">{isExt ? "Anyone can see" : "Staff only"}</p>
                        </div>
                        {active && <CheckCircle2 size={14} className={`shrink-0 ${isExt ? "text-emerald-500" : "text-amber-500"}`} />}
                    </button>
                );
            })}
        </div>
    );
}

// ─── CREATE Modal ─────────────────────────────────────────────────────────────

function CreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState<"Internal" | "External">("Internal");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [saving, setSaving] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose, saving]);

    function pickFile(f: File) {
        setFile(f); setError(null);
        if (f.type.startsWith("image/")) {
            const r = new FileReader();
            r.onload = e => setPreview(e.target?.result as string);
            r.readAsDataURL(f);
        } else setPreview(null);
    }

    async function handleSubmit() {
        if (!title.trim()) { setError("Title is required."); return; }
        if (!file) { setError("Please select a file."); return; }
        setSaving(true); setError(null); setProgress(10);
        try {
            const sb = createClient();
            const ext = file.name.split(".").pop() ?? "bin";
            const safeName = slugify(file.name.replace(`.${ext}`, ""));
            const storagePath = `${Date.now()}-${safeName}.${ext}`;
            setProgress(30);
            const { error: upErr } = await sb.storage.from(BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
            if (upErr) throw upErr;
            setProgress(70);
            const { error: insErr } = await sb.from("administrative_org_documents").insert({
                title: title.trim(), description: description.trim() || null, visibility, file_url: storagePath,
            });
            if (insErr) throw insErr;
            setProgress(100); setDone(true);
            setTimeout(() => { onSuccess(); onClose(); }, 1100);
        } catch (err: any) {
            setError(err?.message ?? "Upload failed."); setSaving(false); setProgress(0);
        }
    }

    return (
        <ModalShell
            title="Add Document"
            subtitle={`Uploads to ${BUCKET} bucket`}
            icon={<Plus size={15} className="text-white" />}
            iconBg="from-teal-500 to-teal-700"
            onClose={!saving ? onClose : undefined}>
            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                {done ? <SuccessState label="Document uploaded!" /> : (
                    <>
                        <FileDropZone
                            file={file} preview={preview} dragging={dragging} disabled={saving}
                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
                            onClick={() => fileRef.current?.click()}
                            onRemove={e => { e.stopPropagation(); setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                            fileRef={fileRef}
                            onFileInput={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
                        <FieldGroup label="Title" required>
                            <input type="text" placeholder="e.g. Company Registration Certificate"
                                value={title} onChange={e => setTitle(e.target.value)} disabled={saving}
                                className={inputCls} />
                        </FieldGroup>
                        <FieldGroup label="Description" optional>
                            <textarea placeholder="Brief description…" value={description}
                                onChange={e => setDescription(e.target.value)} disabled={saving}
                                rows={2} className={`${inputCls} resize-none`} />
                        </FieldGroup>
                        <FieldGroup label="Visibility" required>
                            <VisibilityPicker value={visibility} onChange={setVisibility} disabled={saving} />
                        </FieldGroup>
                        {error && <ErrorBanner msg={error} />}
                    </>
                )}
            </div>
            {!done && (
                <ModalFooter
                    saving={saving} progress={progress}
                    onCancel={onClose}
                    onSubmit={handleSubmit}
                    submitDisabled={saving || !file || !title.trim()}
                    submitLabel="Upload Document"
                    submitIcon={<Upload size={13} />} />
            )}
        </ModalShell>
    );
}

// ─── UPDATE Modal ─────────────────────────────────────────────────────────────

function UpdateModal({ doc, onClose, onSuccess }: { doc: OrgDocument; onClose: () => void; onSuccess: () => void }) {
    const [title, setTitle] = useState(doc.title);
    const [description, setDescription] = useState(doc.description ?? "");
    const [visibility, setVisibility] = useState<"Internal" | "External">(doc.visibility);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [saving, setSaving] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const currentUrl = resolveUrl(doc.file_url);
    const [currentErr, setCurrentErr] = useState(false);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose, saving]);

    function pickFile(f: File) {
        setFile(f); setError(null);
        if (f.type.startsWith("image/")) {
            const r = new FileReader();
            r.onload = e => setPreview(e.target?.result as string);
            r.readAsDataURL(f);
        } else setPreview(null);
    }

    async function handleSubmit() {
        if (!title.trim()) { setError("Title is required."); return; }
        setSaving(true); setError(null); setProgress(10);
        try {
            const sb = createClient();
            let newFileUrl = doc.file_url;

            if (file) {
                // Upload new file
                const ext = file.name.split(".").pop() ?? "bin";
                const safeName = slugify(file.name.replace(`.${ext}`, ""));
                const storagePath = `${Date.now()}-${safeName}.${ext}`;
                setProgress(25);
                const { error: upErr } = await sb.storage.from(BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
                if (upErr) throw upErr;
                setProgress(50);
                // Delete old file from storage (best-effort, ignore errors)
                if (isBucketPath(doc.file_url)) {
                    await sb.storage.from(BUCKET).remove([doc.file_url]).catch(() => null);
                }
                newFileUrl = storagePath;
            }

            setProgress(75);
            const { error: updErr } = await sb
                .from("administrative_org_documents")
                .update({
                    title: title.trim(),
                    description: description.trim() || null,
                    visibility,
                    file_url: newFileUrl,
                })
                .eq("id", doc.id);
            if (updErr) throw updErr;
            setProgress(100); setDone(true);
            setTimeout(() => { onSuccess(); onClose(); }, 1100);
        } catch (err: any) {
            setError(err?.message ?? "Update failed."); setSaving(false); setProgress(0);
        }
    }

    return (
        <ModalShell
            title="Edit Document"
            subtitle={`ID #${doc.id}`}
            icon={<Pencil size={14} className="text-white" />}
            iconBg="from-indigo-500 to-indigo-700"
            onClose={!saving ? onClose : undefined}>
            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                {done ? <SuccessState label="Document updated!" /> : (
                    <>
                        {/* Current file preview */}
                        <div className="space-y-1.5">
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Current File
                            </p>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                                    {isImage(currentUrl) && !currentErr
                                        ? <img src={currentUrl} alt="current" className="w-full h-full object-cover" onError={() => setCurrentErr(true)} />
                                        : isPdf(currentUrl)
                                            ? <FileText size={18} className="text-rose-400" />
                                            : <ImageOff size={16} className="text-slate-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{doc.file_url.split("/").pop()}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Replace below to upload a new file</p>
                                </div>
                            </div>
                        </div>

                        {/* Replace file zone */}
                        <div className="space-y-1.5">
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Replace File <span className="text-slate-300 dark:text-slate-600 font-normal normal-case tracking-normal">(optional)</span>
                            </p>
                            <FileDropZone
                                file={file} preview={preview} dragging={dragging} disabled={saving}
                                label="Drop a new file to replace current"
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
                                onClick={() => fileRef.current?.click()}
                                onRemove={e => { e.stopPropagation(); setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                                fileRef={fileRef}
                                onFileInput={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
                        </div>

                        <FieldGroup label="Title" required>
                            <input type="text" placeholder="Document title"
                                value={title} onChange={e => setTitle(e.target.value)} disabled={saving}
                                className={inputCls} />
                        </FieldGroup>
                        <FieldGroup label="Description" optional>
                            <textarea placeholder="Brief description…" value={description}
                                onChange={e => setDescription(e.target.value)} disabled={saving}
                                rows={2} className={`${inputCls} resize-none`} />
                        </FieldGroup>
                        <FieldGroup label="Visibility" required>
                            <VisibilityPicker value={visibility} onChange={setVisibility} disabled={saving} />
                        </FieldGroup>
                        {error && <ErrorBanner msg={error} />}
                    </>
                )}
            </div>
            {!done && (
                <ModalFooter
                    saving={saving} progress={progress}
                    onCancel={onClose}
                    onSubmit={handleSubmit}
                    submitDisabled={saving || !title.trim()}
                    submitLabel="Save Changes"
                    submitIcon={<CheckCircle2 size={13} />}
                    savingLabel="Saving…"
                    progressColor="from-indigo-400 to-indigo-600" />
            )}
        </ModalShell>
    );
}

// ─── DELETE Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ doc, onClose, onSuccess }: { doc: OrgDocument; onClose: () => void; onSuccess: () => void }) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !deleting) onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose, deleting]);

    async function handleDelete() {
        setDeleting(true); setError(null);
        try {
            const sb = createClient();
            // Delete from DB first
            const { error: delErr } = await sb
                .from("administrative_org_documents")
                .delete()
                .eq("id", doc.id);
            if (delErr) throw delErr;
            // Then clean up storage (best-effort)
            if (isBucketPath(doc.file_url)) {
                await sb.storage.from(BUCKET).remove([doc.file_url]).catch(() => null);
            }
            setDone(true);
            setTimeout(() => { onSuccess(); onClose(); }, 900);
        } catch (err: any) {
            setError(err?.message ?? "Delete failed."); setDeleting(false);
        }
    }

    const currentUrl = resolveUrl(doc.file_url);
    const [imgErr, setImgErr] = useState(false);

    return (
        <ModalShell
            title="Delete Document"
            subtitle="This action cannot be undone"
            icon={<Trash2 size={14} className="text-white" />}
            iconBg="from-rose-500 to-rose-700"
            onClose={!deleting ? onClose : undefined}>
            <div className="px-6 py-5 space-y-4">
                {done ? <SuccessState label="Document deleted!" icon="trash" /> : (
                    <>
                        {/* Document preview */}
                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30">
                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center">
                                {isImage(currentUrl) && !imgErr
                                    ? <img src={currentUrl} alt={doc.title} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
                                    : isPdf(currentUrl)
                                        ? <FileText size={18} className="text-rose-400" />
                                        : <ImageOff size={16} className="text-rose-300" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-slate-900 dark:text-white truncate">{doc.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <VisibilityBadge v={doc.visibility} />
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500">{formatDate(doc.created_at)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
                            <p className="text-xs font-black text-slate-700 dark:text-slate-300">This will permanently:</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-rose-400 shrink-0 inline-block" />
                                Delete the record from the database
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-rose-400 shrink-0 inline-block" />
                                Remove the file from <span className="font-mono text-[10px]">{BUCKET}</span> storage
                            </p>
                        </div>

                        {error && <ErrorBanner msg={error} />}
                    </>
                )}
            </div>
            {!done && (
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <button onClick={onClose} disabled={deleting}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-all">
                        Cancel
                    </button>
                    <button onClick={handleDelete} disabled={deleting}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-700 text-sm font-black text-white hover:from-rose-400 hover:to-rose-600 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                        {deleting ? <><Loader2 size={14} className="animate-spin" /> Deleting…</> : <><Trash2 size={13} /> Delete</>}
                    </button>
                </div>
            )}
        </ModalShell>
    );
}

// ─── Shared Modal Primitives ──────────────────────────────────────────────────

const inputCls = "w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none transition-all disabled:opacity-50";

function FieldGroup({ label, required, optional, children }: {
    label: string; required?: boolean; optional?: boolean; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {label}
                {required && <span className="text-rose-400 ml-0.5">*</span>}
                {optional && <span className="text-slate-300 dark:text-slate-600 font-normal normal-case tracking-normal ml-1">(optional)</span>}
            </label>
            {children}
        </div>
    );
}

function ErrorBanner({ msg }: { msg: string }) {
    return (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl">
            <AlertTriangle size={13} className="text-rose-500 shrink-0" />
            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{msg}</p>
        </div>
    );
}

function SuccessState({ label, icon }: { label: string; icon?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${icon === "trash"
                    ? "bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30"
                    : "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30"
                }`}>
                {icon === "trash"
                    ? <Trash2 size={26} className="text-rose-500" />
                    : <CheckCircle2 size={28} className="text-emerald-500" />}
            </div>
            <p className="text-sm font-black text-slate-900 dark:text-white">{label}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Refreshing list…</p>
        </div>
    );
}

function ModalShell({ title, subtitle, icon, iconBg, onClose, children }: {
    title: string; subtitle: string; icon: React.ReactNode; iconBg: string;
    onClose?: () => void; children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-sm`}>{icon}</div>
                        <div>
                            <h2 className="text-sm font-black text-slate-900 dark:text-white">{title}</h2>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">{subtitle}</p>
                        </div>
                    </div>
                    {onClose && (
                        <button onClick={onClose}
                            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all">
                            <X size={15} />
                        </button>
                    )}
                </div>
                {children}
            </div>
        </div>
    );
}

function ModalFooter({
    saving, progress, onCancel, onSubmit, submitDisabled, submitLabel, submitIcon,
    savingLabel = "Saving…", progressColor = "from-teal-400 to-teal-600",
}: {
    saving: boolean; progress: number; onCancel: () => void; onSubmit: () => void;
    submitDisabled: boolean; submitLabel: string; submitIcon: React.ReactNode;
    savingLabel?: string; progressColor?: string;
}) {
    return (
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {saving && (
                <div className="space-y-1.5">
                    <div className="flex justify-between">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{savingLabel}</span>
                        <span className="text-[10px] font-black text-teal-600 dark:text-teal-400 tabular-nums">{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all duration-500`}
                            style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}
            <div className="flex items-center gap-2">
                <button onClick={onCancel} disabled={saving}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-all">
                    Cancel
                </button>
                <button onClick={onSubmit} disabled={submitDisabled}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-700 text-sm font-black text-white hover:from-teal-400 hover:to-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> {savingLabel}</> : <>{submitIcon} {submitLabel}</>}
                </button>
            </div>
        </div>
    );
}

// ─── Doc Card Action Menu ─────────────────────────────────────────────────────

function ActionMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    return (
        <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpen(p => !p)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-all">
                <MoreVertical size={13} />
            </button>
            {open && (
                <div className="absolute right-0 top-8 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden w-32 animate-in fade-in slide-in-from-top-2 duration-150">
                    <button onClick={() => { setOpen(false); onEdit(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <Pencil size={11} className="text-indigo-500" /> Edit
                    </button>
                    <div className="border-t border-slate-100 dark:border-slate-700/50" />
                    <button onClick={() => { setOpen(false); onDelete(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                        <Trash2 size={11} /> Delete
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Document Grid Card ───────────────────────────────────────────────────────

function DocGridCard({ doc, onEdit, onDelete }: {
    doc: OrgDocument; onEdit: () => void; onDelete: () => void;
}) {
    const [imgErr, setImgErr] = useState(false);
    const [lb, setLb] = useState(false);
    const url = resolveUrl(doc.file_url);
    const showImg = isImage(url) && !imgErr;

    return (
        <>
            {lb && <Lightbox url={url} title={doc.title} onClose={() => setLb(false)} />}
            <div className="group bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                <div onClick={() => setLb(true)}
                    className="relative w-full bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center overflow-hidden cursor-pointer"
                    style={{ height: 160 }}>
                    {showImg ? (
                        <img src={url} alt={doc.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                            onError={() => setImgErr(true)} />
                    ) : isPdf(url) ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center">
                                <FileText size={22} className="text-rose-500 dark:text-rose-400" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">PDF Document</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                <ImageOff size={20} className="text-slate-300 dark:text-slate-600" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">No Preview</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                        <span className="p-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/10">
                            <Maximize2 size={15} className="text-white" />
                        </span>
                    </div>
                    <div className="absolute top-2 left-2"><VisibilityBadge v={doc.visibility} /></div>
                </div>
                <div className="px-3.5 py-3 flex flex-col gap-1.5 flex-1">
                    <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-tight line-clamp-2 flex-1">{doc.title}</p>
                        <ActionMenu onEdit={onEdit} onDelete={onDelete} />
                    </div>
                    {doc.description && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2">{doc.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-1">
                        <span className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                            <Calendar size={9} /> {formatDate(doc.created_at)}
                        </span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setLb(true)}
                                className="flex items-center gap-1 text-[9px] font-bold text-teal-600 dark:text-teal-400 hover:underline">
                                <Eye size={9} /> View
                            </button>
                            <span className="text-slate-200 dark:text-slate-700">·</span>
                            <a href={url} download target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 hover:underline">
                                <Download size={9} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Document List Row ────────────────────────────────────────────────────────

function DocListRow({ doc, num, onEdit, onDelete }: {
    doc: OrgDocument; num: number; onEdit: () => void; onDelete: () => void;
}) {
    const [imgErr, setImgErr] = useState(false);
    const [lb, setLb] = useState(false);
    const url = resolveUrl(doc.file_url);
    const showImg = isImage(url) && !imgErr;

    return (
        <>
            {lb && <Lightbox url={url} title={doc.title} onClose={() => setLb(false)} />}
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3 hover:shadow-md transition-all duration-200">
                <span className="w-6 text-center text-[11px] font-black text-slate-300 dark:text-slate-600 shrink-0 tabular-nums">{num}</span>
                <div onClick={() => setLb(true)}
                    className="w-14 h-14 rounded-xl overflow-hidden shrink-0 cursor-pointer bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:opacity-80 transition-opacity">
                    {showImg
                        ? <img src={url} alt={doc.title} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
                        : isPdf(url)
                            ? <FileText size={18} className="text-rose-400" />
                            : <ImageOff size={16} className="text-slate-300 dark:text-slate-600" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{doc.title}</p>
                        <VisibilityBadge v={doc.visibility} />
                    </div>
                    {doc.description && <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{doc.description}</p>}
                    <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5 flex items-center gap-1">
                        <Calendar size={9} /> {formatDate(doc.created_at)}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setLb(true)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all">
                        <Eye size={13} />
                    </button>
                    <a href={url} download target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all">
                        <Download size={13} />
                    </a>
                    <button onClick={onEdit}
                        className="p-2 rounded-xl border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-500 transition-all">
                        <Pencil size={13} />
                    </button>
                    <button onClick={onDelete}
                        className="p-2 rounded-xl border border-rose-200 dark:border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 transition-all">
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
        </>
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

type ModalState =
    | { type: "none" }
    | { type: "create" }
    | { type: "edit"; doc: OrgDocument }
    | { type: "delete"; doc: OrgDocument };

export default function DocuOrganizations() {
    const [docs, setDocs] = useState<OrgDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modal, setModal] = useState<ModalState>({ type: "none" });

    const [search, setSearch] = useState("");
    const [fVisibility, setFVisibility] = useState<"all" | "Internal" | "External">("all");
    const [page, setPage] = useState(1);
    const [view, setView] = useState<"grid" | "list">("grid");

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const sb = createClient();
            const { data, error: err } = await sb
                .from("administrative_org_documents")
                .select("id, title, file_url, visibility, description, created_at")
                .order("created_at", { ascending: false });
            if (err) throw err;
            setDocs(data ?? []);
        } catch (err: any) {
            setError(err?.message ?? "Failed to load.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [search, fVisibility]);

    const filtered = docs.filter(d => {
        const q = search.toLowerCase();
        const nameMatch = d.title.toLowerCase().includes(q) || (d.description ?? "").toLowerCase().includes(q);
        const visMatch = fVisibility === "all" || d.visibility === fVisibility;
        return nameMatch && visMatch;
    });

    const totalInternal = docs.filter(d => d.visibility === "Internal").length;
    const totalExternal = docs.filter(d => d.visibility === "External").length;
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const pageFrom = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const pageTo = Math.min(page * PER_PAGE, filtered.length);
    const paginated = filtered.slice(pageFrom - 1, pageTo);

    function closeModal() { setModal({ type: "none" }); }

    return (
        <>
            {/* ── Modals ── */}
            {modal.type === "create" && (
                <CreateModal onClose={closeModal} onSuccess={load} />
            )}
            {modal.type === "edit" && (
                <UpdateModal doc={modal.doc} onClose={closeModal} onSuccess={load} />
            )}
            {modal.type === "delete" && (
                <DeleteModal doc={modal.doc} onClose={closeModal} onSuccess={load} />
            )}

            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500">

                {/* ── Page header ── */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-600 to-teal-900 dark:from-teal-500 dark:to-teal-800 flex items-center justify-center shadow-sm">
                                <Building2 size={15} className="text-white" />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                                Organization Documents
                            </h1>
                        </div>
                        <p className="text-sm text-slate-400 dark:text-slate-500 ml-10">
                            Administrative & organizational files
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl gap-0.5">
                            <button onClick={() => setView("grid")}
                                className={`p-1.5 rounded-lg transition-all ${view === "grid" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                                <LayoutGrid size={14} />
                            </button>
                            <button onClick={() => setView("list")}
                                className={`p-1.5 rounded-lg transition-all ${view === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                                <List size={14} />
                            </button>
                        </div>
                        <button onClick={load} disabled={loading}
                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all">
                            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
                        </button>
                        <button onClick={() => setModal({ type: "create" })}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-600 text-white text-xs font-black rounded-xl shadow-sm hover:shadow-md transition-all">
                            <Plus size={13} /> Add
                        </button>
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Total</p>
                            <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-500/15 flex items-center justify-center">
                                <FolderOpen size={12} className="text-teal-600 dark:text-teal-400" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black tabular-nums text-slate-900 dark:text-white">{docs.length}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">External</p>
                            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center">
                                <Globe size={12} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">{totalExternal}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Publicly visible</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl col-span-2 sm:col-span-1 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Internal</p>
                            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center">
                                <Lock size={12} className="text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black tabular-nums text-amber-600 dark:text-amber-400">{totalInternal}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Staff only</p>
                    </div>
                </div>

                {/* ── Filters ── */}
                <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3 space-y-2.5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                        <input type="text" placeholder="Search by title or description…"
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none transition-all" />
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <Filter size={11} className="text-slate-400 shrink-0" />
                        <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl">
                            {(["all", "External", "Internal"] as const).map(v => (
                                <button key={v} onClick={() => setFVisibility(v)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${fVisibility === v
                                            ? v === "External" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-sm"
                                                : v === "Internal" ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-sm"
                                                    : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                                        }`}>
                                    {v === "External" && <Globe size={9} />}
                                    {v === "Internal" && <Lock size={9} />}
                                    {v === "all" ? "All" : v}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Content ── */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-3">
                        <Loader2 className="w-8 h-8 text-slate-300 dark:text-slate-600 animate-spin" />
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading documents…</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center">
                            <AlertTriangle size={20} className="text-rose-500" />
                        </div>
                        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
                        <button onClick={load} className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline">Try again</button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                            <FolderOpen size={20} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm font-semibold text-slate-400">No documents found</p>
                        <div className="flex items-center gap-3">
                            <button onClick={() => { setSearch(""); setFVisibility("all"); }}
                                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline">
                                Clear filters
                            </button>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <button onClick={() => setModal({ type: "create" })}
                                className="flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline">
                                <Plus size={10} /> Add one now
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20">
                            <span className="text-xs font-semibold text-slate-400">
                                {filtered.length} document{filtered.length !== 1 ? "s" : ""} found
                            </span>
                            <span className="text-[9px] font-medium">
                                {totalExternal > 0 && <span className="text-emerald-500">{totalExternal} ext</span>}
                                {totalExternal > 0 && totalInternal > 0 && <span className="text-slate-300 dark:text-slate-600"> · </span>}
                                {totalInternal > 0 && <span className="text-amber-500">{totalInternal} int</span>}
                            </span>
                        </div>

                        <div className={view === "grid"
                            ? "p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                            : "p-3 space-y-2"}>
                            {paginated.map((doc, i) =>
                                view === "grid" ? (
                                    <DocGridCard key={doc.id} doc={doc}
                                        onEdit={() => setModal({ type: "edit", doc })}
                                        onDelete={() => setModal({ type: "delete", doc })} />
                                ) : (
                                    <DocListRow key={doc.id} doc={doc} num={pageFrom + i}
                                        onEdit={() => setModal({ type: "edit", doc })}
                                        onDelete={() => setModal({ type: "delete", doc })} />
                                )
                            )}
                        </div>

                        <div className="px-4">
                            <PaginationBar cur={page} total={totalPages}
                                from={pageFrom} to={pageTo} count={filtered.length}
                                onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}