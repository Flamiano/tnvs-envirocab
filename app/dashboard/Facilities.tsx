"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Building2,
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  ChevronDown,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  ImagePlus,
  FileText,
  Wrench,
  Trash2,
  RefreshCw,
  MoreVertical,
  AlertTriangle,
  LayoutGrid,
  LayoutList,
  CalendarDays,
  UserRound,
  ShieldCheck,
  Eye,
  ZoomIn,
} from "lucide-react";

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "pending" | "approved" | "declined";

interface Facility {
  id: string;
  created_at: string;
  facility_name: string;
  facility_image_url: string | null;
  reservation_date: string;
  reservation_time: string;
  participants: number;
  purpose: string | null;
  equipment: string | null;
  created_by: string | null;
  requested_by_name: string;
  status: Status;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<Status, { label: string; badge: string; dot: string }> = {
  pending: {
    label: "Pending",
    badge:
      "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
    dot: "bg-amber-400",
  },
  approved: {
    label: "Approved",
    badge:
      "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  declined: {
    label: "Declined",
    badge:
      "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20",
    dot: "bg-rose-500",
  },
};

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg {
  id: number;
  message: string;
  type: "success" | "error";
}

function Toast({
  toasts,
  remove,
}: {
  toasts: ToastMsg[];
  remove: (id: number) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold backdrop-blur-sm border animate-in slide-in-from-bottom-3 ${t.type === "success"
              ? "bg-emerald-950/90 border-emerald-800/60 text-emerald-100"
              : "bg-rose-950/90 border-rose-800/60 text-rose-100"
            }`}
        >
          {t.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          )}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="opacity-50 hover:opacity-100 shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: () => void;
}

function ConfirmDialog({
  state,
  onClose,
}: {
  state: ConfirmState;
  onClose: () => void;
}) {
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 lg:pl-72">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-7 max-w-sm w-full animate-in zoom-in-95 fade-in duration-150">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${state.danger
              ? "bg-rose-100 dark:bg-rose-500/15"
              : "bg-sky-100 dark:bg-sky-500/15"
            }`}
        >
          <AlertTriangle
            className={
              state.danger
                ? "text-rose-600 dark:text-rose-400"
                : "text-sky-600 dark:text-sky-400"
            }
            size={20}
          />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5">
          {state.title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
          {state.description}
        </p>
        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              state.onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${state.danger
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-sky-600 hover:bg-sky-700"
              }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Image Lightbox ───────────────────────────────────────────────────────────

function Lightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      >
        <X size={18} className="text-white" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ─── Action Menu ──────────────────────────────────────────────────────────────

function ActionMenu({
  facility,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  facility: Facility;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: Status) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className={`p-2 rounded-lg border transition-all duration-150 ${open
            ? "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200"
            : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:border-slate-200 dark:hover:border-slate-600"
          }`}
      >
        <MoreVertical size={17} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/40 z-30 overflow-hidden">
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Status
            </p>
          </div>
          {(["approved", "pending", "declined"] as Status[])
            .filter((s) => s !== facility.status)
            .map((s) => {
              const cfg = STATUS_CFG[s];
              return (
                <button
                  key={s}
                  onClick={() => {
                    onStatusChange(s);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`}
                  />
                  Mark as {cfg.label}
                </button>
              );
            })}

          <div className="mx-3 my-1.5 h-px bg-slate-100 dark:bg-slate-800" />
          <div className="px-3 pb-1">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Manage
            </p>
          </div>

          <button
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center shrink-0">
              <FileText size={13} className="text-sky-600 dark:text-sky-400" />
            </span>
            Edit Reservation
          </button>

          <button
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 mb-1 text-sm font-medium text-rose-700 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
          >
            <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
              <Trash2 size={13} className="text-rose-700 dark:text-rose-500" />
            </span>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Facility Card (Grid View) ────────────────────────────────────────────────

function FacilityCard({
  facility,
  onEdit,
  onDelete,
  onStatusChange,
  onImageClick,
}: {
  facility: Facility;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: Status) => void;
  onImageClick: () => void;
}) {
  const cfg = STATUS_CFG[facility.status];

  return (
    <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md dark:hover:shadow-black/30 transition-all duration-200 group">
      {/* Image */}
      <div
        className="relative h-44 bg-slate-100 dark:bg-slate-900/60 overflow-hidden cursor-pointer"
        onClick={onImageClick}
      >
        {facility.facility_image_url ? (
          <>
            <img
              src={facility.facility_image_url}
              alt={facility.facility_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <ZoomIn size={16} className="text-slate-700" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300 dark:text-slate-600">
            <Building2 size={36} />
            <span className="text-xs font-medium">No image</span>
          </div>
        )}
        <span
          className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${cfg.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-1">
            {facility.facility_name}
          </h3>
          <ActionMenu
            facility={facility}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <UserRound size={12} className="shrink-0 text-slate-400" />
            <span className="truncate">{facility.requested_by_name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <CalendarDays size={12} className="shrink-0 text-slate-400" />
            <span>
              {facility.reservation_date} · {facility.reservation_time}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Users size={12} className="shrink-0 text-slate-400" />
            <span>
              {facility.participants} participant
              {facility.participants !== 1 ? "s" : ""}
            </span>
          </div>
          {facility.equipment && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Wrench size={12} className="shrink-0 text-slate-400" />
              <span className="truncate">{facility.equipment}</span>
            </div>
          )}
        </div>

        {facility.purpose && (
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed border-t border-slate-100 dark:border-slate-700/60 pt-3">
            {facility.purpose}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Form Field Wrapper ───────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition-all";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function FacilityModal({
  open,
  onClose,
  onSaved,
  editing,
  addToast,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (f: Facility) => void;
  editing: Facility | null;
  addToast: (msg: string, type: "success" | "error") => void;
}) {
  const [form, setForm] = useState({
    facility_name: "",
    reservation_date: "",
    reservation_time: "",
    participants: 1,
    purpose: "",
    equipment: "",
    requested_by_name: "",
    status: "pending" as Status,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          facility_name: editing.facility_name,
          reservation_date: editing.reservation_date,
          reservation_time: editing.reservation_time,
          participants: editing.participants,
          purpose: editing.purpose ?? "",
          equipment: editing.equipment ?? "",
          requested_by_name: editing.requested_by_name,
          status: editing.status,
        });
        setImagePreview(editing.facility_image_url ?? null);
      } else {
        setForm({
          facility_name: "",
          reservation_date: "",
          reservation_time: "",
          participants: 1,
          purpose: "",
          equipment: "",
          requested_by_name: "",
          status: "pending",
        });
        setImagePreview(null);
      }
      setImageFile(null);
    }
  }, [editing, open]);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (
      !form.facility_name ||
      !form.reservation_date ||
      !form.reservation_time ||
      !form.requested_by_name
    ) {
      addToast("Please fill in all required fields.", "error");
      return;
    }
    setSaving(true);
    try {
      let image_url = editing?.facility_image_url ?? null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `administrative_facilities/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("administrative_facilities")
          .upload(path, imageFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("administrative_facilities")
          .getPublicUrl(path);
        image_url = urlData.publicUrl;
      }
      const payload = { ...form, facility_image_url: image_url };
      let result: Facility;
      if (editing) {
        const { data, error } = await supabase
          .from("administrative_facilities")
          .update(payload)
          .eq("id", editing.id)
          .select()
          .single();
        if (error) throw error;
        result = data as Facility;
        addToast("Facility updated!", "success");
      } else {
        const { data, error } = await supabase
          .from("administrative_facilities")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        result = data as Facility;
        addToast("Reservation added!", "success");
      }
      onSaved(result);
      onClose();
    } catch (err: any) {
      addToast(err.message ?? "Something went wrong.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 lg:pl-72">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg animate-in zoom-in-95 fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                <Building2
                  size={18}
                  className="text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {editing ? "Edit Reservation" : "New Reservation"}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {editing
                    ? "Update the details below"
                    : "Fill in the form to add a reservation"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={17} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Image Upload */}
            <div
              onClick={() => fileRef.current?.click()}
              className="relative cursor-pointer group rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500/60 transition-colors overflow-hidden"
              style={{ height: 150 }}
            >
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      Change Image
                    </span>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                  <ImagePlus size={26} />
                  <span className="text-xs font-semibold">
                    Click to upload facility image
                  </span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImage}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Facility Name *">
                  <input
                    className={inputCls}
                    placeholder="e.g. Conference Room A"
                    value={form.facility_name}
                    onChange={(e) =>
                      setForm({ ...form, facility_name: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Requested By *">
                  <div className="relative">
                    <UserRound
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      className={inputCls + " pl-9"}
                      placeholder="Full name"
                      value={form.requested_by_name}
                      onChange={(e) =>
                        setForm({ ...form, requested_by_name: e.target.value })
                      }
                    />
                  </div>
                </Field>
              </div>
              <Field label="Date *">
                <div className="relative">
                  <Calendar
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="date"
                    className={inputCls + " pl-9"}
                    value={form.reservation_date}
                    onChange={(e) =>
                      setForm({ ...form, reservation_date: e.target.value })
                    }
                  />
                </div>
              </Field>
              <Field label="Time *">
                <div className="relative">
                  <Clock
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="time"
                    className={inputCls + " pl-9"}
                    value={form.reservation_time}
                    onChange={(e) =>
                      setForm({ ...form, reservation_time: e.target.value })
                    }
                  />
                </div>
              </Field>
              <div className="col-span-2">
                <Field label="Participants">
                  <div className="relative">
                    <Users
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type="number"
                      min={1}
                      className={inputCls + " pl-9"}
                      value={form.participants}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          participants: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Equipment">
                  <div className="relative">
                    <Wrench
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      className={inputCls + " pl-9"}
                      placeholder="e.g. Projector, Whiteboard"
                      value={form.equipment}
                      onChange={(e) =>
                        setForm({ ...form, equipment: e.target.value })
                      }
                    />
                  </div>
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Purpose">
                  <textarea
                    rows={3}
                    className={inputCls + " resize-none"}
                    placeholder="Describe the purpose..."
                    value={form.purpose}
                    onChange={(e) =>
                      setForm({ ...form, purpose: e.target.value })
                    }
                  />
                </Field>
              </div>
              {editing && (
                <div className="col-span-2">
                  <Field label="Status">
                    <div className="relative">
                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <select
                        className={inputCls + " appearance-none pr-9"}
                        value={form.status}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            status: e.target.value as Status,
                          })
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="declined">Declined</option>
                      </select>
                    </div>
                  </Field>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm font-bold text-white transition-colors shadow-sm shadow-emerald-500/20"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Reservation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

export default function Facilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "",
    danger: false,
    onConfirm: () => { },
  });
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const toastId = useRef(0);
  const addToast = (message: string, type: "success" | "error") => {
    const id = ++toastId.current;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  };
  const removeToast = (id: number) =>
    setToasts((p) => p.filter((t) => t.id !== id));

  const loadFacilities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("administrative_facilities")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) addToast(error.message, "error");
    else setFacilities(data as Facility[]);
    setLoading(false);
  };

  useEffect(() => {
    loadFacilities();
  }, []);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  const handleSaved = (f: Facility) => {
    setFacilities((prev) => {
      const exists = prev.find((x) => x.id === f.id);
      return exists ? prev.map((x) => (x.id === f.id ? f : x)) : [f, ...prev];
    });
  };

  const handleDelete = (facility: Facility) => {
    setConfirm({
      open: true,
      title: "Delete Reservation",
      description: `Permanently delete "${facility.facility_name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        setActionLoading(facility.id);
        const { error } = await supabase
          .from("administrative_facilities")
          .delete()
          .eq("id", facility.id);
        setActionLoading(null);
        if (error) addToast(error.message, "error");
        else {
          setFacilities((p) => p.filter((f) => f.id !== facility.id));
          addToast("Deleted.", "success");
        }
      },
    });
  };

  const handleStatusChange = async (facility: Facility, status: Status) => {
    setActionLoading(facility.id);
    const { error } = await supabase
      .from("administrative_facilities")
      .update({ status })
      .eq("id", facility.id);
    setActionLoading(null);
    if (error) addToast(error.message, "error");
    else {
      setFacilities((p) =>
        p.map((f) => (f.id === facility.id ? { ...f, status } : f))
      );
      addToast(`Marked as ${status}.`, "success");
    }
  };

  const filtered = facilities.filter((f) => {
    const q = search.toLowerCase();
    const matchSearch =
      f.facility_name.toLowerCase().includes(q) ||
      f.requested_by_name.toLowerCase().includes(q);
    const matchStatus =
      filterStatus === "all" || f.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginatedRows = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Stats
  const total = facilities.length;
  const pending = facilities.filter((f) => f.status === "pending").length;
  const approved = facilities.filter((f) => f.status === "approved").length;
  const withImages = facilities.filter((f) => !!f.facility_image_url).length;

  return (
    <>
      <Toast toasts={toasts} remove={removeToast} />
      <ConfirmDialog
        state={confirm}
        onClose={() => setConfirm((p) => ({ ...p, open: false }))}
      />
      {lightbox && (
        <Lightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
      <FacilityModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
        editing={editing}
        addToast={addToast}
      />

      <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Facilities
              </h1>
              <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                  Live
                </span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Manage building reservations and facility approvals.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadFacilities}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wide rounded-xl transition-all shadow-sm shadow-emerald-500/20"
            >
              <Plus size={14} />
              <span>Add Reservation</span>
            </button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total */}
          <div className="bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden">
            <Building2 className="absolute -right-3 -bottom-3 w-16 sm:w-20 h-16 sm:h-20 opacity-5" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Total
            </p>
            <p className="text-3xl sm:text-4xl font-black tabular-nums">
              {total}
            </p>
          </div>

          {/* Pending */}
          <div className="bg-white dark:bg-slate-800/60 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
                  Pending
                </p>
                <p className="text-3xl sm:text-4xl font-black tabular-nums text-amber-500 dark:text-amber-400">
                  {pending}
                </p>
              </div>
              <div className="p-2 sm:p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-100 dark:border-amber-500/20 shrink-0">
                <Clock
                  size={16}
                  className="sm:w-[18px] sm:h-[18px] text-amber-600 dark:text-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Approved */}
          <div className="bg-white dark:bg-slate-800/60 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
                  Approved
                </p>
                <p className="text-3xl sm:text-4xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                  {approved}
                </p>
              </div>
              <div className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20 shrink-0">
                <ShieldCheck
                  size={16}
                  className="sm:w-[18px] sm:h-[18px] text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* With Photos */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
                  With Photos
                </p>
                <p className="text-3xl sm:text-4xl font-black tabular-nums text-slate-900 dark:text-white">
                  {withImages}
                </p>
              </div>
              <div className="p-2 sm:p-2.5 bg-sky-50 dark:bg-sky-500/10 rounded-xl border border-sky-100 dark:border-sky-500/20 shrink-0">
                <Eye
                  size={16}
                  className="sm:w-[18px] sm:h-[18px] text-sky-600 dark:text-sky-400"
                />
              </div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-700"
                style={{
                  width:
                    total > 0
                      ? `${Math.round((withImages / total) * 100)}%`
                      : "0%",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Main Card ── */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center p-3 sm:p-4 border-b border-slate-100 dark:border-slate-700/60">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size={14}
              />
              <input
                type="text"
                placeholder="Search facility or requester…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition-all"
              />
            </div>

            {/* Filter pills */}
            <div className="flex gap-1 shrink-0 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg overflow-x-auto">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilterStatus(f.value)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all duration-150 ${filterStatus === f.value
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex gap-1 shrink-0 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid view"
                className={`p-1.5 rounded-md transition-all ${viewMode === "grid"
                    ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                title="Table view"
                className={`p-1.5 rounded-md transition-all ${viewMode === "table"
                    ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
              >
                <LayoutList size={15} />
              </button>
            </div>
          </div>

          {/* ── GRID VIEW ── */}
          {viewMode === "grid" && (
            <div className="p-4 sm:p-5">
              {loading ? (
                <div className="flex items-center justify-center py-20 gap-3">
                  <Loader2
                    className="animate-spin text-slate-300 dark:text-slate-600"
                    size={28}
                  />
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Loading…
                  </span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Building2
                      size={22}
                      className="text-slate-300 dark:text-slate-600"
                    />
                  </div>
                  <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                    No reservations found.
                  </p>
                  {(search || filterStatus !== "all") && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setFilterStatus("all");
                      }}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map((f) => (
                    <div key={f.id} className="relative">
                      {actionLoading === f.id && (
                        <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 rounded-2xl z-10 flex items-center justify-center">
                          <Loader2
                            size={20}
                            className="animate-spin text-emerald-500"
                          />
                        </div>
                      )}
                      <FacilityCard
                        facility={f}
                        onEdit={() => {
                          setEditing(f);
                          setModalOpen(true);
                        }}
                        onDelete={() => handleDelete(f)}
                        onStatusChange={(s) => handleStatusChange(f, s)}
                        onImageClick={() => {
                          if (f.facility_image_url)
                            setLightbox({
                              src: f.facility_image_url,
                              alt: f.facility_name,
                            });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TABLE VIEW ── */}
          {viewMode === "table" && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/20">
                      {[
                        "Facility",
                        "Requested By",
                        "Date & Time",
                        "Participants",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 sm:px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2
                              className="animate-spin text-slate-300 dark:text-slate-600"
                              size={28}
                            />
                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              Loading…
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <Building2
                                size={22}
                                className="text-slate-300 dark:text-slate-600"
                              />
                            </div>
                            <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                              No reservations match.
                            </p>
                            <button
                              onClick={() => {
                                setSearch("");
                                setFilterStatus("all");
                              }}
                              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              Clear filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((f) => {
                        const cfg = STATUS_CFG[f.status];
                        return (
                          <tr
                            key={f.id}
                            className="group hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors duration-100"
                          >
                            <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                              <div className="flex items-center gap-3">
                                {/* Clickable thumbnail */}
                                <div
                                  className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900/60 shrink-0 cursor-pointer relative group/img"
                                  onClick={() => {
                                    if (f.facility_image_url)
                                      setLightbox({
                                        src: f.facility_image_url,
                                        alt: f.facility_name,
                                      });
                                  }}
                                >
                                  {f.facility_image_url ? (
                                    <>
                                      <img
                                        src={f.facility_image_url}
                                        alt={f.facility_name}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center">
                                        <ZoomIn
                                          size={12}
                                          className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                                        />
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Building2
                                        size={16}
                                        className="text-slate-300 dark:text-slate-600"
                                      />
                                    </div>
                                  )}
                                </div>
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight max-w-[140px]">
                                  {f.facility_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-sm text-slate-500 dark:text-slate-400">
                              {f.requested_by_name}
                            </td>
                            <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {f.reservation_date}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">
                                {f.reservation_time}
                              </p>
                            </td>
                            <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                              <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                                <Users
                                  size={13}
                                  className="text-slate-400 shrink-0"
                                />
                                {f.participants}
                              </div>
                            </td>
                            <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${cfg.badge}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                                />
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right">
                              {actionLoading === f.id ? (
                                <Loader2
                                  size={15}
                                  className="animate-spin text-slate-400 ml-auto"
                                />
                              ) : (
                                <ActionMenu
                                  facility={f}
                                  onEdit={() => {
                                    setEditing(f);
                                    setModalOpen(true);
                                  }}
                                  onDelete={() => handleDelete(f)}
                                  onStatusChange={(s) =>
                                    handleStatusChange(f, s)
                                  }
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 0 && (
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-transparent">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {(currentPage - 1) * rowsPerPage + 1}–
                    {Math.min(currentPage * rowsPerPage, filtered.length)} of{" "}
                    {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.max(p - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-slate-500 dark:text-slate-400"
                    >
                      <ChevronDown size={15} className="rotate-90" />
                    </button>
                    <div className="flex gap-0.5">
                      {Array.from(
                        { length: totalPages },
                        (_, i) => i + 1
                      ).map((pageNum) => {
                        if (
                          totalPages > 5 &&
                          pageNum > 3 &&
                          pageNum < totalPages
                        ) {
                          if (pageNum === 4)
                            return (
                              <span
                                key="dots"
                                className="w-7 sm:w-8 text-center text-xs text-slate-400 leading-8"
                              >
                                …
                              </span>
                            );
                          return null;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum
                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(p + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-slate-500 dark:text-slate-400"
                    >
                      <ChevronDown size={15} className="-rotate-90" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer count for grid */}
          {viewMode === "grid" && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-transparent">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Showing {filtered.length} of {facilities.length} reservations
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}