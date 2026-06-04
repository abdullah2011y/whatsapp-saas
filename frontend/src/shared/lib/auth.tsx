"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token")
      if (storedToken) {
        try {
          const res = await fetch("http://localhost:5000/auth/me", {
            headers: { Authorization: `Bearer ${storedToken}` }
          })
          if (res.ok) {
            const data = await res.json()
            setUser(data.user)
            setToken(storedToken)
          } else {
            localStorage.removeItem("token")
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
    router.push("/")
  }

  const logout = () => {
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
