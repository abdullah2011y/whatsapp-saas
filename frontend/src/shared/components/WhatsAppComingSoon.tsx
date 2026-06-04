"use client"

import * as React from "react"
import { Rocket, Clock, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"

export function WhatsAppComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
      <Card className="max-w-md w-full bg-black/40 backdrop-blur-md border border-border/40 p-8 shadow-2xl relative overflow-hidden rounded-2xl">
        {/* Background glow */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6">
          {/* Animated Rocket and Clock Icon Group */}
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Rocket className="w-10 h-10 animate-bounce" />
            <Clock className="absolute -bottom-1 -right-1 w-6 h-6 text-yellow-500 bg-black rounded-full p-0.5 border border-yellow-500/30" />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-cyan-400 font-heading font-semibold tracking-[0.2em] uppercase">
              WhatsApp Automation
            </p>
            <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase font-heading">
              Coming Soon
            </h1>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            This feature is currently under development and will be available in a future update.
          </p>

          <div className="w-full pt-4 border-t border-border/20">
            <Link href="/" passHref legacyBehavior>
              <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold gap-2 rounded-xl transition-all cursor-pointer">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
