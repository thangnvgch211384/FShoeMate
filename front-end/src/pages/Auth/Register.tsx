import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { register } from "@/lib/api"
import { setToken } from "@/lib/auth"
import { useCart } from "@/contexts/CartContext"
import { useAuth } from "@/contexts/AuthContext"

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    newsletter: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const navigate = useNavigate()
  const { refreshCart } = useCart()
  const { login: setAuthUser, refreshUser } = useAuth()

  const validatePhone = (phone: string): string | null => {
    if (!phone || phone.trim() === "") {
      return null // Phone is optional, no error if empty
    }
    // Format: phone number (10-11 digits, can start with 0)
    const phoneRegex = /^[0-9]{10,11}$/
    const cleanPhone = phone.replace(/\s+/g, "") // Remove spaces
    if (!phoneRegex.test(cleanPhone)) {
      return "Invalid phone number. Example: 0901234567"
    }
    return null
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Real-time validation for phone
    if (field === "phone" && typeof value === "string") {
      const phoneError = validatePhone(value)
      if (phoneError) {
        setFieldErrors(prev => ({ ...prev, phone: phoneError }))
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors.phone
          return newErrors
        })
      }
    } else {
      // Clear field error when user starts typing (for other fields)
      if (fieldErrors[field]) {
        setFieldErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[field]
          return newErrors
        })
      }
    }
    
    // Clear general error when user starts typing
    if (error) {
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({ confirmPassword: "Password does not match" })
      return
    }

    if (!formData.acceptTerms) {
      setError("Please agree to the terms of service")
      return
    }

    // Password validation 
    if (formData.password.length < 6) {
      setFieldErrors({ password: "Password must be at least 6 characters" })
      return
    }

    // Phone validation (reuse validatePhone function)
    const phoneError = validatePhone(formData.phone)
    if (phoneError) {
      setFieldErrors({ phone: phoneError })
      return
    }
    
    setIsLoading(true)
    
    try {
      const data = await register(formData.fullName, formData.email, formData.password, formData.phone)
      if (data.token && data.user) {
        setToken(data.token)
        const userData: any = {
          id: data.user.id || data.user._id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role
        }
        
        if (data.user.role === "customer") {
          userData.membershipLevel = data.user.membershipLevel
          userData.loyaltyPoints = data.user.loyaltyPoints
        }
        
        setAuthUser(userData)
        await refreshCart()
        await refreshUser()
        
        navigate("/")
      } else {
        setError("Registration failed. Please try again.")
      }
    } catch (err: any) {
      let errorMessage = err.message || "Registration failed"
      
      try {
        const errorText = err.message
        if (errorText && errorText.trim().startsWith("{")) {
          const parsed = JSON.parse(errorText)
          if (parsed.errors && Array.isArray(parsed.errors)) {
            const newFieldErrors: Record<string, string> = {}
            parsed.errors.forEach((validationErr: any) => {
              const field = validationErr.param || validationErr.path
              if (field === "name") {
                newFieldErrors.fullName = "Full name is required"
              } else if (field === "email") {
                newFieldErrors.email = validationErr.msg || "Email is invalid"
              } else if (field === "password") {
                newFieldErrors.password = validationErr.msg || "Password must be at least 6 characters"
              }
            })
            if (Object.keys(newFieldErrors).length > 0) {
              setFieldErrors(newFieldErrors)
              return
            }
          }
        }
      } catch {
      }

      if (errorMessage.includes("already exists") || errorMessage.includes("Email already exists")) {
        setFieldErrors({ email: "Email already exists. Please choose a different email." })
      } else if (errorMessage.includes("validation") || errorMessage.includes("required")) {
        setError("Please fill in all information")
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <Container className="py-16">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">
              Create new account
            </h1>
            <p className="text-muted-foreground">
              Join the ShoeFam community to receive exclusive benefits and track your orders
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-8 shadow-medium">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && !Object.keys(fieldErrors).length && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    placeholder="Enter your full name"
                    className={cn(
                      "w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none transition-colors",
                      fieldErrors.fullName 
                        ? "border-destructive focus:border-destructive" 
                        : "border-border focus:border-primary"
                    )}
                    required
                  />
                </div>
                {fieldErrors.fullName && (
                  <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Enter your email"
                    className={cn(
                      "w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none transition-colors",
                      fieldErrors.email 
                        ? "border-destructive focus:border-destructive" 
                        : "border-border focus:border-primary"
                    )}
                    required
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-destructive">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Enter your phone number"
                    className={cn(
                      "w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none transition-colors",
                      fieldErrors.phone 
                        ? "border-destructive focus:border-destructive" 
                        : "border-border focus:border-primary"
                    )}
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="text-xs text-destructive">{fieldErrors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    placeholder="Enter your password"
                    className={cn(
                      "w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none transition-colors",
                      fieldErrors.password 
                        ? "border-destructive focus:border-destructive" 
                        : "border-border focus:border-primary"
                    )}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-destructive">{fieldErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    placeholder="Enter your password again"
                    className={cn(
                      "w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none transition-colors",
                      fieldErrors.confirmPassword 
                        ? "border-destructive focus:border-destructive" 
                        : "border-border focus:border-primary"
                    )}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
                )}
                {!fieldErrors.confirmPassword && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-destructive">Password does not match</p>
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={(e) => handleInputChange("acceptTerms", e.target.checked)}
                    className="mt-1 rounded border-border"
                    required
                  />
                  <span className="text-sm">
                    I agree to the{" "}
                    <Link to="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </span>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.newsletter}
                    onChange={(e) => handleInputChange("newsletter", e.target.checked)}
                    className="mt-1 rounded border-border"
                  />
                  <span className="text-sm text-muted-foreground">
                    I want to receive information about new products and special offers
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isLoading || !formData.acceptTerms}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating account...
                  </div>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="text-primary hover:underline font-medium">
                Login now
              </Link>
            </div>
          </div>
        </div>
      </Container>

      <Footer />
    </div>
  )
}