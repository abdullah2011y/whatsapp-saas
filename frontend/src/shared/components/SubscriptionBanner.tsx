"use client"

import * as React from "react"
import { useAuth } from "@/shared/lib/auth"
import { AlertTriangle, Clock, ShieldAlert } from "lucide-react"
import { motion } from "framer-motion"

export function SubscriptionBanner() {
  const { user } = useAuth()

  if (!user || user.role === "SUPERADMIN" || user.plan === "Lifetime" || !user.expiresAt) {
    return null
  }

  const expiresAt = new Date(user.expiresAt)
  const now = new Date()
  
  // Calculate difference in days
  const diffTime = expiresAt.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24))

  // Expiration banner check
  if (diffDays < 0) {
    const daysSinceExpiry = -diffDays
    
    // Day 7+ is active suspension (Inactive/Archived)
    if (user.status === "INACTIVE" || user.status === "ARCHIVED" || daysSinceExpiry > 7) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3 shadow-[0_0_15px_rgba(239,68,68,0.05)] backdrop-blur-sm"
        >
          <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse flex-shrink-0" />
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-white">Subscription expired.</span>{" "}
              <span className="text-muted-foreground">Renew to restore premium features.</span>
            </div>
            <a
              href="/settings"
              className="text-xs font-semibold px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300 transition-all text-center"
            >
              Renew Now
            </a>
          </div>
        </motion.div>
      )
    }

    // Days 0-7: Grace period countdown
    const graceRemaining = 7 - Math.floor(daysSinceExpiry)
    const daysRemaining = Math.max(1, graceRemaining)

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full mb-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-center gap-3 shadow-[0_0_15px_rgba(245,158,11,0.05)] backdrop-blur-sm"
      >
        <Clock className="w-5 h-5 text-amber-400 animate-bounce flex-shrink-0" />
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-white">Subscription expired.</span>{" "}
            <span className="text-amber-300/95 font-medium">{daysRemaining} Day{daysRemaining > 1 ? "s" : ""} Remaining Before Account Suspension.</span>{" "}
            <span className="text-xs text-muted-foreground block sm:inline">Renew now to restore premium features.</span>
          </div>
          <a
            href="/settings"
            className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 transition-all text-center"
          >
            Renew Now
          </a>
        </div>
      </motion.div>
    )
  }

  // Pre-expiry warning (Within 7 days before expiration)
  if (diffDays >= 0 && diffDays <= 7) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full mb-4 px-4 py-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 text-sm flex items-center gap-3 shadow-[0_0_15px_rgba(6,182,212,0.05)] backdrop-blur-sm"
      >
        <AlertTriangle className="w-5 h-5 text-cyan-400 animate-pulse flex-shrink-0" />
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-white">Subscription expiring soon.</span>{" "}
            <span className="text-cyan-300 font-medium">Your subscription will expire in {diffDays} day{diffDays !== 1 ? "s" : ""}.</span>{" "}
            <span className="text-xs text-muted-foreground block sm:inline">Renew now to avoid service interruption.</span>
          </div>
          <a
            href="/settings"
            className="text-xs font-semibold px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300 transition-all text-center"
          >
            Renew Now
          </a>
        </div>
      </motion.div>
    )
  }

  return null
}
