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
  Zap,
  Lock
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { WHATSAPP_MODULE_ENABLED } from "@/shared/config/features"

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
  { name: 'Analytics', href: '/analytics', icon: LineChart },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
]

import { BrandLogo } from "@/shared/components/BrandLogo"

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

  // Feature Flag: Customize WhatsApp menu item if disabled
  const navItems = React.useMemo(() => {
    return navigation.map(item => {
      if (item.name === 'WhatsApp' && !WHATSAPP_MODULE_ENABLED) {
        return {
          ...item,
          name: 'WhatsApp (Soon)',
          icon: Lock,
          isComingSoon: true,
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
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 overflow-hidden",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  collapsed ? "justify-center px-0" : "",
                  item.isComingSoon ? "opacity-60 cursor-pointer" : ""
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 h-full w-1 bg-primary rounded-r-full shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
                )}
                <item.icon className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                  isActive ? "text-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" : ""
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
