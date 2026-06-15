"use client"

import * as React from "react"
import { useAuth } from "@/shared/lib/auth"
import { LicenseRequired } from "./LicenseRequired"
import { motion } from "framer-motion"
import { BrandLogo } from "./BrandLogo"

interface LicenseGuardProps {
  children: React.ReactNode
}

export function LicenseGuard({ children }: LicenseGuardProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-transparent">
        <div className="flex flex-col items-center gap-6">
          <motion.div
            animate={{ 
              scale: [1, 1.03, 1],
              opacity: [0.7, 1, 0.7] 
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          >
            <BrandLogo size="md" />
          </motion.div>
          
          <div className="h-[2px] w-36 bg-white/5 rounded-full overflow-hidden relative">
            <motion.div 
              className="absolute inset-y-0 left-0 bg-cyan-500 shadow-[0_0_10px_rgba(0,240,255,1)]"
              animate={{ 
                width: ["0%", "100%", "0%"],
                left: ["0%", "0%", "100%"] 
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // 1. Super Admin has access to all pages and features
  if (user.role === "SUPERADMIN") {
    return <>{children}</>
  }

  // 2. Archive status locks premium features
  if (user.status === "ARCHIVED") {
    return <LicenseRequired />
  }

  // 3. Lifetime plan unlocks everything
  if (user.plan === "Lifetime") {
    return <>{children}</>
  }

  // 4. Check expiration date
  if (!user.expiresAt) {
    return <LicenseRequired />
  }

  const isExpired = new Date(user.expiresAt) < new Date()
  if (isExpired) {
    return <LicenseRequired />
  }

  return <>{children}</>
}
