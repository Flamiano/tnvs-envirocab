"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Eye, EyeOff, Lock, Mail, RefreshCw, ArrowRight,
  Sun, Moon, AlertCircle, CheckCircle2, X, Loader2,
  Shield, Car, Users, CalendarCheck, Scale, Archive,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// Types
interface LiveStats {
  totalEmployees: number;
  activeEmployees: number;
  totalDrivers: number;
  positions: string[];
}

// Animated Counter
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(value / 28));
    const t = setInterval(() => {
      cur += step;
      if (cur >= value) { setDisplay(value); clearInterval(t); }
      else setDisplay(cur);
    }, 38);
    return () => clearInterval(t);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

// Position Ticker
function PositionTicker({ positions }: { positions: string[] }) {
  if (!positions.length) return null;
  const items = [...positions, ...positions];
  return (
    <div className="overflow-hidden w-full">
      <div className="flex gap-2 whitespace-nowrap" style={{ animation: "scroll-left 20s linear infinite" }}>
        {items.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/8 border border-white/10 text-[10px] font-bold text-white/55 uppercase tracking-wide flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400/70 flex-shrink-0" />
            {p}
          </span>
        ))}
      </div>
      <style>{`@keyframes scroll-left { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}

// Main
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [captchaString, setCaptchaString] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [stats, setStats] = useState<LiveStats>({ totalEmployees: 0, activeEmployees: 0, totalDrivers: 0, positions: [] });
  const [statsLoading, setStatsLoading] = useState(true);

  const router = useRouter();
  const supabase = createClient();
  const isFormValid = email.trim() !== "" && password.trim() !== "" && captchaInput.trim() !== "";

  // Initialize
  useEffect(() => {
    const saved = localStorage.getItem("envirocab-theme");
    const dark = saved === "dark";
    setDarkMode(dark);
    document.documentElement.classList.toggle("dark", dark);
    generateCaptcha();
    fetchStats();
  }, []);

  useEffect(() => {
    localStorage.setItem("envirocab-theme", darkMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Fetch live data from database
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      // All hired employees
      const { count: total } = await supabase
        .from("hr_proceedlist")
        .select("*", { count: "exact", head: true });

      // Active employees
      const { count: active } = await supabase
        .from("hr_proceedlist")
        .select("*", { count: "exact", head: true })
        .eq("active_employee", true);

      // All positions from hr_position (dynamic)
      const { data: posRows } = await supabase
        .from("hr_position")
        .select("position, position_id");

      const posNames: string[] = (posRows || []).map((r: any) => r.position).filter(Boolean);

      // Count drivers — positions that contain "driver"
      const driverPosIds = (posRows || [])
        .filter((r: any) => r.position?.toLowerCase().includes("driver"))
        .map((r: any) => r.position_id);

      let drivers = 0;
      if (driverPosIds.length) {
        const { count } = await supabase
          .from("hr_proceedlist")
          .select("*", { count: "exact", head: true })
          .in("position", driverPosIds);
        drivers = count || 0;
      }

      setStats({
        totalEmployees: total || 0,
        activeEmployees: active || 0,
        totalDrivers: drivers,
        positions: posNames,
      });
    } catch (e) {
      console.error("Stats error:", e);
    } finally {
      setStatsLoading(false);
    }
  };

  // Toast
  const showSuccessProgressToast = (name: string) =>
    toast.promise(
      new Promise((res) => setTimeout(res, 2000)),
      {
        loading: (
          <div className="flex flex-col gap-2 min-w-[200px]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="text-sm font-bold">Welcome, {name}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2, ease: "linear" }}
                className="h-full bg-emerald-500" />
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Initializing Dashboard...</span>
          </div>
        ),
        success: "Authenticated!",
        error: "Redirect failed",
      },
      {
        style: {
          borderRadius: "1rem",
          background: darkMode ? "#1F2937" : "#fff",
          color: darkMode ? "#fff" : "#111827",
          border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E2E8F0",
        },
      }
    );

  const showError = (msg: string) =>
    toast.custom((t) => (
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full bg-white dark:bg-[#1F2937] shadow-2xl rounded-2xl flex overflow-hidden border-b-4 border-red-500"
      >
        <div className="flex-1 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Authentication Error</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{msg}</p>
          </div>
        </div>
        <button onClick={() => toast.dismiss(t.id)} className="px-4 text-gray-400 hover:text-gray-600 border-l border-gray-100 dark:border-gray-800">
          <X size={15} />
        </button>
      </motion.div>
    ), { duration: 4000, position: "top-right" });

  const generateCaptcha = () => {
    const ch = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
    setCaptchaString(Array.from({ length: 6 }, () => ch[Math.floor(Math.random() * ch.length)]).join(""));
    setCaptchaInput("");
  };

  // Login handler 
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 3000));

    if (captchaInput !== captchaString) {
      showError("Incorrect Captcha. Please match characters exactly.");
      generateCaptcha();
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) {
      showError(authError?.message || "Invalid credentials");
      setLoading(false);
      generateCaptcha();
      return;
    }

    const target = "tnvsdmnstrtv@gmail.com";
    if (authData.user.email !== target) {
      await supabase.auth.signOut();
      showError("Unauthorized: Access restricted to primary admin only.");
      setLoading(false);
      generateCaptcha();
      return;
    }

    const { data: adminData, error: adminError } = await supabase
      .from("admin_accounts").select("display_name").eq("email", target).single();
    if (adminError || !adminData) {
      await supabase.auth.signOut();
      showError("Admin profile record not found.");
      setLoading(false);
      return;
    }

    await showSuccessProgressToast(adminData.display_name);
    router.push("/dashboard");
  };

  // Shared input class
  const inp = (extra = "") =>
    `w-full border rounded-xl py-2.5 text-sm outline-none transition-all focus:ring-2 ${darkMode
      ? "bg-[#1A2233] border-white/8 text-white placeholder:text-white/20 focus:border-sky-500/40 focus:ring-sky-500/10"
      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-sky-100"
    } ${extra}`;

  const modules = [
    { icon: CalendarCheck, label: "Facilities Reservation" },
    { icon: Archive, label: "Document Management" },
    { icon: Scale, label: "Legal Management" },
    { icon: Users, label: "Visitor Management" },
  ];

  const liveStatCards = [
    { icon: Users, label: "Total Applicants", value: stats.totalEmployees },
    { icon: CheckCircle2, label: "Total Hired", value: stats.activeEmployees },
    { icon: Car, label: "Drivers", value: stats.totalDrivers },
  ];

  // Render
  return (
    <div className={`h-screen w-screen flex overflow-hidden ${darkMode ? "bg-[#070B14]" : "bg-[#EEF2F7]"}`}>
      <Toaster position="top-right" />

      {/* Left Panel */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="hidden lg:flex flex-col w-[46%] h-full overflow-hidden relative"
        style={{
          background: darkMode
            ? "linear-gradient(160deg,#09172A 0%,#0C2540 60%,#060F1C 100%)"
            : "linear-gradient(160deg,#0F3460 0%,#1565A8 60%,#0B2545 100%)",
        }}
      >
        {/* Grid texture */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
        {/* Glows */}
        <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-sky-500/8 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 -left-16 w-72 h-72 rounded-full bg-blue-500/8 blur-[80px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-sky-400/15 to-transparent" />

        {/* Logo */}
        <div className="relative z-10 px-8 pt-7 pb-0 flex-shrink-0">
          <div className="relative w-40 h-11">
            <Image src="/images/removebglogo.png" alt="TNVS Logo" fill className="object-contain brightness-125" priority />
          </div>
          <div className="h-px w-16 bg-gradient-to-r from-sky-400 to-transparent mt-2.5 mb-2" />
          <p className="text-[8.5px] tracking-[0.32em] uppercase font-black text-sky-300/65">
            Transportation Network Vehicle Services
          </p>
        </div>

        {/* Center content */}
        <div className="relative z-10 px-8 flex-1 flex flex-col justify-center gap-4 min-h-0 py-4">
          {/* Headline */}
          <div>
            <h1 className="text-[2.4rem] font-black text-white leading-[1.0] tracking-tight">
              Admin
              <br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg,#38BDF8,#93C5FD)" }}>
                Control
              </span>
              <br />
              Portal
            </h1>
            <p className="mt-2.5 text-[11px] text-white/42 leading-relaxed max-w-[240px]">
              Centralized operations management for TNVS — built for precision and accountability.
            </p>
          </div>

          {/* Module grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {modules.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 rounded-xl px-3 py-2 border bg-white/[0.04] border-white/[0.08]">
                <div className="w-5 h-5 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={11} className="text-sky-300" />
                </div>
                <span className="text-white/65 text-[10px] font-bold leading-tight">{label}</span>
              </div>
            ))}
          </div>

          {/* Live stats */}
          <div className="grid grid-cols-3 gap-1.5">
            {liveStatCards.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl p-2.5 border text-center bg-white/[0.04] border-white/[0.08]">
                <Icon size={11} className="text-sky-400 mx-auto mb-1" />
                <p className="text-white font-black text-base leading-none">
                  {statsLoading
                    ? <span className="inline-block w-6 h-3.5 bg-white/10 rounded animate-pulse" />
                    : <AnimatedNumber value={value} />
                  }
                </p>
                <p className="text-white/35 text-[8px] uppercase tracking-wider mt-0.5 font-bold">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Position ticker + footer */}
        <div className="relative z-10 px-8 pb-6 flex-shrink-0 space-y-2.5">
          <div>
            <p className="text-[8px] text-white/28 uppercase tracking-widest font-black mb-1.5">
              Active Positions · {stats.positions.length} roles
            </p>
            {statsLoading
              ? <div className="h-6 rounded-full bg-white/5 animate-pulse" />
              : <PositionTicker positions={stats.positions} />
            }
          </div>
          <div className="h-px w-full bg-white/[0.06]" />
          <div className="flex items-center justify-between">
            <p className="text-[8.5px] text-white/22 tracking-wider">© {new Date().getFullYear()} TNVS Admin System</p>
            <div className="flex items-center gap-1 text-white/22">
              <Shield size={8} />
              <span className="text-[8.5px] tracking-wider">Secured</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right Panel */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.08 }}
        className={`flex-1 h-full flex items-center justify-center relative overflow-hidden ${darkMode ? "bg-[#0B0F1A]" : "bg-[#F8FAFC]"}`}
      >
        {/* Ambient glow */}
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none`}>
          <div className={`w-3/4 h-3/4 rounded-full blur-[90px] ${darkMode ? "bg-sky-900/7" : "bg-blue-100/55"}`} />
        </div>

        {/* Dark mode toggle */}
        <button onClick={() => setDarkMode(!darkMode)} type="button"
          className={`absolute top-4 right-4 p-2 rounded-xl border z-50 hover:scale-110 active:scale-90 transition-all ${darkMode ? "bg-[#1F2937] border-white/10 text-yellow-400" : "bg-white border-slate-200 text-slate-600 shadow-sm"
            }`}
        >
          {darkMode ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        <div className="w-full max-w-[340px] px-5 relative z-10">
          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center mb-4">
            <div className="relative w-32 h-9">
              <Image src="/images/removebglogo.png" alt="Logo" fill className={`object-contain ${darkMode ? "brightness-125" : ""}`} priority />
            </div>
          </div>

          {/* Heading */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-sky-500/25">
                <Shield size={11} className="text-white" />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-[0.22em] ${darkMode ? "text-sky-400" : "text-sky-600"}`}>
                Secure Access
              </span>
            </div>
            <h2 className={`text-xl font-black leading-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
              Welcome back,{" "}
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: darkMode ? "linear-gradient(90deg,#38BDF8,#93C5FD)" : "linear-gradient(90deg,#0369A1,#0284C7)" }}
              >
                Administrator
              </span>
            </h2>
            <p className={`text-[11px] mt-1 ${darkMode ? "text-white/35" : "text-slate-500"}`}>
              Sign in to access the TNVS dashboard.
            </p>
          </div>

          {/* Form card */}
          <form onSubmit={handleLogin}>
            <div className={`rounded-2xl border shadow-xl p-5 space-y-3 ${darkMode ? "bg-[#111827] border-white/5" : "bg-white border-slate-200"}`}>

              {/* Email */}
              <div className="space-y-1">
                <label className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-white/38" : "text-slate-500"}`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${darkMode ? "text-white/20" : "text-slate-400"}`} />
                  <input type="email" value={email} disabled={loading} required
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@tnvs.gov.ph"
                    className={inp(`pl-9 pr-3 ${loading ? "opacity-50" : ""}`)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-white/38" : "text-slate-500"}`}>
                  Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${darkMode ? "text-white/20" : "text-slate-400"}`} />
                  <input type={showPassword ? "text" : "password"} value={password} disabled={loading} required
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className={inp(`pl-9 pr-9 ${loading ? "opacity-50" : ""}`)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? "text-white/25 hover:text-white/55" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {/* Captcha */}
              <div className="space-y-1">
                <label className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-white/38" : "text-slate-500"}`}>
                  Verification Captcha
                </label>
                <div className={`flex items-center gap-2 p-2 rounded-xl border ${darkMode ? "bg-[#0F172A] border-white/8" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex-1 flex items-center justify-center py-1.5 px-3 rounded-lg select-none relative overflow-hidden"
                    style={{
                      background: darkMode ? "linear-gradient(135deg,#1e293b,#0f172a)" : "linear-gradient(135deg,#e2e8f0,#f1f5f9)",
                      border: darkMode ? "1px solid rgba(255,255,255,0.055)" : "1px solid #cbd5e1",
                    }}
                  >
                    <div className="absolute inset-0 opacity-10 pointer-events-none"
                      style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(100,100,100,0.18) 3px,rgba(100,100,100,0.18) 4px)" }}
                    />
                    <span className="text-sm font-black italic line-through relative z-10"
                      style={{ color: darkMode ? "#94a3b8" : "#334155", letterSpacing: "0.3em" }}
                    >
                      {captchaString}
                    </span>
                  </div>
                  <button type="button" onClick={generateCaptcha} disabled={loading}
                    className={`p-1.5 rounded-lg transition-all hover:rotate-180 ${darkMode ? "text-sky-400 hover:bg-sky-400/10" : "text-sky-600 hover:bg-sky-50"}`}
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
                <input type="text" value={captchaInput} disabled={loading} required
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder="Type the code above"
                  className={inp(`text-center font-bold tracking-widest px-3 ${loading ? "opacity-50" : ""}`)}
                />
              </div>

              {/* Divider */}
              <div className={`h-px ${darkMode ? "bg-white/5" : "bg-slate-100"}`} />

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !isFormValid}
                className={`w-full font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[11px] tracking-[0.18em] uppercase ${!isFormValid
                  ? darkMode ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "text-white shadow-lg shadow-sky-500/22 hover:shadow-sky-500/38 hover:-translate-y-0.5 active:translate-y-0"
                  }`}
                style={isFormValid ? { background: "linear-gradient(135deg,#0369A1 0%,#0284C7 55%,#0EA5E9 100%)" } : {}}
              >
                {loading
                  ? <><Loader2 className="animate-spin" size={14} /><span>Verifying...</span></>
                  : <><span>Authenticate</span><ArrowRight size={14} /></>
                }
              </button>
            </div>
          </form>

          {/* Footer */}
          <p className={`text-center text-[9px] mt-3 leading-relaxed ${darkMode ? "text-white/18" : "text-slate-400"}`}>
            Restricted to authorized TNVS personnel only. Unauthorized access is strictly prohibited.
          </p>
        </div>
      </motion.div>
    </div>
  );
}