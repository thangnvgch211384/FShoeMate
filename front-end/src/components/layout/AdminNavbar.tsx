import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  Ticket, 
  BarChart3,
  LogOut,
  Menu,
  X,
  Home,
  Settings
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Container } from "./Container"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const adminMenuItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: Package,
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: ShoppingBag,
  },
  {
    title: "Customers",
    href: "/admin/customers",
    icon: Users,
  },
  {
    title: "Vouchers",
    href: "/admin/vouchers",
    icon: Ticket,
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
  },
]

export function AdminNavbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  return (
    <nav className={cn(
      "sticky top-0 z-50 transition-all duration-300 border-b",
      isScrolled 
        ? "bg-background/95 backdrop-blur-xl border-border/50 shadow-elegant" 
        : "bg-background border-border"
    )}>
      <Container>
        <div className="flex items-center justify-between h-16">
          {/* Logo & Back to Home */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-glow transition-all duration-300 group-hover:shadow-primary/30 group-hover:scale-105">
                <span className="text-white font-bold text-xl">SF</span>
              </div>
              <span className="font-bold text-2xl gradient-text tracking-tight">ShoeFam</span>
            </Link>
            <div className="hidden lg:block h-6 w-px bg-border" />
            <Link 
              to="/" 
              className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              Back to Store
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {adminMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href || 
                (item.href !== "/admin" && location.pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-hero text-white shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              )
            })}
          </div>

          {/* User Menu & Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="hover:bg-primary/10 hover:scale-105 transition-all duration-200">
                    <div className="w-8 h-8 bg-gradient-hero rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {user.name?.charAt(0).toUpperCase() || "A"}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.name || "Admin"}</p>
                      <p className="text-xs text-muted-foreground">{user.email || ""}</p>
                      {user.role && (
                        <p className="text-xs text-primary font-semibold">
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Login</Link>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden hover:bg-primary/10 transition-all duration-200"
              onClick={() => setIsOpen(!isOpen)}
            >
              <div className="relative w-5 h-5">
                <Menu className={cn("h-5 w-5 absolute transition-all duration-300", isOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100")} />
                <X className={cn("h-5 w-5 absolute transition-all duration-300", isOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0")} />
              </div>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={cn(
          "lg:hidden overflow-hidden transition-all duration-500 ease-out border-t border-border/30",
          isOpen ? "max-h-96 py-4" : "max-h-0 py-0"
        )}>
          <div className="space-y-2">
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Home className="h-4 w-4" />
              Back to Store
            </Link>
            {adminMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href || 
                (item.href !== "/admin" && location.pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-hero text-white shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              )
            })}
          </div>
        </div>
      </Container>
    </nav>
  )
}

