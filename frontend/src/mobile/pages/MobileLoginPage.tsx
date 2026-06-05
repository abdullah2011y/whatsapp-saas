"use client"
import { API_BASE_URL } from "@/shared/config/api"

import { useState } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, Loader2, Zap, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/shared/lib/auth"
import { BrandLogo } from "@/shared/components/BrandLogo"

export default function MobileLoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Login failed")
      login(data.token, data.user)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col relative overflow-hidden">
      {/* Animated bg blobs */}
      <div className="absolute top-[-15%] left-[-20%] w-[300px] h-[300px] rounded-full bg-cyan-500/15 blur-[80px] animate-pulse" />
      <div className="absolute bottom-[20%] right-[-20%] w-[250px] h-[250px] rounded-full bg-cyan-400/10 blur-[70px] animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(0,240,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-14 pb-2">
        <div className="flex items-center gap-2.5">
          <Link href="/">
            <BrandLogo size="md" className="justify-start" />
          </Link>
        </div>
        <Link href="/signup" className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
          Sign up
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 relative z-10 flex flex-col justify-end px-6 pb-10">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white leading-tight">Welcome back</h1>
            <p className="text-gray-400 mt-2 text-base">Sign in to continue to your dashboard</p>
          </div>

          {/* Google */}
          <button className="w-full flex items-center justify-center gap-3 h-13 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-sm text-gray-300 font-medium active:bg-white/10 transition-all mb-5">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-600 font-medium">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</motion.div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full h-13 py-3.5 px-4 rounded-2xl bg-white/5 border border-white/10 text-white text-base placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/60 focus:shadow-[0_0_20px_rgba(0,240,255,0.12)] transition-all"
                placeholder="your@email.com" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                <Link href="/forgot-password" className="text-xs text-cyan-400">Forgot?</Link>
              </div>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full h-13 py-3.5 px-4 pr-12 rounded-2xl bg-white/5 border border-white/10 text-white text-base placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/60 focus:shadow-[0_0_20px_rgba(0,240,255,0.12)] transition-all"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <motion.button type="submit" disabled={isLoading}
              whileTap={{ scale: 0.97 }}
              className="w-full h-14 mt-2 rounded-2xl bg-cyan-500 active:bg-cyan-400 text-black font-bold text-base flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(0,240,255,0.35)] transition-all disabled:opacity-60">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Sign in</span><ArrowRight className="w-5 h-5" /></>}
            </motion.button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            No account?{" "}
            <Link href="/signup" className="text-cyan-400 font-semibold">Create one free →</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
