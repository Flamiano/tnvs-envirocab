// app/dashboard/RegisteredUsers.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search, UserCheck, UserX, ShieldCheck, MoreVertical,
  ChevronLeft, ChevronRight, UserMinus, Ban, Trash2,
  ShieldOff, X, AlertTriangle, CheckCircle2,
  Loader2, Users, RefreshCw, UserPlus, Mail, User,
  Eye, EyeOff, Lock,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import {
  RegisteredUser, BanDuration,
  BAN_DURATION_OPTIONS,
  fetchRegisteredUsers, createUser,
  banUser, unbanUser, deleteUser,
  isCurrentlyBanned, banExpiryLabel,
  getInitials, getAvatarColor,
  PW_RULES, passwordScore, SCORE_META,
} from "@/app/utils/registeredUsers";

// ─── Email Masker ─────────────────────────────────────────────────────────────
// jo******ab@gmail.com  — shows first 2 + last 2 chars of local part

function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const at = email.indexOf("@");
  if (at === -1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length <= 4) {
    // very short local: show first + stars + last (or just first+last)
    const masked =
      local[0] +
      "*".repeat(Math.max(1, local.length - 2)) +
      (local.length > 1 ? local[local.length - 1] : "");
    return `${masked}@${domain}`;
  }
  const start = local.slice(0, 2);
  const end = local.slice(-2);
  const stars = "*".repeat(Math.min(6, local.length - 4));
  return `${start}${stars}${end}@${domain}`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; message: string; type: "success" | "error"; }

function Toast({ toasts, remove }: { toasts: ToastMsg[]; remove: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold backdrop-blur-sm border animate-in slide-in-from-bottom-3 ${t.type === "success" ? "bg-emerald-950/90 border-emerald-800/60 text-emerald-100" : "bg-rose-950/90 border-rose-800/60 text-rose-100"}`}>
          {t.type === "success" ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => remove(t.id)} className="opacity-50 hover:opacity-100 shrink-0"><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (user: RegisteredUser) => void;
  addToast: (msg: string, type: "success" | "error") => void;
}

function AddUserModal({ open, onClose, onCreated }: AddUserModalProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "success">("form");
  const [doneEmail, setDoneEmail] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setEmail(""); setFullName(""); setPassword(""); setConfirmPw("");
      setShowPw(false); setShowConfirmPw(false); setFieldError(null);
      setStep("form"); setLoading(false);
      setTimeout(() => emailRef.current?.focus(), 120);
    }
  }, [open]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const score = passwordScore(password);
  const scoreMeta = SCORE_META[score];
  const pwValid = score === 4;
  const pwMatch = confirmPw.length > 0 && password === confirmPw;
  const pwMismatch = confirmPw.length > 0 && password !== confirmPw;

  const validate = (): string | null => {
    if (!emailValid) return "Please enter a valid email address.";
    if (!password) return "Password is required.";
    if (!pwValid) return "Password doesn't meet all requirements.";
    if (!confirmPw) return "Please confirm your password.";
    if (password !== confirmPw) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setFieldError(err); return; }
    setFieldError(null);
    setLoading(true);
    const result = await createUser({
      email: email.trim(),
      full_name: fullName.trim(),
      mode: "password",
      password,
    });
    setLoading(false);
    if (!result.success) { setFieldError(result.error ?? "Something went wrong."); return; }
    if (result.user) onCreated(result.user);
    setDoneEmail(email.trim());
    setStep("success");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 lg:pl-72">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in duration-200 max-h-[90vh] flex flex-col">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 flex items-center justify-center shrink-0">
                <UserPlus size={16} className="text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Create New Account</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Register a new platform user</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={16} /></button>
          </div>

          {step === "form" ? (
            <div className="px-5 py-5 overflow-y-auto flex-1 space-y-4">

              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input ref={emailRef} type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="user@example.com"
                    className={`w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${fieldError && !emailValid ? "border-rose-400 dark:border-rose-500 focus:ring-2 focus:ring-rose-500/20" : emailValid ? "border-emerald-400 dark:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20" : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"}`} />
                </div>
                {email && (
                  <p className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${emailValid ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                    {emailValid ? <><CheckCircle2 size={10} /> Format OK</> : "Enter a valid email format"}
                  </p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                  Full Name <span className="text-slate-400 dark:text-slate-600 font-normal normal-case">(optional)</span>
                </label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()} placeholder="Juan Dela Cruz"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none transition-all" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input type={showPw ? "text" : "password"} value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="Create a strong password"
                    className={`w-full pl-8 pr-10 py-2 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none transition-all ${password.length > 0 && !pwValid ? "border-amber-400 dark:border-amber-500/60" : password.length > 0 && pwValid ? "border-emerald-400 dark:border-emerald-500/60" : "border-slate-200 dark:border-slate-700"}`} />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {/* Strength meter */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-1.5 items-center">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? scoreMeta.bar : "bg-slate-200 dark:bg-slate-700"}`} />
                      ))}
                      {scoreMeta.label && <span className={`text-[11px] font-bold ml-1 ${scoreMeta.text} shrink-0`}>{scoreMeta.label}</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {PW_RULES.map(r => {
                        const ok = r.test(password);
                        return (
                          <div key={r.id} className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${ok ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-slate-600"}`}>
                              {ok && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </div>
                            {r.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input type={showConfirmPw ? "text" : "password"} value={confirmPw}
                    onChange={(e) => { setConfirmPw(e.target.value); setFieldError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="Re-enter your password"
                    className={`w-full pl-8 pr-10 py-2 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 outline-none transition-all ${pwMismatch ? "border-rose-400 dark:border-rose-500 focus:ring-rose-500/20" : pwMatch ? "border-emerald-400 dark:border-emerald-500/60 focus:ring-emerald-500/20" : "border-slate-200 dark:border-slate-700 focus:ring-sky-500/20 focus:border-sky-400"}`} />
                  <button type="button" onClick={() => setShowConfirmPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {confirmPw.length > 0 && (
                  <p className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${pwMatch ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                    {pwMatch
                      ? <><CheckCircle2 size={10} /> Passwords match</>
                      : <><AlertTriangle size={10} /> Passwords do not match</>}
                  </p>
                )}
              </div>

              {/* Info banner */}
              <div className="flex gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                <CheckCircle2 size={13} className="text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed font-medium">
                  Account will be created and immediately <span className="font-bold">verified</span> — no email confirmation required.
                </p>
              </div>

              {fieldError && (
                <div className="flex gap-2.5 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl animate-in slide-in-from-top-1 duration-150">
                  <AlertTriangle size={13} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed font-semibold">{fieldError}</p>
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button onClick={handleSubmit} disabled={loading || !email.trim() || !pwValid || !pwMatch}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold text-white transition-colors shadow-sm shadow-sky-500/20">
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <><UserPlus size={14} /> Create Account</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-10 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center border bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle2 size={26} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">Account Created!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Account for <span className="font-semibold text-slate-700 dark:text-slate-200">{maskEmail(doneEmail)}</span> was created and is immediately verified.
                </p>
              </div>
              <button onClick={onClose} className="mt-1 px-10 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Portal Action Menu ───────────────────────────────────────────────────────

function ActionMenu({ user, onAction }: {
  user: RegisteredUser;
  onAction: (type: "ban" | "unban" | "delete", user: RegisteredUser, duration?: BanDuration) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showBanSub, setShowBanSub] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const banned = isCurrentlyBanned(user);

  const MENU_W = 220;

  const calcPosition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const approxH = showBanSub ? 290 : 160;
    const spaceBelow = vh - r.bottom - 8;
    const top = spaceBelow >= approxH ? r.bottom + 6 : r.top - approxH - 6;
    let left = r.right - MENU_W;
    if (left < 8) left = 8;
    if (left + MENU_W > vw - 8) left = vw - MENU_W - 8;
    setMenuStyle({ position: "fixed", top, left, width: MENU_W, zIndex: 9999 });
  }, [showBanSub]);

  const handleToggle = () => {
    if (!open) { calcPosition(); setShowBanSub(false); }
    setOpen(p => !p);
  };

  useEffect(() => { if (open) calcPosition(); }, [showBanSub, open, calcPosition]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false); setShowBanSub(false);
    };
    const dismiss = () => { setOpen(false); setShowBanSub(false); };
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  const menu = (
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl shadow-black/15 dark:shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right"
    >
      <div className="px-3 pt-3 pb-1.5">
        <p className="text-[10px] font-bold text-rose-400/80 dark:text-rose-500/60 uppercase tracking-widest">Danger Zone</p>
      </div>

      {banned ? (
        <button
          onClick={() => { onAction("unban", user); setOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
        >
          <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 flex items-center justify-center shrink-0">
            <ShieldOff size={14} className="text-amber-600 dark:text-amber-400" />
          </span>
          <span className="leading-tight">Lift Ban</span>
        </button>
      ) : (
        <>
          <button
            onClick={() => setShowBanSub(p => !p)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
          >
            <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center justify-center shrink-0">
              <Ban size={14} className="text-rose-600 dark:text-rose-400" />
            </span>
            <span className="flex-1 text-left leading-tight">Ban User</span>
            <span className={`text-xs opacity-40 transition-transform duration-200 ${showBanSub ? "-rotate-180" : ""}`}>▾</span>
          </button>
          {showBanSub && (
            <div className="bg-rose-50/60 dark:bg-rose-500/5 border-y border-rose-100 dark:border-rose-500/10">
              {BAN_DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onAction("ban", user, opt.value); setOpen(false); setShowBanSub(false); }}
                  className="w-full text-left pl-14 pr-4 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-500/15 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <button
        onClick={() => { onAction("delete", user); setOpen(false); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 mb-1 text-sm font-medium text-rose-700 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
      >
        <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center justify-center shrink-0">
          <Trash2 size={14} className="text-rose-700 dark:text-rose-500" />
        </span>
        <span className="leading-tight">Delete User</span>
      </button>
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        aria-label="User actions"
        className={`p-2 rounded-xl border transition-all duration-150 ${open
          ? "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100"
          : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:border-slate-200 dark:hover:border-slate-600"
          }`}
      >
        <MoreVertical size={17} />
      </button>
      {open && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmState {
  open: boolean; title: string; description: string;
  confirmLabel: string; danger: boolean; onConfirm: () => void;
}

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 lg:pl-72">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 p-6 max-w-sm w-full animate-in zoom-in-95 fade-in duration-150">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${state.danger ? "bg-rose-100 dark:bg-rose-500/15" : "bg-sky-100 dark:bg-sky-500/15"}`}>
          <AlertTriangle className={state.danger ? "text-rose-600 dark:text-rose-400" : "text-sky-600 dark:text-sky-400"} size={18} />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{state.title}</h3>
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

// ─── Main Component ───────────────────────────────────────────────────────────

const FILTERS = [
  { value: "all", label: "All" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
  { value: "banned", label: "Banned" },
];

export default function RegisteredUsers() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false, title: "", description: "", confirmLabel: "", danger: false, onConfirm: () => { },
  });

  const rowsPerPage = 10;
  const toastId = useRef(0);

  const addToast = (message: string, type: "success" | "error") => {
    const id = ++toastId.current;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
  };
  const removeToast = (id: number) => setToasts(p => p.filter(t => t.id !== id));

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchRegisteredUsers();
      setUsers(data);
    } catch (e: any) {
      addToast(e.message ?? "Failed to load users", "error");
    } finally { setLoading(false); }
  };

  const handleUserCreated = (user: RegisteredUser) => {
    setUsers(p => [user, ...p]);
    // Toast uses masked email for privacy
    addToast(`Account for ${maskEmail(user.email)} created successfully.`, "success");
  };

  const handleAction = (
    type: "ban" | "unban" | "delete",
    user: RegisteredUser,
    duration?: BanDuration,
  ) => {
    const configs = {
      ban: {
        title: "Ban User",
        // Confirm dialog: show masked email, full name unmasked
        description: `Ban ${user.full_name || maskEmail(user.email)}? They will lose access to the platform.`,
        confirmLabel: "Ban User",
        danger: true,
        exec: () => banUser(user.id, duration),
        success: `User banned${duration === "876000h" ? " permanently" : ""}.`,
      },
      unban: {
        title: "Lift Ban",
        description: `Restore platform access for ${user.full_name || maskEmail(user.email)}?`,
        confirmLabel: "Lift Ban",
        danger: false,
        exec: () => unbanUser(user.id),
        success: "User ban lifted.",
      },
      delete: {
        title: "Delete User",
        // Confirm delete: show masked email only
        description: `Permanently delete ${maskEmail(user.email)}? This cannot be undone.`,
        confirmLabel: "Delete Permanently",
        danger: true,
        exec: () => deleteUser(user.id),
        success: "User deleted.",
      },
    };
    const cfg = configs[type];
    setConfirm({
      open: true,
      title: cfg.title,
      description: cfg.description,
      confirmLabel: cfg.confirmLabel,
      danger: cfg.danger,
      onConfirm: async () => {
        setActionLoading(user.id);
        const result = await cfg.exec();
        setActionLoading(null);
        if (result.success) {
          addToast(cfg.success, "success");
          if (type === "delete") {
            setUsers(p => p.filter(u => u.id !== user.id));
          } else if (type === "ban" && duration) {
            setUsers(p => p.map(u => u.id === user.id
              ? { ...u, banned_until: duration === "876000h" ? "2124-01-01T00:00:00Z" : new Date(Date.now() + parseInt(duration) * 3_600_000).toISOString() }
              : u));
          } else if (type === "unban") {
            setUsers(p => p.map(u => u.id === user.id ? { ...u, banned_until: null } : u));
          }
        } else {
          addToast(result.error ?? "Action failed", "error");
        }
      },
    });
  };

  // Search filter uses RAW email so users can still find by full email
  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const match = (u.email ?? "").toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q);
    if (filter === "verified") return match && !!u.email_confirmed_at;
    if (filter === "unverified") return match && !u.email_confirmed_at;
    if (filter === "banned") return match && isCurrentlyBanned(u);
    return match;
  });

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredUsers.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);

  useEffect(() => { setCurrentPage(1); }, [search, filter]);

  const verifiedCount = users.filter(u => !!u.email_confirmed_at).length;
  const bannedCount = users.filter(isCurrentlyBanned).length;
  const trustPct = users.length > 0 ? Math.round((verifiedCount / users.length) * 100) : 0;

  const pieData = [
    { name: "Verified", value: verifiedCount, color: "#10b981" },
    { name: "Not Verified", value: users.length - verifiedCount, color: "#f43f5e" },
  ];

  return (
    <>
      <Toast toasts={toasts} remove={removeToast} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(p => ({ ...p, open: false }))} />
      <AddUserModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onCreated={handleUserCreated} addToast={addToast} />

      <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Registered Users</h1>
              <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Manage and moderate platform members.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={loadUsers} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button onClick={() => setAddModalOpen(true)} className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-bold uppercase tracking-wide rounded-xl transition-all shadow-sm shadow-sky-500/20">
              <UserPlus size={14} /> Add User
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="col-span-2 lg:col-span-1 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Verification</p>
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={32} outerRadius={46} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "none", backgroundColor: "#0f172a", color: "#fff", fontSize: "12px", fontWeight: "600" }} itemStyle={{ color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-3 mt-1 flex-wrap">
              {pieData.map(item => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{item.name} <span className="font-black text-slate-700 dark:text-slate-200">{item.value}</span></span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden">
            <Users className="absolute -right-3 -bottom-3 w-16 sm:w-20 h-16 sm:h-20 opacity-5" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Total Users</p>
            <p className="text-3xl sm:text-4xl font-black tabular-nums">{users.length}</p>
          </div>

          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">Trust Score</p>
                <p className="text-3xl sm:text-4xl font-black tabular-nums text-slate-900 dark:text-white">{trustPct}%</p>
              </div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20 shrink-0">
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-700" style={{ width: `${trustPct}%` }} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/60 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">Banned</p>
                <p className="text-3xl sm:text-4xl font-black tabular-nums text-rose-600 dark:text-rose-400">{bannedCount}</p>
              </div>
              <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20 shrink-0">
                <Ban size={16} className="text-rose-600 dark:text-rose-400" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center p-3 sm:p-4 border-b border-slate-100 dark:border-slate-700/60">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              <input type="text" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none transition-all" />
            </div>
            <div className="flex gap-1 shrink-0 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg overflow-x-auto">
              {FILTERS.map(f => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all duration-150 ${filter === f.value ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-b-2xl">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/20">
                  {["User", "Status", "Last Sign In", "Joined", "Actions"].map((h, i) => (
                    <th key={h} className={`px-4 sm:px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500
                      ${i === 0 || i === 1 ? "text-left" : ""}
                      ${i === 2 ? "text-left hidden md:table-cell" : ""}
                      ${i === 3 ? "text-left hidden lg:table-cell" : ""}
                      ${i === 4 ? "text-right" : ""}
                    `}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
                {loading ? (
                  <tr><td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-slate-300 dark:text-slate-600" size={28} />
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Loading…</span>
                    </div>
                  </td></tr>
                ) : currentRows.length === 0 ? (
                  <tr><td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <UserMinus size={22} className="text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No users match your filters.</p>
                      <button onClick={() => { setSearch(""); setFilter("all"); }} className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">Clear filters</button>
                    </div>
                  </td></tr>
                ) : currentRows.map(user => {
                  const banned = isCurrentlyBanned(user);
                  const isLoad = actionLoading === user.id;
                  return (
                    <tr key={user.id} className={`transition-colors duration-100 ${banned ? "bg-rose-50/30 dark:bg-rose-900/5" : "hover:bg-slate-50/80 dark:hover:bg-slate-700/20"}`}>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(user.id)} flex items-center justify-center shrink-0 shadow-sm`}>
                            <span className="text-[11px] sm:text-xs font-black text-white tracking-tight">{getInitials(user.full_name, user.email)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                              {user.full_name || "Anonymous User"}
                            </p>
                            {/* ← MASKED email displayed here */}
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5 font-mono">
                              {maskEmail(user.email)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {user.email_confirmed_at ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 px-2 py-0.5 rounded-md whitespace-nowrap">
                              <UserCheck size={10} strokeWidth={2.5} /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-md whitespace-nowrap">
                              <UserX size={10} strokeWidth={2.5} /> Pending
                            </span>
                          )}
                          {banned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/20 px-2 py-0.5 rounded-md whitespace-nowrap">
                              <Ban size={10} strokeWidth={2.5} /> Banned · {banExpiryLabel(user)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 hidden md:table-cell">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : <span className="text-slate-300 dark:text-slate-600 text-xs italic">Never</span>}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 hidden lg:table-cell">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right">
                        {isLoad
                          ? <Loader2 size={15} className="animate-spin text-slate-400 ml-auto" />
                          : <ActionMenu user={user} onAction={handleAction} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 0 && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-700/60">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                {indexOfFirstRow + 1}–{Math.min(indexOfLastRow, filteredUsers.length)} of {filteredUsers.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-slate-500 dark:text-slate-400"><ChevronLeft size={15} /></button>
                <div className="flex gap-0.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                    if (totalPages > 5 && pageNum > 3 && pageNum < totalPages) {
                      if (pageNum === 4) return <span key="dots" className="w-7 text-center text-xs text-slate-400 leading-8">…</span>;
                      return null;
                    }
                    return (
                      <button key={pageNum} onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-slate-500 dark:text-slate-400"><ChevronRight size={15} /></button>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}