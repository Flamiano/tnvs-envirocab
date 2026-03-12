"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Home,
  Users,
  UserCheck,
  MessageSquare,
  Building2,
  UserPlus,
  FileText,
  HelpCircle,
  Star,
  ChevronDown,
  Car,
  User,
  Scale,
  ShieldCheck,
} from "lucide-react";

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════

interface ChildLink {
  name: string;
  icon: React.ElementType;
}

interface NavLink {
  name: string;
  icon: React.ElementType;
  children?: ChildLink[]; // if present → dropdown, NEVER navigates on its own
}

interface NavGroup {
  title: string;
  links: NavLink[];
}

// ══════════════════════════════════════════════════════════════════
// MENU CONFIG
// ══════════════════════════════════════════════════════════════════

const menuGroups: NavGroup[] = [
  {
    title: "Main",
    links: [
      { name: "Home", icon: Home },
      { name: "Message", icon: MessageSquare },
    ],
  },
  {
    title: "Administration",
    links: [
      { name: "Admins", icon: Users },
      { name: "Registered Users (DB)", icon: UserCheck },
      { name: "Facilities", icon: Building2 },
    ],
  },
  {
    title: "Legal & Docs",
    links: [
      { name: "Visitors", icon: UserPlus },
      {
        name: "Legal",           // ← was "Legal Affairs" — now a dropdown, NEVER navigates
        icon: Scale,
        children: [
          { name: "Legal/Contracts", icon: ShieldCheck },
          { name: "Legal/Employees", icon: User },
          { name: "Legal/Vehicles", icon: Car },
        ],
      },
      {
        name: "Documents",
        icon: FileText,
        children: [
          { name: "Documents/Employees", icon: User },
          { name: "Documents/Vehicles", icon: Car },
          { name: "Documents/Organizations", icon: Building2 },
        ],
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════
// CHILD DISPLAY LABELS  (strips the prefix)
// ══════════════════════════════════════════════════════════════════

const CHILD_LABELS: Record<string, string> = {
  "Legal/Contracts": "Contracts",
  "Legal/Employees": "Employees",
  "Legal/Vehicles": "Vehicles",
  "Documents/Employees": "Employees",
  "Documents/Vehicles": "Vehicles",
  "Documents/Organizations": "Organizations",
};

// ══════════════════════════════════════════════════════════════════
// PROPS
// ══════════════════════════════════════════════════════════════════

interface SidebarProps {
  active: string;
  setActive: (name: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

// ══════════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════════

export default function Sidebar({
  active,
  setActive,
  isOpen,
  setIsOpen,
}: SidebarProps) {

  // On first render, auto-open whichever dropdown contains the active child
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const group of menuGroups) {
      for (const link of group.links) {
        if (link.children?.some((c) => c.name === active)) {
          init[link.name] = true;
        }
      }
    }
    return init;
  });

  // Toggle open/close — ONLY called from dropdown parents
  const toggleGroup = (name: string) =>
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));

  // Navigate — ONLY called from leaf (child) items or simple links
  const handleNavClick = (name: string) => {
    setActive(name);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  // A dropdown parent highlights when any child is active
  const isParentActive = (link: NavLink): boolean =>
    link.children?.some((c) => c.name === active) ?? false;

  return (
    <>
      {/* ── Mobile overlay ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar panel ── */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="
          fixed left-0 h-[calc(100vh-4rem)] top-16
          md:h-[calc(100vh-5rem)] md:top-20
          lg:h-screen lg:top-0
          w-64
          bg-white dark:bg-[#020617]
          text-slate-600 dark:text-slate-400
          flex flex-col z-[95] overflow-hidden
          border-r border-slate-200 dark:border-white/5
          transition-colors duration-300
          shadow-2xl lg:shadow-none
        "
      >
        {/* Logo (desktop only) */}
        <div className="hidden lg:flex pt-8 pb-5 px-6 flex-col items-center justify-center shrink-0">
          <div className="relative w-40 h-16 transition-transform hover:scale-105 duration-300">
            <Image
              src="/images/removebglogo.png"
              alt="Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-500 font-bold mt-3 opacity-90">
            Management System
          </span>
        </div>

        {/* Mobile top gap */}
        <div className="lg:hidden h-4 shrink-0" />

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 space-y-4 mt-2 overflow-y-auto no-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              <h3 className="px-6 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-1.5">
                {group.title}
              </h3>

              {group.links.map((link) => {
                // ─────────────────────────────────────────────────
                // DROPDOWN PARENT  (has children)
                // Clicking it ONLY opens/closes the dropdown.
                // It NEVER calls setActive or navigates anywhere.
                // ─────────────────────────────────────────────────
                if (link.children?.length) {
                  const parentActive = isParentActive(link);
                  const groupOpen = openGroups[link.name] ?? false;

                  return (
                    <div key={link.name}>
                      {/* Parent row */}
                      <div
                        onClick={() => toggleGroup(link.name)}
                        className={`
                          flex items-center gap-3.5 px-6 py-2
                          cursor-pointer select-none
                          transition-all relative group rounded-xl
                          ${parentActive
                            ? "text-emerald-700 dark:text-white bg-emerald-50 dark:bg-white/10 shadow-sm"
                            : "hover:text-emerald-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                          }
                        `}
                      >
                        {parentActive && (
                          <motion.div
                            layoutId={`parent-bar-${link.name}`}
                            className="absolute left-0 w-1.5 h-4 bg-emerald-500 rounded-r-full"
                          />
                        )}
                        <link.icon
                          size={18}
                          className={
                            parentActive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-400 group-hover:text-emerald-500 transition-colors"
                          }
                        />
                        <span className="text-sm font-semibold tracking-tight flex-1">
                          {link.name}
                        </span>
                        <ChevronDown
                          size={14}
                          className={`
                            transition-transform duration-200 shrink-0
                            ${groupOpen ? "rotate-180" : ""}
                            ${parentActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}
                          `}
                        />
                      </div>

                      {/* Children — these navigate */}
                      <AnimatePresence initial={false}>
                        {groupOpen && (
                          <motion.div
                            key={`${link.name}-ch`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-6 pl-4 border-l border-slate-100 dark:border-white/10 space-y-0.5 py-1">
                              {link.children.map((child) => {
                                const childActive = active === child.name;
                                return (
                                  <div
                                    key={child.name}
                                    onClick={() => handleNavClick(child.name)}
                                    className={`
                                      flex items-center gap-2.5 px-3 py-1.5
                                      cursor-pointer transition-all rounded-xl
                                      ${childActive
                                        ? "text-emerald-700 dark:text-white bg-emerald-50 dark:bg-white/10 shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                                      }
                                    `}
                                  >
                                    <child.icon
                                      size={14}
                                      className={
                                        childActive
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : "text-slate-400 transition-colors"
                                      }
                                    />
                                    <span className="text-xs font-semibold tracking-tight">
                                      {CHILD_LABELS[child.name] ?? child.name.split("/")[1]}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                // ─────────────────────────────────────────────────
                // SIMPLE LINK  (no children) — navigates on click
                // ─────────────────────────────────────────────────
                const isActive = active === link.name;
                return (
                  <div
                    key={link.name}
                    onClick={() => handleNavClick(link.name)}
                    className={`
                      flex items-center gap-3.5 px-6 py-2
                      cursor-pointer transition-all relative group rounded-xl
                      ${isActive
                        ? "text-emerald-700 dark:text-white bg-emerald-50 dark:bg-white/10 shadow-sm"
                        : "hover:text-emerald-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                      }
                    `}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeSideBar"
                        className="absolute left-0 w-1.5 h-4 bg-emerald-500 rounded-r-full"
                      />
                    )}
                    <link.icon
                      size={18}
                      className={
                        isActive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-400 group-hover:text-emerald-500 transition-colors"
                      }
                    />
                    <span className="text-sm font-semibold tracking-tight">
                      {link.name}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="p-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/10 shrink-0">
          <div className="flex items-center gap-4 px-6 py-2 hover:text-emerald-600 dark:hover:text-white cursor-pointer group text-xs font-semibold transition-colors">
            <HelpCircle size={15} className="text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-white transition-colors" />
            <span>Help Center</span>
          </div>
        </div>
      </motion.aside>
    </>
  );
}