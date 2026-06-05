"use client"
import { API_BASE_URL } from "@/shared/config/api"

import { useState } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, Loader2, Zap, ArrowRight, Check } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/shared/lib/auth"
import { BrandLogo } from "@/shared/components/BrandLogo"

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map: Record<number, { label: string; color: string }> = {
    0: { label: "Too weak", color: "bg-red-500" },
    1: { label: "Weak", color: "bg-orange-500" },
    2: { label: "Fair", color: "bg-yellow-500" },
    3: { label: "Good", color: "bg-cyan-400" },
    4: { label: "Strong 💪", color: "bg-green-500" },
  }
  return { score, ...map[score] }
}

export default function MobileSignupPage() {
  const { login } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const strength = getStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords do not match"); return }
    setError("")
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Signup failed")
      login(data.token, data.user)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col relative overflow-hidden">
      <div className="absolute top-[-15%] right-[-20%] w-[300px] h-[300px] rounded-full bg-cyan-500/15 blur-[80px] animate-pulse" />
      <div className="absolute bottom-[10%] left-[-20%] w-[250px] h-[250px] rounded-full bg-cyan-400/10 blur-[70px] animate-pulse" style={{ animationDelay: "0.8s" }} />
      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(0,240,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-14 pb-2">
        <div className="flex items-center gap-2.5">
          <Link href="/">
            <BrandLogo size="md" className="justify-start" />
          </Link>
        </div>
        <Link href="/login" className="text-sm font-medium text-cyan-400 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
          Sign in
        </Link>
      </div>

      <div className="flex-1 relative z-10 flex flex-col justify-end px-6 pb-10 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-0">
          <div className="mb-6 mt-8">
            <h1 className="text-3xl font-bold text-white">Create account</h1>
            <p className="text-gray-400 mt-2 text-base">Free 14-day trial, no card needed.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</motion.div>
            )}

            {[
              { label: "Full Name", value: name, setter: setName, type: "text", placeholder: "John Doe" },
              { label: "Email", value: email, setter: setEmail, type: "email", placeholder: "your@email.com" },
            ].map(({ label, value, setter, type, placeholder }) => (
              <div key={label} className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
                <input type={type} value={value} onChange={e => setter(e.target.value)} required
                  className="w-full py-3.5 px-4 rounded-2xl bg-white/5 border border-white/10 text-white text-base placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/60 focus:shadow-[0_0_20px_rgba(0,240,255,0.12)] transition-all"
                  placeholder={placeholder} />
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full py-3.5 px-4 pr-12 rounded-2xl bg-white/5 border border-white/10 text-white text-base placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/60 focus:shadow-[0_0_20px_rgba(0,240,255,0.12)] transition-all"
                  placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : "bg-white/10"}`} />
                    ))}
                  </div>
                  <p className="text-xs font-medium text-gray-400">{strength.label}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                className={`w-full py-3.5 px-4 rounded-2xl bg-white/5 border text-white text-base placeholder:text-gray-600 focus:outline-none transition-all ${confirm && password !== confirm ? "border-red-500/50" : confirm && password === confirm ? "border-green-500/50" : "border-white/10 focus:border-cyan-500/60"}`}
                placeholder="Repeat password" />
              {confirm && password === confirm && (
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs text-green-400">Passwords match</span>
                </div>
              )}
            </div>

            <motion.button type="submit" disabled={isLoading}
              whileTap={{ scale: 0.97 }}
              className="w-full h-14 mt-2 rounded-2xl bg-cyan-500 active:bg-cyan-400 text-black font-bold text-base flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(0,240,255,0.35)] transition-all disabled:opacity-60">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Create account</span><ArrowRight className="w-5 h-5" /></>}
            </motion.button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have one?{" "}
            <Link href="/login" className="text-cyan-400 font-semibold">Sign in →</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
