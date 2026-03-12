"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/app/utils/supabase";
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Mail,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X,
  Trash2,
  Edit3,
  Users,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Types

interface AdminAccount {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  updated_at: string;
}

// Utils

function getInitials(name: string | null, email: string) {
  if (name) {
    const p = name.trim().split(" ");
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-700",
];
function getAvatarColor(id: string) {
  return AVATAR_COLORS[id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
}

function maskEmail(email: string) {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(local.length - 2, 6))}${local.slice(-2)}@${domain}`;
}

function roleMeta(role: string): { label: string; bg: string; text: string; border: string; icon: React.ReactNode } {
  switch (role) {
    case "admin":
      return {
        label: "Admin",
        bg: "bg-sky-50 dark:bg-sky-500/10",
        text: "text-sky-700 dark:text-sky-400",
        border: "border-sky-200 dark:border-sky-500/20",
        icon: <Shield size={10} strokeWidth={2.5} />,
      };
    default:
      return {
        label: role.charAt(0).toUpperCase() + role.slice(1),
        bg: "bg-slate-100 dark:bg-slate-700",
        text: "text-slate-600 dark:text-slate-300",
        border: "border-slate-200 dark:border-slate-600",
        icon: <Shield size={10} strokeWidth={2.5} />,
      };
  }
}

const ROLE_COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1"];
function getRoleColor(role: string) {
  return ROLE_COLORS[role.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % ROLE_COLORS.length];
}

// Password strength

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
  return { score, label: labels[score] || "", color: colors[score] || "" };
}

// Toast

interface ToastMsg { id: number; message: string; type: "success" | "error"; }

function Toast({ toasts, remove }: { toasts: ToastMsg[]; remove: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold backdrop-blur-sm border animate-in slide-in-from-bottom-3 ${t.type === "success" ? "bg-emerald-950/90 border-emerald-800/60 text-emerald-100" : "bg-rose-950/90 border-rose-800/60 text-rose-100"}`}>
          {t.type === "success"
            ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
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
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: () => void;
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
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { state.onConfirm(); onClose(); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${state.danger ? "bg-rose-600 hover:bg-rose-700" : "bg-sky-600 hover:bg-sky-700"}`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Add / Edit Admin Modal

interface AdminModalProps {
  open: boolean;
  mode: "add" | "edit";
  existing?: AdminAccount;
  onClose: () => void;
  onSaved: (admin: AdminAccount) => void;
  addToast: (msg: string, type: "success" | "error") => void;
}

function AdminModal({ open, mode, existing, onClose, onSaved, addToast }: AdminModalProps) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("admin");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const strength = getPasswordStrength(password);

  const checks = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter (A–Z)", met: /[A-Z]/.test(password) },
    { label: "One number (0–9)", met: /[0-9]/.test(password) },
    { label: "One special character (!@#…)", met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  useEffect(() => {
    if (open) {
      if (mode === "edit" && existing) {
        setEmail(existing.email);
        setDisplayName(existing.display_name ?? "");
        setRole(existing.role || "admin");
      } else {
        setEmail(""); setDisplayName(""); setRole("admin");
        setPassword(""); setConfirmPassword("");
        setShowPassword(false); setShowConfirmPassword(false);
      }
      setError(null); setLoading(false);
      setTimeout(() => emailRef.current?.focus(), 120);
    }
  }, [open, mode, existing]);

  const effectiveRole = role.trim() || "admin";
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSave = async () => {
    if (!emailValid) { setError("Please enter a valid email address."); return; }
    if (mode === "add") {
      if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    }

    setError(null);
    setLoading(true);

    if (mode === "add") {
      // Step 1: Create auth user — emailRedirectTo suppressed so no confirmation email is sent.
      // Auto-confirm is handled by Supabase project settings (disable email confirmation).
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: undefined,
          data: {
            display_name: displayName.trim() || null,
            role: effectiveRole,
          },
        },
      });

      if (signUpError) {
        setLoading(false);
        setError(signUpError.message);
        return;
      }

      const userId = signUpData.user?.id;
      if (!userId) {
        setLoading(false);
        setError("Failed to retrieve user ID after signup. Please try again.");
        return;
      }

      // Step 2: Insert into admin_accounts (DB constraint enforces allowed emails)
      const { data, error: insertError } = await supabase
        .from("admin_accounts")
        .insert({
          id: userId,
          email: email.trim(),
          display_name: displayName.trim() || null,
          role: effectiveRole,
        })
        .select()
        .single();

      setLoading(false);

      if (insertError) {
        // Surface the DB constraint error clearly
        setError(insertError.message);
        return;
      }

      if (data) {
        onSaved(data as AdminAccount);
        addToast(`Admin account for ${email.trim()} created successfully.`, "success");
        onClose();
      }
    } else if (mode === "edit" && existing) {
      const { data, error: err } = await supabase
        .from("admin_accounts")
        .update({ display_name: displayName.trim() || null, role: effectiveRole, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();

      setLoading(false);

      if (err) { setError(err.message); return; }
      if (data) {
        onSaved(data as AdminAccount);
        addToast("Admin account updated.", "success");
        onClose();
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 lg:pl-72">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden">

          {/* Modal header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 flex items-center justify-center shrink-0">
                {mode === "add" ? <UserPlus size={16} className="text-sky-600 dark:text-sky-400" /> : <Edit3 size={16} className="text-sky-600 dark:text-sky-400" />}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  {mode === "add" ? "Add Admin Account" : "Edit Admin Account"}
                </h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {mode === "add" ? "Register a new administrator" : "Update account details"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">

            {/* Email — add mode only */}
            {mode === "add" && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    placeholder="admin@example.com"
                    className={`w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${emailValid ? "border-emerald-400 dark:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20" : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"}`}
                  />
                </div>
              </div>
            )}

            {/* Display Name + Role — side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                  Display Name
                </label>
                <div className="relative">
                  <Shield size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    ref={mode === "edit" ? emailRef : undefined}
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    placeholder="e.g. HR Admin"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                  Role
                </label>
                <div className="relative">
                  <Shield size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => { setRole(e.target.value); setError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    placeholder="admin"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Password fields — add mode only */}
            {mode === "add" && (
              <>
                {/* Password */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && handleSave()}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>

                  {/* Strength bar + checks */}
                  {password.length > 0 && (
                    <div className="mt-1.5 space-y-1.5">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4].map((s) => (
                          <div
                            key={s}
                            className="h-1 flex-1 rounded-full transition-all duration-300"
                            style={{ backgroundColor: strength.score >= s ? strength.color : "#e2e8f0" }}
                          />
                        ))}
                        <span className="text-[10px] font-bold ml-1 shrink-0" style={{ color: strength.color }}>
                          {strength.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        {checks.map((c) => (
                          <div key={c.label} className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded-full flex items-center justify-center shrink-0 transition-colors ${c.met ? "bg-emerald-500" : "border border-slate-300 dark:border-slate-600"}`}>
                              {c.met && <CheckCircle2 size={8} className="text-white" strokeWidth={3} />}
                            </div>
                            <span className={`text-[10px] font-medium leading-tight ${c.met ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                              {c.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && handleSave()}
                      placeholder="Re-enter your password"
                      className={`w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${confirmPassword.length > 0
                          ? confirmPassword === password
                            ? "border-emerald-400 dark:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
                            : "border-rose-400 dark:border-rose-500/60 focus:ring-2 focus:ring-rose-500/20"
                          : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <p className={`text-[10px] mt-1 font-semibold flex items-center gap-1 ${confirmPassword === password ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                      {confirmPassword === password
                        ? <><CheckCircle2 size={9} strokeWidth={3} /> Passwords match.</>
                        : "Passwords do not match."}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Error banner */}
            {error && (
              <div className="flex gap-2 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl animate-in slide-in-from-top-1 duration-150">
                <AlertTriangle size={13} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed font-semibold">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2.5 pt-0.5">
              <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !email.trim() || (mode === "add" && (!password || !confirmPassword))}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold text-white transition-colors shadow-sm shadow-sky-500/20"
              >
                {loading
                  ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                  : mode === "add"
                    ? <><UserPlus size={13} /> Add Admin</>
                    : <><CheckCircle2 size={13} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Action Menu (portal-based, avoids scroll bar issues)

function ActionMenu({
  admin,
  onEdit,
  onDelete,
  onResetPassword,
}: {
  admin: AdminAccount;
  onEdit: () => void;
  onDelete: () => void;
  onResetPassword: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const MENU_W = 220;
  const MENU_H = 200;

  const calcPosition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - r.bottom - 8;
    const top = spaceBelow >= MENU_H ? r.bottom + 6 : r.top - MENU_H - 6;
    let left = r.right - MENU_W;
    if (left < 8) left = 8;
    if (left + MENU_W > vw - 8) left = vw - MENU_W - 8;
    setMenuStyle({ position: "fixed", top, left, width: MENU_W, zIndex: 9999 });
  }, []);

  const handleToggle = () => {
    if (!open) calcPosition();
    setOpen(p => !p);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const dismiss = () => setOpen(false);
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
      <div className="px-3 pt-3 pb-1">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Account</p>
      </div>

      <button
        onClick={() => { onEdit(); setOpen(false); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <span className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 flex items-center justify-center shrink-0">
          <Edit3 size={13} className="text-sky-600 dark:text-sky-400" />
        </span>
        <span className="leading-tight">Edit Details</span>
      </button>

      <div className="mx-3 my-1.5 h-px bg-slate-100 dark:bg-slate-800" />
      <div className="px-3 pb-1">
        <p className="text-[10px] font-bold text-rose-400/80 dark:text-rose-500/60 uppercase tracking-widest">Danger Zone</p>
      </div>

      <button
        onClick={() => { onDelete(); setOpen(false); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 mb-1 text-sm font-medium text-rose-700 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
      >
        <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center justify-center shrink-0">
          <Trash2 size={13} className="text-rose-700 dark:text-rose-500" />
        </span>
        <span className="leading-tight">Remove Admin</span>
      </button>
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        aria-label="Admin actions"
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

// Main Component

export default function Admins() {
  const supabase = createClient();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editTarget, setEditTarget] = useState<AdminAccount | undefined>();
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

  useEffect(() => { fetchAdmins(); }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_accounts")
      .select("*")
      .not("display_name", "eq", "TNVS Administrator")
      .order("display_name", { ascending: true });
    if (error) addToast(error.message, "error");
    else setAdmins(data as AdminAccount[]);
    setLoading(false);
  };

  const handleSaved = (admin: AdminAccount) => {
    setAdmins(p => {
      const idx = p.findIndex(a => a.id === admin.id);
      if (idx >= 0) { const n = [...p]; n[idx] = admin; return n; }
      return [admin, ...p];
    });
  };

  const openEdit = (admin: AdminAccount) => { setEditTarget(admin); setModalMode("edit"); setModalOpen(true); };
  const openAdd = () => { setEditTarget(undefined); setModalMode("add"); setModalOpen(true); };

  const handleDelete = (admin: AdminAccount) => {
    setConfirm({
      open: true,
      title: "Remove Admin Account",
      description: `Permanently remove ${admin.display_name || admin.email} from the admin list? This only removes them from admin_accounts — their auth account is untouched.`,
      confirmLabel: "Remove Admin",
      danger: true,
      onConfirm: async () => {
        setActionLoading(admin.id);
        const { error } = await supabase.from("admin_accounts").delete().eq("id", admin.id);
        setActionLoading(null);
        if (error) { addToast(error.message, "error"); return; }
        setAdmins(p => p.filter(a => a.id !== admin.id));
        addToast("Admin account removed.", "success");
      },
    });
  };

  const handleResetPassword = (admin: AdminAccount) => {
    setConfirm({
      open: true,
      title: "Send Password Reset",
      description: `A password reset email will be sent to ${admin.email}.`,
      confirmLabel: "Send Email",
      danger: false,
      onConfirm: async () => {
        setActionLoading(admin.id);
        const { error } = await supabase.auth.resetPasswordForEmail(admin.email);
        setActionLoading(null);
        if (error) addToast(error.message, "error");
        else addToast("Password reset email sent!", "success");
      },
    });
  };

  const filteredAdmins = admins.filter(a => {
    const q = search.toLowerCase();
    const match = (a.email ?? "").toLowerCase().includes(q) || (a.display_name ?? "").toLowerCase().includes(q);
    const roleMatch = roleFilter === "all" || a.role === roleFilter;
    return match && roleMatch;
  });

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredAdmins.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredAdmins.length / rowsPerPage);

  useEffect(() => { setCurrentPage(1); }, [search, roleFilter]);

  const adminCount = admins.filter(a => a.role === "admin").length;

  const roleCounts = admins.reduce<Record<string, number>>((acc, a) => {
    const r = a.role || "admin";
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(roleCounts)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: getRoleColor(name) }))
    .filter(d => d.value > 0);

  const uniqueRoles = Array.from(new Set(admins.map(a => a.role || "admin")));
  const FILTERS = [
    { value: "all", label: "All" },
    ...uniqueRoles.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) })),
  ];

  return (
    <>
      <Toast toasts={toasts} remove={(id) => setToasts(p => p.filter(t => t.id !== id))} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(p => ({ ...p, open: false }))} />
      <AdminModal
        open={modalOpen}
        mode={modalMode}
        existing={editTarget}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        addToast={addToast}
      />

      <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Admin Management</h1>
              <span className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/25 px-2.5 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Secure</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Lock size={12} className="text-emerald-500" />
              Administrative Control Panel
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={fetchAdmins} disabled={loading}
              className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button onClick={openAdd}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-bold uppercase tracking-wide rounded-xl transition-all shadow-sm shadow-sky-500/20">
              <UserPlus size={14} />
              <span>Add Admin</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="col-span-2 lg:col-span-1 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Role Breakdown</p>
            <div className="h-[100px] sm:h-[110px]">
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
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {item.name} <span className="font-black text-slate-700 dark:text-slate-200">{item.value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden">
            <Users className="absolute -right-3 -bottom-3 w-16 sm:w-20 h-16 sm:h-20 opacity-5" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Total Staff</p>
            <p className="text-3xl sm:text-4xl font-black tabular-nums">{admins.length}</p>
          </div>

          <div className="bg-white dark:bg-slate-800/60 border border-sky-200 dark:border-sky-500/20 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">Admins</p>
                <p className="text-3xl sm:text-4xl font-black tabular-nums text-sky-600 dark:text-sky-400">{adminCount}</p>
              </div>
              <div className="p-2 sm:p-2.5 bg-sky-50 dark:bg-sky-500/10 rounded-xl border border-sky-100 dark:border-sky-500/20 shrink-0">
                <ShieldCheck size={16} className="sm:w-[18px] sm:h-[18px] text-sky-600 dark:text-sky-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center p-3 sm:p-4 border-b border-slate-100 dark:border-slate-700/60">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              <input
                type="text" placeholder="Search name or email…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none transition-all"
              />
            </div>
            <div className="flex gap-1 shrink-0 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg overflow-x-auto no-scrollbar">
              {FILTERS.map(f => (
                <button key={f.value} onClick={() => setRoleFilter(f.value)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all duration-150 ${roleFilter === f.value ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/20">
                  <th className="px-4 sm:px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Administrator</th>
                  <th className="px-4 sm:px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Access Level</th>
                  <th className="px-4 sm:px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hidden md:table-cell">Last Updated</th>
                  <th className="px-4 sm:px-5 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-20 sm:py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-slate-300 dark:text-slate-600" size={28} />
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Loading…</span>
                      </div>
                    </td>
                  </tr>
                ) : currentRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 sm:py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <ShieldAlert size={22} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No admins match your filters.</p>
                        <button onClick={() => { setSearch(""); setRoleFilter("all"); }}
                          className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : currentRows.map(admin => {
                  const meta = roleMeta(admin.role);
                  const isLoad = actionLoading === admin.id;
                  return (
                    <tr key={admin.id} className="group transition-colors duration-100 hover:bg-slate-50/80 dark:hover:bg-slate-700/20">
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(admin.id)} flex items-center justify-center shrink-0 shadow-sm`}>
                            <span className="text-[11px] sm:text-xs font-black text-white tracking-tight">
                              {getInitials(admin.display_name, admin.email)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                              {admin.display_name || "Unnamed Admin"}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5 font-mono">
                              {maskEmail(admin.email)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border whitespace-nowrap ${meta.bg} ${meta.text} ${meta.border}`}>
                          {meta.icon}
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 hidden md:table-cell">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {new Date(admin.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right">
                        {isLoad
                          ? <Loader2 size={15} className="animate-spin text-slate-400 ml-auto" />
                          : <ActionMenu
                            admin={admin}
                            onEdit={() => openEdit(admin)}
                            onDelete={() => handleDelete(admin)}
                            onResetPassword={() => handleResetPassword(admin)}
                          />
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-transparent">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                {indexOfFirstRow + 1}–{Math.min(indexOfLastRow, filteredAdmins.length)} of {filteredAdmins.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-slate-500 dark:text-slate-400">
                  <ChevronLeft size={15} />
                </button>
                <div className="flex gap-0.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                    if (totalPages > 5 && pageNum > 3 && pageNum < totalPages) {
                      if (pageNum === 4) return <span key="dots" className="w-7 sm:w-8 text-center text-xs text-slate-400 leading-8">…</span>;
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
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-slate-500 dark:text-slate-400">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}