"use client"
import { API_BASE_URL } from "@/shared/config/api"

import { useState } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, Loader2, Zap, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/shared/lib/auth"
import { BrandLogo } from "@/shared/components/BrandLogo"

export default function DesktopLoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
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
    <div className="min-h-screen bg-black flex overflow-hidden">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-cyan-400/5 blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(0,240,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10">
          <Link href="/">
            <BrandLogo size="lg" className="justify-start" />
          </Link>
        </div>

        <div className="relative z-10 space-y-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-5xl font-bold text-white leading-tight">
              Automate your<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200">
                WhatsApp sales
              </span>
            </h2>
            <p className="text-gray-400 mt-4 text-lg leading-relaxed max-w-md">
              Send order confirmations, track deliveries, and manage customers — all from one futuristic dashboard.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex items-center gap-6 pt-4">
            {[["4,291", "Messages sent"], ["98.5%", "Delivery rate"], ["2,350", "Orders tracked"]].map(([val, label]) => (
              <div key={label}>
                <div className="text-2xl font-bold text-cyan-400">{val}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-gray-600">© 2026 WhatsApp SaaS. Enterprise grade automation.</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 relative bg-[#050505]">
        <div className="absolute inset-0 bg-gradient-to-tl from-cyan-950/20 via-transparent to-transparent" />

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative w-full max-w-md"
        >
          {/* Glass card */}
          <div className="relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-[0_0_80px_rgba(0,240,255,0.05)]">
            {/* Glow ring */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-cyan-500/20 via-transparent to-transparent pointer-events-none" />

            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white">Welcome back</h1>
              <p className="text-gray-400 mt-1 text-sm">Sign in to your dashboard</p>
            </div>

            {/* Google SSO */}
            <button className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-white/10 bg-white/5 text-sm text-gray-300 font-medium hover:bg-white/10 hover:border-white/20 transition-all duration-200 mb-6">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-600 font-medium">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </motion.div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/8 focus:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-200"
                  placeholder="you@company.com"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Password</label>
                  <Link href="/forgot-password" className="text-xs text-cyan-500 hover:text-cyan-300 transition-colors">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full h-11 px-4 pr-11 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/8 focus:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button type="button" onClick={() => setRememberMe(!rememberMe)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 ${rememberMe ? "bg-cyan-500 border-cyan-500" : "border-white/20 bg-transparent"}`}>
                  {rememberMe && <div className="w-2 h-2 bg-black rounded-sm" />}
                </button>
                <span className="text-sm text-gray-400">Remember me for 30 days</span>
              </div>

              <motion.button
                type="submit" disabled={isLoading}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full h-11 mt-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,240,255,0.3)] hover:shadow-[0_0_40px_rgba(0,240,255,0.5)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Sign in</span><ArrowRight className="w-4 h-4" /></>}
              </motion.button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{" "}
              <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">Create one free</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
