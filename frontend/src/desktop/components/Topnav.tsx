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

export function Topnav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

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
        <Button variant="outline" size="icon" className="rounded-full border-border/40 hover:bg-accent/50 relative">
          <Bell className="h-[1.2rem] w-[1.2rem] text-muted-foreground" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
          <span className="sr-only">Notifications</span>
        </Button>

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
