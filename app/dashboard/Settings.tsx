"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/app/utils/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
    User, Lock, Shield, Eye, EyeOff, Check, X,
    Loader2, AlertTriangle, CheckCircle2, KeyRound,
    RefreshCw, Mail, BadgeCheck, Save, ShieldCheck,
    ChevronRight, Pencil, Clock,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminAccount {
    id: string;
    email: string;
    display_name: string | null;
    role: string | null;
    updated_at: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

/** Password strength 0–4 */
function passwordStrength(pw: string): { score: number; label: string; color: string } {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const clamp = Math.min(score, 4);
    const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
    const colors = ["bg-rose-500", "bg-orange-500", "bg-amber-400", "bg-sky-500", "bg-emerald-500"];
    return { score: clamp, label: labels[clamp], color: colors[clamp] };
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputCls = "w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed";

function SectionCard({ title, subtitle, icon: Icon, iconColor, children }: {
    title: string; subtitle: string; icon: React.ElementType; iconColor: string; children: React.ReactNode;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm"
        >
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColor}`}>
                    <Icon size={16} className="text-white" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white">{title}</h2>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{subtitle}</p>
                </div>
            </div>
            <div className="px-6 py-5">{children}</div>
        </motion.div>
    );
}

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
    return (
        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
            {label}
            {optional && <span className="ml-1 normal-case font-normal tracking-normal text-slate-300 dark:text-slate-600">(optional)</span>}
        </label>
    );
}

function AlertBanner({ type, msg }: { type: "error" | "success"; msg: string }) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold ${type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400"
                    }`}
            >
                {type === "success"
                    ? <CheckCircle2 size={15} className="shrink-0" />
                    : <AlertTriangle size={15} className="shrink-0" />}
                {msg}
            </motion.div>
        </AnimatePresence>
    );
}

// ─── Password field with show/hide ────────────────────────────────────────────

function PasswordInput({
    value, onChange, placeholder, disabled, id,
}: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; id?: string }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                id={id}
                type={show ? "text" : "password"}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={inputCls + " pr-11"}
            />
            <button
                type="button"
                onClick={() => setShow(p => !p)}
                disabled={disabled}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-40"
            >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
        </div>
    );
}

// ─── Password strength bar ────────────────────────────────────────────────────

function StrengthBar({ password }: { password: string }) {
    if (!password) return null;
    const { score, label, color } = passwordStrength(password);
    return (
        <div className="space-y-1.5 mt-2">
            <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i <= score ? color : "bg-slate-100 dark:bg-slate-700"}`} />
                ))}
            </div>
            <p className={`text-[10px] font-bold ${score <= 1 ? "text-rose-500" : score === 2 ? "text-amber-500" : score === 3 ? "text-sky-500" : "text-emerald-500"
                }`}>{label}</p>
        </div>
    );
}

// ─── Profile / Display Name Section ──────────────────────────────────────────

function ProfileSection({ account, onRefresh }: { account: AdminAccount; onRefresh: () => void }) {
    const [displayName, setDisplayName] = useState(account.display_name ?? "");
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ type: "error" | "success"; msg: string } | null>(null);
    const [edited, setEdited] = useState(false);

    useEffect(() => {
        setDisplayName(account.display_name ?? "");
        setEdited(false);
    }, [account]);

    const handleChange = (v: string) => {
        setDisplayName(v);
        setEdited(v !== (account.display_name ?? ""));
        setStatus(null);
    };

    const handleSave = async () => {
        if (!edited) return;
        setSaving(true);
        setStatus(null);
        try {
            const sb = createClient();
            const { error } = await sb
                .from("admin_accounts")
                .update({ display_name: displayName.trim() || null, updated_at: new Date().toISOString() })
                .eq("id", account.id);
            if (error) throw error;
            setStatus({ type: "success", msg: "Display name updated successfully." });
            setEdited(false);
            onRefresh();
        } catch (err: any) {
            setStatus({ type: "error", msg: err?.message ?? "Failed to update." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <SectionCard
            title="Profile Details"
            subtitle="Manage your display name and account info"
            icon={User}
            iconColor="bg-gradient-to-br from-sky-500 to-sky-700"
        >
            <div className="space-y-4">
                {/* Avatar + info */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/50">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-black text-xl shadow-md shrink-0">
                        {(account.display_name ?? account.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {account.display_name ?? "—"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Mail size={10} className="text-slate-400" />
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{account.email}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30">
                                <BadgeCheck size={8} /> {account.role ?? "admin"}
                            </span>
                            {account.updated_at && (
                                <span className="flex items-center gap-1 text-[9px] text-slate-400">
                                    <Clock size={8} /> Updated {formatDate(account.updated_at)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Display name field */}
                <div>
                    <FieldLabel label="Display Name" optional />
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={displayName}
                            onChange={e => handleChange(e.target.value)}
                            placeholder="e.g. Admin TNVS"
                            disabled={saving}
                            className={inputCls + " flex-1"}
                        />
                        <button
                            onClick={handleSave}
                            disabled={!edited || saving}
                            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition-all shadow-sm whitespace-nowrap"
                        >
                            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                            Save
                        </button>
                    </div>
                </div>

                {/* Email (read-only) */}
                <div>
                    <FieldLabel label="Email Address" />
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <Mail size={14} className="text-slate-400 shrink-0" />
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex-1 truncate">{account.email}</p>
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                            Read-only
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 ml-1">
                        Email is managed by Anthropic and cannot be changed here.
                    </p>
                </div>

                {status && <AlertBanner type={status.type} msg={status.msg} />}
            </div>
        </SectionCard>
    );
}

// ─── Change Password Section ──────────────────────────────────────────────────

function PasswordSection() {
    const [current, setCurrent] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirm, setConfirm] = useState("");
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ type: "error" | "success"; msg: string } | null>(null);

    const mismatch = confirm.length > 0 && newPw !== confirm;
    const { score } = passwordStrength(newPw);
    const canSubmit = current.length > 0 && newPw.length >= 8 && newPw === confirm && score >= 2;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSaving(true);
        setStatus(null);
        try {
            const sb = createClient();

            // Re-authenticate with current password first
            const { data: userData } = await sb.auth.getUser();
            const email = userData.user?.email;
            if (!email) throw new Error("Could not determine your email.");

            const { error: signInErr } = await sb.auth.signInWithPassword({
                email,
                password: current,
            });
            if (signInErr) throw new Error("Current password is incorrect.");

            // Update password
            const { error: updateErr } = await sb.auth.updateUser({ password: newPw });
            if (updateErr) throw updateErr;

            // Update admin_accounts updated_at
            if (userData.user?.id) {
                await sb.from("admin_accounts")
                    .update({ updated_at: new Date().toISOString() })
                    .eq("id", userData.user.id);
            }

            setStatus({ type: "success", msg: "Password updated successfully. Use your new password next login." });
            setCurrent(""); setNewPw(""); setConfirm("");
        } catch (err: any) {
            setStatus({ type: "error", msg: err?.message ?? "Failed to update password." });
        } finally {
            setSaving(false);
        }
    };

    const requirements = [
        { label: "At least 8 characters", met: newPw.length >= 8 },
        { label: "Uppercase & lowercase letters", met: /[A-Z]/.test(newPw) && /[a-z]/.test(newPw) },
        { label: "At least one number", met: /[0-9]/.test(newPw) },
        { label: "Passwords match", met: newPw.length > 0 && newPw === confirm },
    ];

    return (
        <SectionCard
            title="Change Password"
            subtitle="Use a strong, unique password for your account"
            icon={KeyRound}
            iconColor="bg-gradient-to-br from-violet-500 to-violet-700"
        >
            <div className="space-y-4">
                {/* Current password */}
                <div>
                    <FieldLabel label="Current Password" />
                    <PasswordInput
                        id="current-pw"
                        value={current}
                        onChange={setCurrent}
                        placeholder="Enter your current password"
                        disabled={saving}
                    />
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700/60" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">New Password</span>
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700/60" />
                </div>

                {/* New password */}
                <div>
                    <FieldLabel label="New Password" />
                    <PasswordInput
                        id="new-pw"
                        value={newPw}
                        onChange={setNewPw}
                        placeholder="Create a strong new password"
                        disabled={saving}
                    />
                    <StrengthBar password={newPw} />
                </div>

                {/* Confirm */}
                <div>
                    <FieldLabel label="Confirm New Password" />
                    <PasswordInput
                        id="confirm-pw"
                        value={confirm}
                        onChange={setConfirm}
                        placeholder="Re-enter new password"
                        disabled={saving}
                    />
                    {mismatch && (
                        <p className="text-[10px] font-bold text-rose-500 mt-1.5 flex items-center gap-1">
                            <X size={10} /> Passwords do not match
                        </p>
                    )}
                </div>

                {/* Requirements checklist */}
                {newPw.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        {requirements.map((r) => (
                            <div key={r.label} className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${r.met ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-slate-100 dark:bg-slate-700"}`}>
                                    {r.met
                                        ? <Check size={9} className="text-emerald-600 dark:text-emerald-400" />
                                        : <X size={9} className="text-slate-300 dark:text-slate-600" />}
                                </div>
                                <span className={`text-[10px] font-semibold ${r.met ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                                    {r.label}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {status && <AlertBanner type={status.type} msg={status.msg} />}

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || saving}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-800 hover:from-violet-500 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black transition-all shadow-sm"
                >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                    {saving ? "Updating Password…" : "Update Password"}
                </button>
            </div>
        </SectionCard>
    );
}

// ─── Security Info Section ────────────────────────────────────────────────────

function SecuritySection({ account }: { account: AdminAccount }) {
    const tips = [
        "Never share your password with anyone, including other admins.",
        "Use a password manager to keep your credentials safe.",
        "Log out when using shared or public devices.",
        "Report any suspicious activity to your system administrator.",
    ];

    return (
        <SectionCard
            title="Security Information"
            subtitle="Best practices for keeping your account secure"
            icon={Shield}
            iconColor="bg-gradient-to-br from-emerald-500 to-emerald-700"
        >
            <div className="space-y-3">
                {/* Account status */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                    <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">Account Active</span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                        {account.role?.toUpperCase() ?? "ADMIN"}
                    </span>
                </div>

                {/* Tips */}
                <div className="space-y-2">
                    {tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <ChevronRight size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{tip}</p>
                        </div>
                    ))}
                </div>

                {/* Authorized emails note */}
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1">Authorized Account</p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-500 leading-relaxed">
                        This account is part of a restricted set of authorized admin emails. Contact your system administrator to manage access.
                    </p>
                </div>
            </div>
        </SectionCard>
    );
}

// ─── Main Settings Component ──────────────────────────────────────────────────

export default function Settings() {
    const [account, setAccount] = useState<AdminAccount | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const sb = createClient();
            const { data: { user } } = await sb.auth.getUser();
            if (!user) throw new Error("Not authenticated.");

            const { data, error: dbErr } = await sb
                .from("admin_accounts")
                .select("id, email, display_name, role, updated_at")
                .eq("id", user.id)
                .single();

            if (dbErr) throw dbErr;
            setAccount(data as AdminAccount);
        } catch (err: any) {
            setError(err?.message ?? "Failed to load account.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
                <Loader2 className="w-8 h-8 text-slate-300 dark:text-slate-600 animate-spin" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading settings…</p>
            </div>
        );
    }

    if (error || !account) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-rose-500" />
                </div>
                <p className="text-sm font-semibold text-rose-600">{error ?? "Account not found."}</p>
                <button onClick={load} className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1">
                    <RefreshCw size={11} /> Try again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500 max-w-2xl">

            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center shadow-sm">
                            <Pencil size={14} className="text-white" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            Account Settings
                        </h1>
                    </div>
                    <p className="text-sm text-slate-400 dark:text-slate-500 ml-10">
                        Manage your profile and security preferences
                    </p>
                </div>
                <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-xl transition-all">
                    <RefreshCw size={12} /> Refresh
                </button>
            </div>

            {/* Sections */}
            <ProfileSection account={account} onRefresh={load} />
            <PasswordSection />
            <SecuritySection account={account} />
        </div>
    );
}