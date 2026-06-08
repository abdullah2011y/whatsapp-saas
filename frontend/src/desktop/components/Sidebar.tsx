"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingCart,
  MessageCircle,
  LineChart,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lock,
  LucideIcon
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { WHATSAPP_MODULE_ENABLED } from "@/shared/config/features"
import { BrandLogo } from "@/shared/components/BrandLogo"

interface SidebarSubItem {
  name: string
  href: string
}

interface SidebarNavigationItem {
  name: string
  href: string
  icon: LucideIcon
  isComingSoon?: boolean
  children?: SidebarSubItem[]
}

const navigation: SidebarNavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  {
    name: 'WhatsApp',
    href: '/whatsapp/overview',
    icon: MessageCircle,
    children: [
      { name: 'Overview', href: '/whatsapp/overview' },
      { name: 'Meta API', href: '/whatsapp/meta-api' },
      { name: 'WhatsApp Web QR', href: '/whatsapp/qr' },
      { name: 'Templates', href: '/whatsapp/templates' },
      { name: 'Automations', href: '/whatsapp/automations' },
      { name: 'Sessions', href: '/whatsapp/sessions' },
      { name: 'Settings', href: '/whatsapp/settings' },
    ]
  },
  { name: 'Analytics', href: '/analytics', icon: LineChart },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)
  const [whatsappOpen, setWhatsappOpen] = React.useState(true)

  // Auto-expand WhatsApp menu if we are currently on a WhatsApp sub-page
  React.useEffect(() => {
    if (pathname.startsWith("/whatsapp")) {
      setWhatsappOpen(true)
    }
  }, [pathname])

  const navItems = React.useMemo(() => {
    return navigation.map(item => {
      if (item.name === 'WhatsApp' && !WHATSAPP_MODULE_ENABLED) {
        return {
          ...item,
          name: 'WhatsApp (Soon)',
          icon: Lock,
          isComingSoon: true,
          children: undefined
        }
      }
      return item
    })
  }, [])

  return (
    <div
      className={cn(
        "relative flex flex-col h-screen border-r border-border/40 bg-background/50 backdrop-blur-xl transition-all duration-300 z-20",
        collapsed ? "w-[80px]" : "w-[240px]"
      )}
    >
      <div className="flex h-20 items-center justify-center px-4 border-b border-border/40">
        {!collapsed ? (
          <Link href="/" className="flex items-center justify-center py-4">
            <BrandLogo size="lg" />
          </Link>
        ) : (
          <Link href="/" className="mx-auto flex items-center justify-center">
            <BrandLogo size="sm" />
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 no-scrollbar space-y-1">
        {navItems.map((item) => {
          const isWhatsAppParent = item.name.startsWith("WhatsApp")
          const isDirectActive = pathname === item.href
          
          // Parent WhatsApp is considered active if any of its sub-routes is active
          const isParentActive = isWhatsAppParent 
            ? pathname.startsWith("/whatsapp") 
            : isDirectActive

          if (isWhatsAppParent && item.children && !collapsed) {
            return (
              <div key={item.name} className="space-y-1">
                <button
                  onClick={() => setWhatsappOpen(!whatsappOpen)}
                  className={cn(
                    "w-full group relative flex items-center justify-between rounded-lg px-3 py-2.5 transition-all duration-200 text-left cursor-pointer",
                    isParentActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  {isParentActive && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-primary rounded-r-full shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
                  )}
                  <div className="flex items-center gap-3">
                    <item.icon className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                      isParentActive ? "text-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" : ""
                    )} />
                    <span className="font-medium truncate">{item.name}</span>
                  </div>
                  {whatsappOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {whatsappOpen && (
                  <div className="relative pl-6 space-y-1 mt-1">
                    {/* Left vertical timeline line */}
                    <div className="absolute left-[21px] top-0 bottom-2 w-px bg-border/40" />

                    {item.children.map((child) => {
                      const isChildActive = pathname === child.href
                      return (
                        <Link key={child.name} href={child.href}>
                          <div className={cn(
                            "group flex items-center pl-6 pr-3 py-2 rounded-md text-xs font-medium transition-all duration-200 relative",
                            isChildActive 
                              ? "text-cyan-400 bg-cyan-950/15" 
                              : "text-muted-foreground hover:text-white hover:bg-accent/30"
                          )}>
                            {/* Connector dot */}
                            <div className={cn(
                              "absolute left-[-2px] w-1.5 h-1.5 rounded-full border bg-[#0b141a] transition-all",
                              isChildActive 
                                ? "border-cyan-400 bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.8)] scale-110" 
                                : "border-border/60 group-hover:border-white"
                            )} />
                            {child.name}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 overflow-hidden",
                  isParentActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  collapsed ? "justify-center px-0" : "",
                  item.isComingSoon ? "opacity-60 cursor-pointer" : ""
                )}
              >
                {isParentActive && (
                  <div className="absolute left-0 top-0 h-full w-1 bg-primary rounded-r-full shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
                )}
                <item.icon className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                  isParentActive ? "text-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" : ""
                )} />
                {!collapsed && (
                  <span className="font-medium truncate">{item.name}</span>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      <div className="p-4 border-t border-border/40">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="mx-auto flex w-full justify-center hover:bg-accent/50 hover:text-primary transition-colors"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  )
}
