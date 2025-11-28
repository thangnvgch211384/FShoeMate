import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { getToken, removeToken as removeTokenStorage } from "@/lib/auth"
import { getProfile } from "@/lib/api"

interface User {
  id: string
  name: string
  email: string
  role?: string
  membershipLevel?: string
  loyaltyPoints?: number
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (userData: User) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const response = await getProfile()
      if (response?.user) {
        const userData: User = {
          id: response.user._id || response.user.id,
          name: response.user.name,
          email: response.user.email,
          role: response.user.role
        }
        
        // Only include membershipLevel and loyaltyPoints for customers
        if (response.user.role === "customer") {
          userData.membershipLevel = response.user.membershipLevel
          userData.loyaltyPoints = response.user.loyaltyPoints
        }
        
        setUser(userData)
      }
    } catch (error) {
      console.error("Failed to load user:", error)
      setUser(null)
      removeTokenStorage()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  const login = (userData: User) => {
    setUser(userData)
  }

  const logout = () => {
    removeTokenStorage()
    setUser(null)
    window.location.href = "/login"
  }

  const refreshUser = async () => {
    await loadUser()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

