"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ShieldAlert, X, Loader2 } from "lucide-react";
import { useAuthSession } from "@/app/utils/useAuthSession";
import { useIdleTimeout } from "@/app/utils/useIdleTimeout";

import Sidebar from "../components/sidebar/page";
import Header from "../components/header/page";

// ── Regular pages ─────────────────────────────────────────────────────────────
import HomeContent from "./HomeContent";
import Message from "./Message";
import Admins from "./Admins";
import RegisteredUsers from "./RegisteredUsers";
import Facilities from "./Facilities";
import Visitors from "./Visitors";

// ── Legal sub-pages (app/dashboard/legal/) ───────────────────────────────────
import LegalContracts from "./legal/LegalContracts";
import LegalEmployees from "./legal/LegalEmployees";
import LegalVehicles from "./legal/LegalVehicles";

// ── Documents sub-pages (app/dashboard/documents/) ───────────────────────────
import DocuEmployees from "./documents/DocuEmployees";
import DocuVehicles from "./documents/DocuVehicles";
import DocuOrganizations from "./documents/DocuOrganizations";

// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const idleFiredRef = useRef(false);

  const [active, setActive] = useState("Home");
  const [currentTab, setCurrentTab] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { loading, adminName, handleSignOut } = useAuthSession();

  // ── Idle timeout ─────────────────────────────────────────────────────────
  const handleIdle = useCallback(async () => {
    if (idleFiredRef.current) return;
    idleFiredRef.current = true;

    toast.custom(
      (t) => (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full bg-white dark:bg-[#1F2937] shadow-2xl rounded-2xl overflow-hidden border-b-4 border-amber-500"
        >
          <div className="flex items-start gap-3 p-4">
            <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Session Expired</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                You were inactive for 5 minutes. Logging you out…
              </p>
              <div className="mt-3 h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 3, ease: "linear" }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
              <span className="mt-1.5 block text-[10px] text-slate-400 uppercase tracking-wider">
                Redirecting to login...
              </span>
            </div>
            <button
              onClick={() => toast.dismiss(t)}
              className="flex-shrink-0 ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      ),
      { duration: 3000, position: "top-center" }
    );

    await new Promise<void>((resolve) => setTimeout(resolve, 3000));
    await handleSignOut();
  }, [handleSignOut]);

  useIdleTimeout({ timeoutMs: 5 * 60 * 1000, onIdle: handleIdle, disabled: loading });

  // ── Auto-open sidebar on desktop ─────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Force Home on fresh login ─────────────────────────────────────────────
  useEffect(() => {
    if (!loading && adminName) {
      const hasInitialized = sessionStorage.getItem("dashboard_init_done");
      if (!hasInitialized) {
        setActive("Home");
        localStorage.setItem("dashboard_active_tab", "Home");
        sessionStorage.setItem("dashboard_init_done", "true");
      } else {
        const savedTab = localStorage.getItem("dashboard_active_tab");
        if (savedTab) setActive(savedTab);
      }
    }
  }, [loading, adminName]);

  // ── Scroll to top on tab change ───────────────────────────────────────────
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [active]);

  // ── Persist active tab ────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading) localStorage.setItem("dashboard_active_tab", active);
  }, [active, loading]);

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-[#0f172a]">
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin mb-4" />
        <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">
          Verifying Session...
        </p>
      </div>
    );
  }

  // ── Route switcher ────────────────────────────────────────────────────────
  const renderView = () => {
    switch (active) {
      case "Home":
        return <HomeContent currentTab={currentTab} setCurrentTab={setCurrentTab} adminName={adminName} />;
      case "Message":
        return <Message />;
      case "Admins":
        return <Admins />;
      case "Registered Users (DB)":
        return <RegisteredUsers />;
      case "Facilities":
        return <Facilities />;
      case "Visitors":
        return <Visitors />;

      // ── Legal sub-pages ──────────────────────────────────────────────────
      case "Legal/Contracts":
        return <LegalContracts />;
      case "Legal/Employees":
        return <LegalEmployees />;
      case "Legal/Vehicles":
        return <LegalVehicles />;

      // ── Documents sub-pages ──────────────────────────────────────────────
      case "Documents/Employees":
        return <DocuEmployees />;
      case "Documents/Vehicles":
        return <DocuVehicles />;
      case "Documents/Organizations":
        return <DocuOrganizations />;

      default:
        return <HomeContent currentTab={currentTab} setCurrentTab={setCurrentTab} adminName={adminName} />;
    }
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Sidebar
        active={active}
        setActive={setActive}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      <div
        className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : "ml-0"
        }`}
      >
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main
          ref={scrollContainerRef}
          className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto"
        >
          {renderView()}
        </main>
      </div>
    </div>
  );
}