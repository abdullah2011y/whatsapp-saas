"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"

import { Sidebar } from "../components/Sidebar"
import { Topnav } from "../components/Topnav"
import { SubscriptionBanner } from "@/shared/components/SubscriptionBanner"

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"]

export function DesktopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = AUTH_ROUTES.includes(pathname)

  // Auth pages: render fullscreen without sidebar/topnav
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-black overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background overflow-hidden selection:bg-primary/30">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 relative z-10 h-screen overflow-hidden">
        <Topnav />

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar">
          <SubscriptionBanner />
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
