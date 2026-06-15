"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Home, ShoppingCart, MessageCircle, BarChart3, Users, Lock, Sliders, Activity, FileText, LucideIcon } from "lucide-react"
import { WHATSAPP_MODULE_ENABLED } from "@/shared/config/features"
import * as React from "react"
import { useAuth } from "@/shared/lib/auth"

interface MobileTabItem {
  name: string
  href: string
  icon: LucideIcon
  isFab?: boolean
  isComingSoon?: boolean
}

const tenantTabs: MobileTabItem[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "WhatsApp", href: "/whatsapp/overview", icon: MessageCircle, isFab: true },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Customers", href: "/customers", icon: Users },
]

const superAdminTabs: MobileTabItem[] = [
  { name: "Global", href: "/admin?tab=overview", icon: Home },
  { name: "Users", href: "/admin?tab=users", icon: Users },
  { name: "Plans", href: "/admin?tab=plans", icon: Sliders },
  { name: "Health", href: "/admin?tab=health", icon: Activity },
  { name: "Logs", href: "/admin?tab=logs", icon: FileText }
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const currentTab = searchParams.get("tab") || "overview"

  // Feature Flag: Customize WhatsApp bottom tab if disabled
  const transformedTabs = React.useMemo(() => {
    if (user?.role === "SUPERADMIN") {
      return superAdminTabs
    }

    return tenantTabs.map(tab => {
      if (tab.name === "WhatsApp" && !WHATSAPP_MODULE_ENABLED) {
        return {
          ...tab,
          name: "Soon",
          icon: Lock,
          isComingSoon: true,
        }
      }
      return tab
    })
  }, [user])

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-lg border-t border-white/10 z-50 px-6 pb-safe">
      <div className="flex items-center justify-between h-full max-w-md mx-auto">
        {transformedTabs.map((tab) => {
          const isActive = tab.href.includes("?")
            ? pathname === tab.href.split("?")[0] && currentTab === new URLSearchParams(tab.href.split("?")[1]).get("tab")
            : pathname === tab.href
          
          if (tab.isFab) {
            return (
              <div key={tab.href} className="relative -top-6">
                <Link href={tab.href}>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${isActive ? 'bg-cyan-500 text-black shadow-cyan-500/50' : 'bg-gray-800 text-white'} ${tab.isComingSoon ? 'opacity-70 border border-yellow-500/20' : ''}`}>
                    <tab.icon className="w-6 h-6" />
                  </div>
                </Link>
              </div>
            )
          }

          return (
            <Link key={tab.href} href={tab.href} className={`flex flex-col items-center justify-center w-12 gap-1 active:scale-95 transition-transform ${tab.isComingSoon ? 'opacity-65' : ''}`}>
              <tab.icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`} />
              <span className={`text-[10px] font-heading font-medium tracking-widest ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}>
                {tab.name}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
