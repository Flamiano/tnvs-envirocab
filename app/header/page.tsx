"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthSession } from "@/app/utils/useAuthSession";
import toast, { Toaster } from "react-hot-toast";
import {
  Search,
  Bell,
  Mail,
  Calendar,
  ChevronDown,
  Moon,
  Sun,
  User,
  LogOut,
  Loader2,
  ChevronsLeft,
  AlignLeft,
} from "lucide-react";

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { adminName, initials, loading, handleSignOut } = useAuthSession();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("envirocab-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle("dark", newDark);
    localStorage.setItem("envirocab-theme", newDark ? "dark" : "light");
  };

  const handleLogoutSequence = async () => {
    setIsLoggingOut(true);
    setIsOpen(false);

    localStorage.removeItem("dashboard_active_tab");
    sessionStorage.removeItem("dashboard_init_done");

    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)).then(() =>
        handleSignOut()
      ),
      {
        loading: (
          <div className="flex flex-col min-w-[220px] gap-2">
            <div className="flex items-center gap-2">
              <LogOut className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-gray-800 dark:text-white">
                Closing Session
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "linear" }}
                className="h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
              />
            </div>
          </div>
        ),
        success: "Logged out safely",
        error: "Logout failed",
      },
      {
        style: {
          borderRadius: "1rem",
          background: isDark ? "#1F2937" : "#FFFFFF",
          color: isDark ? "#FFFFFF" : "#1F2937",
          border: isDark
            ? "1px solid rgba(255,255,255,0.1)"
            : "1px solid #e2e8f0",
        },
      }
    );
  };

  return (
    <>
      <Toaster position="top-right" />

      {/* Header is z-[100] — the absolute top layer, nothing covers it */}
      <header className="h-16 md:h-20 lg:h-24 px-4 md:px-6 lg:px-10 flex items-center justify-between bg-white dark:bg-[#0f172a] border-b-2 border-slate-100 dark:border-slate-800 sticky top-0 z-[100] transition-colors duration-300">

        <div className="flex items-center gap-3 md:gap-4">
          {/* Toggle button — ChevronsLeft when open, AlignLeft when closed */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all focus:outline-none"
            aria-label="Toggle sidebar"
          >
            <AnimatePresence mode="wait" initial={false}>
              {sidebarOpen ? (
                <motion.span
                  key="close"
                  initial={{ x: -6, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -6, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="block"
                >
                  <ChevronsLeft size={22} />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ x: 6, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 6, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="block"
                >
                  <AlignLeft size={22} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Search Input */}
          <div className="relative group w-40 sm:w-56 md:w-72 lg:w-96">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
              <Search
                className="text-slate-400 group-focus-within:text-sky-500 transition-colors"
                size={16}
              />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm outline-none transition-all dark:text-white"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:block">
              <kbd className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] text-slate-400 group-focus-within:opacity-0 transition-opacity">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 lg:gap-6">
          {/* Action Icons */}
          <div className="flex items-center gap-1 md:gap-2 pr-3 md:pr-6 lg:pr-8 border-r-2 border-slate-100 dark:border-slate-800">
            <button className="hidden sm:flex p-2 md:p-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all">
              <Mail size={18} />
            </button>
            <button className="p-2 md:p-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 md:top-2.5 md:right-2.5 w-3.5 h-3.5 md:w-4 md:h-4 bg-sky-500 text-[9px] md:text-[10px] text-white flex items-center justify-center rounded-full border-2 border-white dark:border-[#0f172a]">
                7
              </span>
            </button>
            <button className="hidden md:flex p-2 md:p-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all">
              <Calendar size={18} />
            </button>
          </div>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => !isLoggingOut && setIsOpen(!isOpen)}
              className={`flex items-center gap-2 md:gap-3 cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 md:pr-4 rounded-full transition-all border-2 border-transparent ${isOpen
                  ? "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700"
                  : ""
                } ${isLoggingOut ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-yellow-600 border-2 border-white dark:border-slate-700 shadow-md flex items-center justify-center text-white font-semibold text-sm">
                {isLoggingOut ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  initials
                )}
              </div>
              <span className="hidden lg:block text-sm font-bold text-slate-800 dark:text-slate-200">
                {loading ? "..." : adminName}
              </span>
              <ChevronDown
                size={13}
                className={`hidden sm:block text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""
                  }`}
              />
            </div>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-64 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-2 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-medium text-emerald-600 tracking-widest">
                      ACTIVE STATUS
                    </span>
                  </div>

                  <div className="py-2 space-y-1">
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                      <User size={18} /> Profile Settings
                    </button>

                    <button
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isDark ? (
                          <Sun size={18} className="text-yellow-400" />
                        ) : (
                          <Moon size={18} />
                        )}
                        {isDark ? "Light Mode" : "Dark Mode"}
                      </div>
                      <div
                        className={`w-8 h-4 rounded-full transition-colors relative ${isDark ? "bg-sky-500" : "bg-slate-200"
                          }`}
                      >
                        <div
                          className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${isDark ? "left-5" : "left-1"
                            }`}
                        />
                      </div>
                    </button>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                    <button
                      onClick={handleLogoutSequence}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      <LogOut size={18} />{" "}
                      {isLoggingOut ? "Logging out..." : "Logout"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
    </>
  );
}