"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { BrandLogo } from "../components/BrandLogo"
import { motion } from "framer-motion"
import { useAuth } from "./auth"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-8">
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.7, 1, 0.7] 
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          >
            <BrandLogo size="lg" />
          </motion.div>
          
          <div className="flex flex-col items-center gap-4">
            <div className="h-[2px] w-48 bg-white/5 rounded-full overflow-hidden relative">
              <motion.div 
                className="absolute inset-y-0 left-0 bg-cyan-500 shadow-[0_0_15px_rgba(0,240,255,1)]"
                animate={{ 
                  width: ["0%", "100%", "0%"],
                  left: ["0%", "0%", "100%"] 
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              />
            </div>
            <p className="text-[10px] text-cyan-500/40 tracking-[0.3em] uppercase font-heading animate-pulse">
              Syncing Protocol
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
