"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Bell, Search, LogOut, User, Settings } from "lucide-react"

import { ThemeToggle } from "@/shared/components/theme-toggle"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"
import { useAuth } from "@/shared/lib/auth"
import { apiFetch } from "@/shared/lib/api/client"

export function Topnav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [notifications, setNotifications] = React.useState<any[]>([])

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch("/notifications")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err)
    }
  }

  React.useEffect(() => {
    if (user) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 10000)
      return () => clearInterval(interval)
    }
  }, [user])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await apiFetch(`/notifications/${id}/read`, { method: "PUT" })
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const res = await apiFetch("/notifications/read-all", { method: "PUT" })
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err)
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHr = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHr / 24)

    if (diffSec < 60) return "Just now"
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    return `${diffDays}d ago`
  }

  const getTitle = () => {
    if (pathname === "/") return "Dashboard"
    const path = pathname.split("/")[1]
    return path.charAt(0).toUpperCase() + path.slice(1)
  }

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?"

  return (
    <div className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border/40 bg-background/50 px-6 backdrop-blur-xl transition-all">
      <div className="flex flex-1 items-center gap-4">
        <h1 className="text-xl font-bold tracking-tight">{getTitle()}</h1>

        <div className="hidden md:flex relative ml-8 max-w-md flex-1 items-center">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search orders, customers..."
            className="w-full rounded-full bg-accent/30 pl-9 border-border/40 focus-visible:ring-primary/50 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full border-border/40 hover:bg-accent/50 relative">
              <Bell className="h-[1.2rem] w-[1.2rem] text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,240,255,0.8)] animate-pulse" />
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 glassmorphism border-border/40 max-h-96 overflow-y-auto" align="end">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead} 
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No notifications
              </div>
            ) : (
              <div className="py-1">
                {notifications.slice(0, 10).map((n) => (
                  <div 
                    key={n.id} 
                    onClick={() => !n.read && handleMarkAsRead(n.id)}
                    className={`px-4 py-2.5 flex items-start justify-between gap-2 hover:bg-accent/30 cursor-pointer transition-colors border-b border-border/10 last:border-0 ${!n.read ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs break-words ${!n.read ? 'text-white font-medium' : 'text-muted-foreground'}`}>
                        {n.message}
                      </p>
                      <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                    {!n.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="relative h-9 w-9 rounded-full ml-2 border border-primary/20 hover:border-primary/50 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-cyan-500/20 text-cyan-400 text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 glassmorphism border-border/40" align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal py-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-border/40" />
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <User className="w-4 h-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Settings className="w-4 h-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/40" />
              <DropdownMenuItem
                className="gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
                onClick={logout}
              >
                <LogOut className="w-4 h-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2 ml-2">
            <a href="/login" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-accent/50 transition-all">
              Login
            </a>
            <a href="/signup" className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:shadow-[0_0_20px_rgba(0,240,255,0.25)] transition-all">
              Sign Up
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
