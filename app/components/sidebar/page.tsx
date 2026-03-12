"use client";

import Image from "next/image";
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
} from "lucide-react";

const menuGroups = [
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
      { name: "Documents", icon: FileText },
    ],
  },
];

interface SidebarProps {
  active: string;
  setActive: (name: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({
  active,
  setActive,
  isOpen,
  setIsOpen,
}: SidebarProps) {
  const handleNavClick = (name: string) => {
    setActive(name);
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/*
        Overlay: z-[90] — above main content, below header (z-[100])
        Clicking it closes the sidebar on mobile/tablet
      */}
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

      {/*
        Sidebar: z-[95] — above overlay (z-[90]), below header (z-[100])
        On mobile/tablet: starts at top-16 (height of header) so it NEVER
        covers the hamburger button in the header.
        On desktop (lg+): starts at top-0 since the header is sticky and
        the layout uses ml-64 to push content — sidebar doesn't overlay header.
      */}
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
        {/* Logo — hidden on mobile since sidebar starts below header */}
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

        {/* Mobile top spacing to keep it clean */}
        <div className="lg:hidden h-4 shrink-0" />

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-4 mt-2 overflow-y-auto no-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              <h3 className="px-6 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-1.5">
                {group.title}
              </h3>

              {group.links.map((link) => {
                const isActive = active === link.name;
                return (
                  <div
                    key={link.name}
                    onClick={() => handleNavClick(link.name)}
                    className={`flex items-center gap-3.5 px-6 py-2 cursor-pointer transition-all relative group rounded-xl ${isActive
                        ? "text-emerald-700 dark:text-white bg-emerald-50 dark:bg-white/10 shadow-sm dark:shadow-md"
                        : "hover:text-emerald-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                      }`}
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

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/10 shrink-0">
          <div className="flex items-center gap-4 px-6 py-2 hover:text-emerald-600 dark:hover:text-white cursor-pointer group text-xs font-semibold transition-colors">
            <Star
              size={15}
              className="text-yellow-500 group-hover:text-yellow-400 transition-colors"
            />
            <span>Shortcuts</span>
          </div>
          <div className="flex items-center gap-4 px-6 py-2 hover:text-emerald-600 dark:hover:text-white cursor-pointer group text-xs font-semibold transition-colors">
            <HelpCircle
              size={15}
              className="text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-white transition-colors"
            />
            <span>Help Center</span>
          </div>
        </div>
      </motion.aside>
    </>
  );
}