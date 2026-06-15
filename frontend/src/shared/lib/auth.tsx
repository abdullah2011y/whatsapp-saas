"use client"
import { API_BASE_URL } from "@/shared/config/api"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name: string
  email: string
  role?: string
  status?: string
  plan?: string
  licenseKey?: string | null
  expiresAt?: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  impersonate: (targetToken: string, targetUser: User) => void
  stopImpersonate: () => void
  isImpersonating: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  impersonate: () => {},
  stopImpersonate: () => {},
  isImpersonating: false
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token")
      const adminToken = localStorage.getItem("admin_token")
      setIsImpersonating(!!adminToken)

      if (storedToken) {
        try {
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          })
          if (res.ok) {
            const data = await res.json()
            console.log("AUTH_ME_RESPONSE", data);
            setUser(data.user)
            setToken(storedToken)
            console.log("CURRENT_USER", data.user);
            console.log("CURRENT_ROLE", data.user?.role);
          } else {
            localStorage.removeItem("token")
            localStorage.removeItem("admin_token")
            setIsImpersonating(false)
          }
        } catch (error) {
          console.error("Auth init error:", error)
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("token", newToken)
    setToken(newToken)
    setUser(newUser)
    console.log("CURRENT_USER", newUser);
    console.log("CURRENT_ROLE", newUser?.role);
    router.push("/")
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("admin_token")
    setToken(null)
    setUser(null)
    setIsImpersonating(false)
    router.push("/login")
  }

  const impersonate = (targetToken: string, targetUser: User) => {
    const currentToken = localStorage.getItem("token")
    if (currentToken) {
      localStorage.setItem("admin_token", currentToken)
    }
    localStorage.setItem("token", targetToken)
    setToken(targetToken)
    setUser(targetUser)
    setIsImpersonating(true)
    router.push("/")
  }

  const stopImpersonate = async () => {
    const adminToken = localStorage.getItem("admin_token")
    if (!adminToken) return

    localStorage.setItem("token", adminToken)
    localStorage.removeItem("admin_token")
    setToken(adminToken)
    setIsImpersonating(false)

    try {
      setIsLoading(true)
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        router.push("/admin")
      } else {
        logout()
      }
    } catch (err) {
      console.error("Failed to restore admin session:", err)
      logout()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, impersonate, stopImpersonate, isImpersonating }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
