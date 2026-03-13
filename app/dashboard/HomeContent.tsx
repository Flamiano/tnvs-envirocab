"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Newspaper,
  Info,
  Calendar,
  Car,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Users,
  FileText,
  DoorOpen,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Activity,
  Wifi,
  WifiOff,
} from "lucide-react";

// ─── Supabase client ────────────────────────────────────────────────────────
// Replace these with your actual env vars
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ───────────────────────────────────────────────────────────────────
interface DashboardStats {
  totalFleet: number;
  activeFleet: number;
  onboardingFleet: number;
  todayVisitors: number;
  checkedInVisitors: number;
  pendingGatepasses: number;
  approvedGatepasses: number;
  activeContracts: number;
  expiringContracts: number;
  totalEmployees: number;
  recentHires: number;
}

interface RecentVisitor {
  id: string;
  name: string;
  type: string;
  status: string;
  entry_time: string;
}

interface RecentGatepass {
  id: string;
  requested_by_name: string;
  purpose: string;
  status: string;
  visit_date: string;
  department: string;
}

interface FleetVehicle {
  id: string;
  unit_id: string;
  plate_number: string;
  model: string;
  type: string;
  status: string;
  driver_name: string;
}

interface HomeContentProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  adminName: string;
}

// ─── Stat Card Component ─────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${color}`}>{icon}</div>
        {sub && (
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-full">
            {sub}
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse mb-1" />
      ) : (
        <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {value}
        </p>
      )}
      <p className="text-[11px] text-slate-400 font-medium mt-1">{label}</p>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Checked In": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    Completed: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
    Cancelled: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    declined: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
    expired: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
    Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    Onboarding: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
    Inactive: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
    Maintenance: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${map[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HomeContent({
  currentTab,
  setCurrentTab,
  adminName,
}: HomeContentProps) {
  // Calendar
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.toLocaleString("default", { month: "short" });
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, now.getMonth(), 1).getDay();
  const blanks = Array.from({ length: firstDayOfMonth });
  const days = Array.from({ length: daysInMonth });

  // State
  const [stats, setStats] = useState<DashboardStats>({
    totalFleet: 0,
    activeFleet: 0,
    onboardingFleet: 0,
    todayVisitors: 0,
    checkedInVisitors: 0,
    pendingGatepasses: 0,
    approvedGatepasses: 0,
    activeContracts: 0,
    expiringContracts: 0,
    totalEmployees: 0,
    recentHires: 0,
  });
  const [recentVisitors, setRecentVisitors] = useState<RecentVisitor[]>([]);
  const [recentGatepasses, setRecentGatepasses] = useState<RecentGatepass[]>([]);
  const [fleetList, setFleetList] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // ── Fetch all dashboard data ──────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const thirtyDaysFromNow = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split("T")[0];

      const [
        fleetRes,
        visitorsRes,
        gatepasses,
        contracts,
        expiringContracts,
        employees,
        recentHiresRes,
        recentVisitorsRes,
        recentGatepassRes,
        fleetListRes,
      ] = await Promise.all([
        // Fleet stats
        supabase
          .from("log2_fleet")
          .select("status", { count: "exact" }),
        // Today's walk-in visitors
        supabase
          .from("administrative_walkin_visitors")
          .select("*", { count: "exact" })
          .gte("created_at", `${today}T00:00:00`)
          .lte("created_at", `${today}T23:59:59`),
        // Gate passes
        supabase
          .from("administrative_online_gatepass")
          .select("status", { count: "exact" })
          .in("status", ["pending", "approved"]),
        // Active contracts
        supabase
          .from("administrative_contracts")
          .select("*", { count: "exact" })
          .eq("status", "Active"),
        // Expiring contracts (next 30 days)
        supabase
          .from("administrative_contracts")
          .select("*", { count: "exact" })
          .eq("status", "Active")
          .lte("expiry_date", thirtyDaysFromNow)
          .gte("expiry_date", today),
        // Total active employees
        supabase
          .from("hr_proceedlist")
          .select("*", { count: "exact" })
          .eq("active_employee", true),
        // Recent hires (last 30 days)
        supabase
          .from("hr_proceedlist")
          .select("*", { count: "exact" })
          .gte("hireddate", `${thirtyDaysAgo}T00:00:00`),
        // Recent visitors list
        supabase
          .from("administrative_walkin_visitors")
          .select("id, name, type, status, entry_time")
          .order("created_at", { ascending: false })
          .limit(5),
        // Recent gate passes
        supabase
          .from("administrative_online_gatepass")
          .select("id, requested_by_name, purpose, status, visit_date, department")
          .order("created_at", { ascending: false })
          .limit(5),
        // Fleet list
        supabase
          .from("log2_fleet")
          .select("id, unit_id, plate_number, model, type, status, driver_name")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      // Fleet breakdown
      const fleetData = fleetRes.data ?? [];
      const totalFleet = fleetRes.count ?? 0;
      const activeFleet = fleetData.filter((v) => v.status === "Active").length;
      const onboardingFleet = fleetData.filter(
        (v) => v.status === "Onboarding"
      ).length;

      // Visitors
      const todayVisitors = visitorsRes.count ?? 0;
      const checkedIn = (visitorsRes.data ?? []).filter(
        (v) => v.status === "Checked In"
      ).length;

      // Gate passes
      const gpData = gatepasses.data ?? [];
      const pendingGP = gpData.filter((g) => g.status === "pending").length;
      const approvedGP = gpData.filter((g) => g.status === "approved").length;

      setStats({
        totalFleet,
        activeFleet,
        onboardingFleet,
        todayVisitors,
        checkedInVisitors: checkedIn,
        pendingGatepasses: pendingGP,
        approvedGatepasses: approvedGP,
        activeContracts: contracts.count ?? 0,
        expiringContracts: expiringContracts.count ?? 0,
        totalEmployees: employees.count ?? 0,
        recentHires: recentHiresRes.count ?? 0,
      });

      setRecentVisitors(recentVisitorsRes.data ?? []);
      setRecentGatepasses(recentGatepassRes.data ?? []);
      setFleetList(fleetListRes.data ?? []);
      setLastUpdated(new Date());
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Real-time subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    const channels = [
      supabase
        .channel("walkin-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "administrative_walkin_visitors" },
          fetchDashboardData
        )
        .subscribe(),
      supabase
        .channel("gatepass-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "administrative_online_gatepass" },
          fetchDashboardData
        )
        .subscribe(),
      supabase
        .channel("fleet-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "log2_fleet" },
          fetchDashboardData
        )
        .subscribe(),
      supabase
        .channel("contracts-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "administrative_contracts" },
          fetchDashboardData
        )
        .subscribe(),
      supabase
        .channel("messages-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "admin_messages" },
          fetchDashboardData
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [fetchDashboardData]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col xl:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Left / Main Column ────────────────────────────────────────────── */}
      <div className="flex-[3] flex flex-col gap-6 min-w-0">

        {/* Top bar: tabs + live indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 justify-between">
          <div className="flex gap-2 p-1.5 bg-slate-100/50 dark:bg-slate-900/50 w-fit rounded-[2rem] border border-slate-200/50 dark:border-slate-800">
            {["Dashboard", "News", "Welcome"].map((tab) => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                className={`px-5 py-2.5 rounded-[1.5rem] text-xs font-medium transition-all ${currentTab === tab
                    ? "bg-white dark:bg-sky-500 text-sky-600 dark:text-white shadow-sm border border-slate-200 dark:border-transparent"
                    : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Live status pill */}
          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full shadow-sm w-fit">
            {isOnline ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <Wifi size={11} className="text-emerald-500" />
                LIVE
              </>
            ) : (
              <>
                <WifiOff size={11} className="text-red-400" />
                OFFLINE
              </>
            )}
            {lastUpdated && (
              <span className="text-slate-300 dark:text-slate-600">
                · {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
            <button
              onClick={fetchDashboardData}
              className="ml-1 hover:text-sky-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Hero Banner */}
        {currentTab === "Dashboard" && (
          <div className="relative w-full h-56 sm:h-72 bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700 rounded-[2.5rem] flex flex-col items-start justify-center px-8 sm:px-12 text-white border-4 border-white dark:border-slate-800 shadow-[0_32px_64px_-15px_rgba(14,165,233,0.3)] overflow-hidden group">
            <div className="relative z-10">
              <span className="bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-[10px] font-semibold tracking-wider mb-3 inline-flex items-center gap-1.5">
                <Activity size={10} /> Admin Session Active
              </span>
              <h2 className="text-2xl sm:text-3xl font-medium italic leading-none opacity-90">
                Welcome back,
              </h2>
              <h3 className="text-5xl sm:text-7xl font-bold text-yellow-300 tracking-tighter mt-1 drop-shadow-2xl">
                {adminName}
              </h3>
            </div>
            {/* Live mini-stats overlay */}
            <div className="absolute bottom-6 right-6 sm:right-10 z-10 flex gap-3">
              {[
                { label: "Fleet", val: stats.totalFleet },
                { label: "On-Site", val: stats.checkedInVisitors },
                { label: "Pending", val: stats.pendingGatepasses },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  className="bg-white/20 backdrop-blur-md rounded-2xl px-3 py-2 text-center"
                >
                  <p className="text-lg font-bold leading-none">
                    {loading ? "—" : val}
                  </p>
                  <p className="text-[9px] opacity-80 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform duration-1000">
              <Car size={260} strokeWidth={2.5} />
            </div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          </div>
        )}

        {/* ── Stats Grid ──────────────────────────────────────────────────── */}
        {currentTab === "Dashboard" && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Car size={18} className="text-sky-600" />}
              label="Total Fleet"
              value={stats.totalFleet}
              sub={`${stats.activeFleet} active`}
              color="bg-sky-50 dark:bg-sky-900/30"
              loading={loading}
            />
            <StatCard
              icon={<Users size={18} className="text-emerald-600" />}
              label="Today's Visitors"
              value={stats.todayVisitors}
              sub={`${stats.checkedInVisitors} on-site`}
              color="bg-emerald-50 dark:bg-emerald-900/30"
              loading={loading}
            />
            <StatCard
              icon={<DoorOpen size={18} className="text-violet-600" />}
              label="Pending Gatepasses"
              value={stats.pendingGatepasses}
              sub={`${stats.approvedGatepasses} approved`}
              color="bg-violet-50 dark:bg-violet-900/30"
              loading={loading}
            />
            <StatCard
              icon={<FileText size={18} className="text-amber-600" />}
              label="Active Contracts"
              value={stats.activeContracts}
              sub={
                stats.expiringContracts > 0
                  ? `⚠ ${stats.expiringContracts} expiring`
                  : "All good"
              }
              color="bg-amber-50 dark:bg-amber-900/30"
              loading={loading}
            />
          </div>
        )}

        {/* ── Secondary stats row ─────────────────────────────────────────── */}
        {currentTab === "Dashboard" && (
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={<TrendingUp size={18} className="text-rose-600" />}
              label="Active Employees"
              value={stats.totalEmployees}
              sub={`+${stats.recentHires} this month`}
              color="bg-rose-50 dark:bg-rose-900/30"
              loading={loading}
            />
            <StatCard
              icon={<ShieldCheck size={18} className="text-teal-600" />}
              label="Fleet Onboarding"
              value={stats.onboardingFleet}
              sub="pending activation"
              color="bg-teal-50 dark:bg-teal-900/30"
              loading={loading}
            />
          </div>
        )}

        {/* ── Tabbed Content Area ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-xl border-2 border-slate-100 dark:border-slate-700 min-h-[360px] relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xs font-semibold tracking-wider flex items-center gap-3 text-slate-400">
              <div className="p-2 bg-sky-500/10 rounded-xl">
                {currentTab === "News" && <Newspaper size={16} className="text-sky-500" />}
                {currentTab === "Welcome" && <Info size={16} className="text-sky-500" />}
                {currentTab === "Dashboard" && <Car size={16} className="text-sky-500" />}
              </div>
              {currentTab === "Dashboard" ? "Recent Visitors" : `${currentTab} Overview`}
            </h4>
          </div>

          {currentTab === "Dashboard" && (
            <div className="space-y-3">
              {/* Walk-in Visitors */}
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">
                Walk-in Visitors (Today)
              </p>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-2xl animate-pulse" />
                ))
              ) : recentVisitors.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-slate-400">
                  <Users size={36} strokeWidth={1.5} className="mb-3 opacity-40" />
                  <p className="text-sm font-medium">No visitors today</p>
                </div>
              ) : (
                recentVisitors.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-sky-200 dark:hover:border-sky-800 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
                        <Users size={14} className="text-sky-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          {v.name}
                        </p>
                        <p className="text-[10px] text-slate-400">{v.type}</p>
                      </div>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>
                ))
              )}

              {/* Recent Gate Passes */}
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mt-6 mb-2">
                Recent Gate Passes
              </p>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-2xl animate-pulse" />
                ))
              ) : recentGatepasses.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-slate-400">
                  <DoorOpen size={36} strokeWidth={1.5} className="mb-3 opacity-40" />
                  <p className="text-sm font-medium">No gate passes found</p>
                </div>
              ) : (
                recentGatepasses.map((gp) => (
                  <div
                    key={gp.id}
                    className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-800 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
                        <DoorOpen size={14} className="text-violet-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {gp.requested_by_name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {gp.department ?? "—"} · {gp.visit_date}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={gp.status} />
                  </div>
                ))
              )}
            </div>
          )}

          {(currentTab === "News" || currentTab === "Welcome") && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] flex items-center justify-center mb-5 text-slate-300 dark:text-slate-600 rotate-3 hover:rotate-0 transition-transform shadow-inner">
                <Info size={36} />
              </div>
              <h5 className="text-slate-900 dark:text-white font-semibold text-lg">
                Nothing here yet
              </h5>
              <p className="text-slate-400 text-sm max-w-xs mt-2 leading-relaxed">
                This section will show {currentTab.toLowerCase()} content once available.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Sidebar ──────────────────────────────────────────────────── */}
      <div className="flex-1 xl:max-w-[320px] space-y-6">

        {/* Calendar Widget */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-5">
            <Calendar size={16} className="text-sky-500" strokeWidth={2.5} />
            <h5 className="font-semibold text-xs tracking-wider text-slate-900 dark:text-white">
              {currentMonth} {currentYear}
            </h5>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-[10px] text-center font-medium text-slate-400 dark:text-slate-500 mb-3">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {blanks.map((_, i) => <div key={`b-${i}`} className="aspect-square" />)}
            {days.map((_, i) => {
              const day = i + 1;
              const isToday = day === currentDay;
              return (
                <div
                  key={day}
                  className={`aspect-square flex items-center justify-center text-[11px] rounded-xl transition-all ${isToday
                      ? "bg-sky-500 text-white font-bold shadow-lg shadow-sky-500/30 scale-110"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
                    }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* Fleet Status Widget */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-5">
            <h5 className="font-semibold text-xs tracking-wider flex items-center gap-2 text-slate-900 dark:text-white">
              <Car size={16} className="text-sky-500" strokeWidth={2.5} />
              Fleet Status
            </h5>
            <span className="text-[10px] text-slate-400 font-medium">
              {stats.totalFleet} units
            </span>
          </div>
          <div className="space-y-2.5">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded-2xl animate-pulse" />
              ))
              : fleetList.length === 0
                ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No fleet data available
                  </div>
                )
                : fleetList.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-900 dark:text-white truncate">
                        {v.unit_id} · {v.plate_number}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {v.driver_name}
                      </p>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>
                ))}
          </div>
        </div>

        {/* Infrastructure / Contracts Alert Widget */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-5">
            <h5 className="font-semibold text-xs tracking-wider flex items-center gap-2 text-slate-900 dark:text-white">
              <ShieldCheck size={16} className="text-emerald-500" strokeWidth={2.5} />
              Infrastructure
            </h5>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>

          <div className="space-y-4">
            {/* DB Status */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-semibold">
                <span className="text-slate-400">Main Database</span>
                <span className="text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 size={11} strokeWidth={3} /> STABLE
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-900 h-2.5 rounded-full">
                <div className="bg-emerald-500 h-full w-[98%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
              </div>
            </div>

            {/* Contracts expiring alert */}
            {stats.expiringContracts > 0 && (
              <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-3">
                <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    Contracts Expiring Soon
                  </p>
                  <p className="text-[10px] text-amber-600/70 dark:text-amber-500/70 mt-0.5">
                    {stats.expiringContracts} contract
                    {stats.expiringContracts > 1 ? "s" : ""} expire within 30 days
                  </p>
                </div>
              </div>
            )}

            {/* API latency */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-semibold">
                <span className="text-slate-400">API Gateway</span>
                <span className="text-sky-500 flex items-center gap-1">
                  <Clock size={11} strokeWidth={3} /> 12ms
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-900 h-2.5 rounded-full">
                <div className="bg-sky-500 h-full w-[35%] rounded-full shadow-[0_0_10px_rgba(14,165,233,0.4)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}