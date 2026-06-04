"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { MobileBottomNav } from "./MobileBottomNav"
import Link from "next/link"

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"]

import { BrandLogo } from "@/shared/components/BrandLogo"

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = AUTH_ROUTES.includes(pathname)

  // Auth pages: fullscreen, no bottom nav
  if (isAuthPage) {
    return (
      <div className="min-h-[100dvh] bg-black overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white overflow-hidden selection:bg-cyan-500/30">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      {/* Mobile Top Navbar */}
      <header className="relative z-20 h-16 flex items-center justify-between px-6 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <Link href="/" className="flex items-center">
          <BrandLogo size="md" />
        </Link>
        <div className="flex items-center gap-3">
          {/* Mobile Profile Icon Placeholder */}
          <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main scrollable area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <MobileBottomNav />
    </div>
  )
}
