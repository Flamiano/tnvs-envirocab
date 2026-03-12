"use client";

import {
  Newspaper,
  Info,
  Calendar,
  Car,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";

interface HomeContentProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  adminName: string;
}

export default function HomeContent({
  currentTab,
  setCurrentTab,
  adminName,
}: HomeContentProps) {
  // --- Calendar Logic ---
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.toLocaleString("default", { month: "short" });
  const currentYear = now.getFullYear();

  const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, now.getMonth(), 1).getDay();
  const blanks = Array.from({ length: firstDayOfMonth });
  const days = Array.from({ length: daysInMonth });

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Left Column: Main Dashboard Area */}
      <div className="flex-[3] flex flex-col gap-8">
        {/* Top Navigation Tabs */}
        <div className="flex gap-4 p-1.5 bg-slate-100/50 dark:bg-slate-900/50 w-fit rounded-[2rem] border border-slate-200/50 dark:border-slate-800">
          {["Dashboard", "News", "Welcome"].map((tab) => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={`px-8 py-3 rounded-[1.5rem] text-xs font-medium transition-all ${
                currentTab === tab
                  ? "bg-white dark:bg-sky-500 text-sky-600 dark:text-white shadow-sm border border-slate-200 dark:border-transparent"
                  : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Dynamic Dashboard Banner */}
        {currentTab === "Dashboard" && (
          <div className="relative w-full h-80 bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700 rounded-[3rem] flex flex-col items-start justify-center px-12 text-white border-8 border-white dark:border-slate-800 shadow-[0_32px_64px_-15px_rgba(14,165,233,0.25)] overflow-hidden group">
            <div className="relative z-10">
              <span className="bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-[10px] font-semibold tracking-wider mb-4 inline-block">
                Admin Session Active
              </span>
              <h2 className="text-3xl font-medium italic leading-none opacity-90">
                Welcome back,
              </h2>
              <h3 className="text-7xl font-bold text-yellow-300 tracking-tighter mt-1 drop-shadow-2xl">
                {adminName}
              </h3>
            </div>

            <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform duration-1000">
              <Car size={280} strokeWidth={2.5} />
            </div>

            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 shadow-xl border-2 border-slate-100 dark:border-slate-700 min-h-[450px] relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-xs font-semibold tracking-wider flex items-center gap-3 text-slate-400">
              <div className="p-2 bg-sky-500/10 rounded-xl">
                {currentTab === "News" && (
                  <Newspaper size={18} className="text-sky-500" />
                )}
                {currentTab === "Welcome" && (
                  <Info size={18} className="text-sky-500" />
                )}
                {currentTab === "Dashboard" && (
                  <Car size={18} className="text-sky-500" />
                )}
              </div>
              {currentTab} Overview
            </h4>
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] flex items-center justify-center mb-6 text-slate-300 dark:text-slate-600 rotate-3 hover:rotate-0 transition-transform shadow-inner">
              {currentTab === "Dashboard" ? (
                <Car size={40} />
              ) : (
                <Info size={40} />
              )}
            </div>
            <h5 className="text-slate-900 dark:text-white font-semibold text-xl">
              Quiet in the {currentTab}
            </h5>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mt-3 leading-relaxed">
              No recent updates or anomalies detected in this module. Check back
              later for real-time logs.
            </p>
            <button className="mt-8 flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-semibold hover:gap-4 transition-all">
              Refresh View <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Right Column Sidebar Widgets */}
      <div className="flex-1 lg:max-w-[340px] space-y-8">
        {/* Calendar Widget */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-xl border-2 border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h5 className="font-semibold text-xs tracking-wider flex items-center gap-2 text-slate-900 dark:text-white">
              <Calendar size={18} className="text-sky-500" strokeWidth={2.5} />
              {currentMonth} {currentYear}
            </h5>
          </div>

          <div className="grid grid-cols-7 gap-2 text-[10px] text-center font-medium text-slate-400 dark:text-slate-500 mb-4">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, index) => (
              <div key={`day-header-${index}`}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 text-center">
            {blanks.map((_, i) => (
              <div key={`blank-${i}`} className="aspect-square" />
            ))}
            {days.map((_, i) => {
              const day = i + 1;
              const isToday = day === currentDay;
              return (
                <div
                  key={`date-${i}`}
                  className={`aspect-square flex items-center justify-center text-xs rounded-2xl transition-all border-2 ${
                    isToday
                      ? "bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-500/30 font-bold scale-110"
                      : "bg-slate-50 dark:bg-slate-900/50 border-transparent text-slate-600 dark:text-slate-400 font-medium hover:border-slate-200 dark:hover:border-slate-600"
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* Infrastructure Status Widget */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-xl border-2 border-slate-100 dark:border-slate-700 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h5 className="font-semibold text-xs tracking-wider flex items-center gap-2 text-slate-900 dark:text-white">
              <ShieldCheck
                size={18}
                className="text-emerald-500"
                strokeWidth={2.5}
              />{" "}
              Infrastructure
            </h5>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-semibold">
                <span className="text-slate-400">Main Database</span>
                <span className="text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 size={12} strokeWidth={3} /> STABLE
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-900 h-3 rounded-full p-1 border border-slate-200 dark:border-slate-700">
                <div className="bg-emerald-500 h-full w-[98%] rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-semibold">
                <span className="text-slate-400">API Gateway</span>
                <span className="text-sky-500 flex items-center gap-1">
                  <Clock size={12} strokeWidth={3} /> 12ms
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-900 h-3 rounded-full p-1 border border-slate-200 dark:border-slate-700">
                <div className="bg-sky-500 h-full w-[35%] rounded-full shadow-[0_0_12px_rgba(14,165,233,0.5)]" />
              </div>
            </div>

            <button className="w-full mt-4 py-4 bg-slate-900 dark:bg-slate-700 hover:bg-black dark:hover:bg-slate-600 text-white text-[10px] font-semibold rounded-2xl transition-all shadow-lg">
              Open Network Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
