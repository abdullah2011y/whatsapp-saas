"use client"

import dynamic from "next/dynamic"
import { useAuth } from "@/shared/lib/auth"
import { useRouter } from "next/navigation"
import * as React from "react"
import { motion } from "framer-motion"
import { BrandLogo } from "@/shared/components/BrandLogo"

const AdminDashboardPage = dynamic(() => import("@/desktop/pages/AdminDashboardPage"), { ssr: false })
const ProtectedRoute = dynamic(() => import("@/shared/lib/ProtectedRoute").then(m => m.ProtectedRoute), { ssr: false })

export default function Page() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!isLoading && user && user.role !== "SUPERADMIN") {
      router.replace("/")
    }
  }, [user, isLoading, router])

  if (isLoading || !user || user.role !== "SUPERADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-6">
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.7, 1, 0.7] 
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <BrandLogo size="lg" />
          </motion.div>
          <div className="h-[2px] w-48 bg-white/5 rounded-full overflow-hidden relative">
            <motion.div 
              className="absolute inset-y-0 left-0 bg-cyan-500 shadow-[0_0_15px_rgba(0,240,255,1)]"
              animate={{ 
                width: ["0%", "100%", "0%"],
                left: ["0%", "0%", "100%"] 
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <p className="text-[10px] text-cyan-500/40 tracking-[0.3em] uppercase font-heading animate-pulse">
            Authorizing Admin Credentials
          </p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <React.Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-black">
          <div className="text-cyan-500 text-xs animate-pulse font-mono">Loading Control Center...</div>
        </div>
      }>
        <AdminDashboardPage />
      </React.Suspense>
    </ProtectedRoute>
  )
}
