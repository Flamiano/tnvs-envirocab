"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Users,
  UserCheck,
  MessageSquare,
  Building2,
  UserPlus,
  ShieldCheck,
  FileText,
  HelpCircle,
  Star,
  ChevronDown,
  Car,
  Building,
} from "lucide-react";

// ─── Menu definition ──────────────────────────────────────────────────────────
// "name" values here are exactly what gets passed to setActive() in page.tsx.
// Children use "Documents/Employees", "Documents/Vehicles", "Documents/Organizations"
// so renderView() in dashboard/page.tsx can switch on them.

type ChildLink = {
  name: string;
  label: string;
  icon: React.ElementType;
};

type NavLink = {
  name: string;
  icon: React.ElementType;
  children?: ChildLink[];
};

type MenuGroup = {
  title: string;
  links: NavLink[];
};

const menuGroups: MenuGroup[] = [
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
      { name: "Legal Affairs", icon: ShieldCheck },
      {
        name: "Documents",
        icon: FileText,
        children: [
          { name: "Documents/Employees", label: "Employees", icon: Users },
          { name: "Documents/Vehicles", label: "Vehicles", icon: Car },
          { name: "Documents/Organizations", label: "Organizations", icon: Building },
        ],
      },
    ],
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  active: string;
  setActive: (name: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({ active, setActive, isOpen, setIsOpen }: SidebarProps) {
  // Auto-open the Documents dropdown if a child is currently active
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(() =>
    active.startsWith("Documents/") ? { Documents: true } : {}
  );

  const toggleDropdown = (name: string) => {
    setOpenDropdowns((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleNavClick = (name: string) => {
    setActive(name);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

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
            <Image src="/images/removebglogo.png" alt="Logo" fill className="object-contain" priority />
          </div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-500 font-bold mt-3 opacity-90">
            Management System
          </span>
        </div>

        {/* Mobile top spacing */}
        <div className="lg:hidden h-4 shrink-0" />

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 space-y-4 mt-2 overflow-y-auto no-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              <h3 className="px-6 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-1.5">
                {group.title}
              </h3>

              {group.links.map((link) => {

                // ── Dropdown link (has children) ──────────────────────────
                if (link.children) {
                  const dropOpen = openDropdowns[link.name] ?? false;
                  const anyChildActive = active.startsWith("Documents/");
                  const parentHighlight = anyChildActive;

                  return (
                    <div key={link.name}>
                      {/* Parent row — clicking toggles dropdown, does NOT navigate */}
                      <div
                        onClick={() => toggleDropdown(link.name)}
                        className={`
                          flex items-center gap-3.5 px-6 py-2 cursor-pointer
                          transition-all relative group rounded-xl
                          ${parentHighlight
                            ? "text-emerald-700 dark:text-white bg-emerald-50 dark:bg-white/10 shadow-sm dark:shadow-md"
                            : "hover:text-emerald-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                          }
                        `}
                      >
                        <link.icon
                          size={18}
                          className={
                            parentHighlight
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-400 group-hover:text-emerald-500 transition-colors"
                          }
                        />
                        <span className="text-sm font-semibold tracking-tight flex-1">
                          {link.name}
                        </span>
                        {/* Animated chevron */}
                        <motion.span
                          animate={{ rotate: dropOpen ? 180 : 0 }}
                          transition={{ duration: 0.22, ease: "easeInOut" }}
                          className="flex items-center"
                        >
                          <ChevronDown
                            size={14}
                            className={
                              parentHighlight
                                ? "text-emerald-500 dark:text-emerald-400"
                                : "text-slate-300 dark:text-slate-600 group-hover:text-emerald-400 transition-colors"
                            }
                          />
                        </motion.span>
                      </div>

                      {/* ── Children list (animated height) ── */}
                      <AnimatePresence initial={false}>
                        {dropOpen && (
                          <motion.div
                            key="doc-children"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="ml-5 pl-4 mt-0.5 pb-1 border-l-2 border-slate-100 dark:border-white/8 space-y-0.5">
                              {link.children.map((child) => {
                                const isChildActive = active === child.name;
                                return (
                                  <div
                                    key={child.name}
                                    onClick={() => handleNavClick(child.name)}
                                    className={`
                                      flex items-center gap-3 px-3 py-1.5
                                      cursor-pointer transition-all relative group rounded-lg
                                      ${isChildActive
                                        ? "text-emerald-700 dark:text-white bg-emerald-50 dark:bg-white/10 shadow-sm"
                                        : "hover:text-emerald-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                                      }
                                    `}
                                  >
                                    {/* Active indicator */}
                                    {isChildActive && (
                                      <motion.div
                                        layoutId="activeSideBar"
                                        className="absolute left-0 w-1 h-3.5 bg-emerald-500 rounded-r-full"
                                      />
                                    )}
                                    <child.icon
                                      size={14}
                                      className={
                                        isChildActive
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : "text-slate-400 group-hover:text-emerald-500 transition-colors"
                                      }
                                    />
                                    <span className="text-xs font-semibold tracking-tight">
                                      {child.label}
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

                // ── Regular link ──────────────────────────────────────────
                const isActive = active === link.name;
                return (
                  <div
                    key={link.name}
                    onClick={() => handleNavClick(link.name)}
                    className={`
                      flex items-center gap-3.5 px-6 py-2 cursor-pointer
                      transition-all relative group rounded-xl
                      ${isActive
                        ? "text-emerald-700 dark:text-white bg-emerald-50 dark:bg-white/10 shadow-sm dark:shadow-md"
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
                    <span className="text-sm font-semibold tracking-tight">{link.name}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="p-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/10 shrink-0">
          <div className="flex items-center gap-4 px-6 py-2 hover:text-emerald-600 dark:hover:text-white cursor-pointer group text-xs font-semibold transition-colors">
            <Star size={15} className="text-yellow-500 group-hover:text-yellow-400 transition-colors" />
            <span>Shortcuts</span>
          </div>
          <div className="flex items-center gap-4 px-6 py-2 hover:text-emerald-600 dark:hover:text-white cursor-pointer group text-xs font-semibold transition-colors">
            <HelpCircle size={15} className="text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-white transition-colors" />
            <span>Help Center</span>
          </div>
        </div>
      </motion.aside>
    </>
  );
}