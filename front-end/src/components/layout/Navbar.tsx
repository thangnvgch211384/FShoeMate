import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Search, ShoppingBag, User, Menu, X, Heart, LogOut, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Container } from "./Container"
import { useCart } from "@/contexts/CartContext"
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
import { Badge } from "@/components/ui/badge"
import { getWishlist } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

const navItems = [
  {
    title: "All Shoes",
    href: "/products",
  },
  { title: "Men", href: "/men" },
  { title: "Women", href: "/women" },
  { title: "Kids", href: "/kids" }
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [wishlistCount, setWishlistCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const navigate = useNavigate()
  const { state } = useCart()
  const { user, isAuthenticated, logout } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadWishlistCount()
      
      const interval = setInterval(() => {
        loadWishlistCount()
      }, 30000)
      
      const handleWishlistUpdate = () => {
        loadWishlistCount()
      }
      window.addEventListener('wishlistUpdated', handleWishlistUpdate)
      
      return () => {
        clearInterval(interval)
        window.removeEventListener('wishlistUpdated', handleWishlistUpdate)
      }
    } else {
      setWishlistCount(0)
    }
  }, [isAuthenticated])

  const loadWishlistCount = async () => {
    try {
      const response = await getWishlist()
      setWishlistCount(response.count || response.wishlist?.length || 0)
    } catch (error) {
      console.error("Failed to load wishlist count:", error)
      setWishlistCount(0)
    }
  }


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery("")
      setIsSearchFocused(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(e)
    }
  }

  return (
    <nav className={cn(
      "sticky top-0 z-50 transition-all duration-300",
      isScrolled 
        ? "bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-elegant" 
        : "bg-background/80 backdrop-blur-md border-b border-transparent"
    )}>
      <Container>
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-glow transition-all duration-300 group-hover:shadow-primary/30 group-hover:scale-105">
              <span className="text-white font-bold text-xl">SF</span>
            </div>
            <span className="font-bold text-2xl gradient-text tracking-tight">ShoeFam</span>
          </a>

          <div className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <div
                key={item.title}
                className="relative"
                onMouseEnter={() => setActiveMenu(item.title)}
                onMouseLeave={() => setActiveMenu(null)}
              >
                <a
                  href={item.href}
                  className="text-foreground hover:text-primary font-semibold transition-all duration-300 relative group px-3 py-2 rounded-lg hover:bg-primary/5"
                >
                  {item.title}
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 bg-gradient-hero transform scale-x-0 transition-all duration-300 group-hover:scale-x-100 rounded-full" />
                </a>

              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
            <form 
              onSubmit={handleSearch}
              className={cn(
                "hidden md:flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 border transition-all duration-200",
                isSearchFocused 
                  ? "border-primary shadow-lg shadow-primary/10 w-64 lg:w-80" 
                  : "border-border/20 w-48 lg:w-64"
              )}
            >
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSearchQuery("")}
                  className="h-5 w-5 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </form>
            
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="md:hidden hover:bg-primary/10 hover:scale-105 transition-all duration-200"
              onClick={() => navigate("/search")}
            >
              <Search className="h-5 w-5" />
            </Button>
            {isAuthenticated && (
              <Button asChild variant="ghost" size="icon-sm" className="relative group hover:bg-pink-500/10 hover:scale-105 transition-all duration-200">
              <a href="/wishlist" className="relative">
                  <Heart className="h-5 w-5 text-muted-foreground group-hover:text-pink-500 transition-colors duration-200" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-pink-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center border-2 border-white">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
                  )}
              </a>
            </Button>
            )}
            <Button asChild variant="ghost" size="icon-sm" className="relative hover:bg-primary/10 hover:scale-105 transition-all duration-200">
              <a href="/cart">
                <ShoppingBag className="h-5 w-5" />
                {state.itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-black text-white text-[10px] font-semibold rounded-full flex items-center justify-center border-2 border-white">
                    {state.itemCount > 99 ? '99+' : state.itemCount}
                  </span>
                )}
              </a>
            </Button>
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="hover:bg-primary/10 hover:scale-105 transition-all duration-200">
                    <div className="w-8 h-8 bg-gradient-hero rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      {user.role === "customer" && user.membershipLevel && (
                        <p className="text-xs text-primary font-semibold">
                          {user.membershipLevel.charAt(0).toUpperCase() + user.membershipLevel.slice(1)} Member
                        </p>
                      )}
                      {user.role === "admin" && (
                        <p className="text-xs text-primary font-semibold">
                          Administrator
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>

                    <Link to={user.role === "admin" ? "/admin/profile" : "/profile"} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>

                  {user.role === "customer" && (
                    <DropdownMenuItem asChild>
                      <Link to="/orders" className="cursor-pointer">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Orders
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {user.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/dashboard" className="cursor-pointer">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
            <Button asChild variant="ghost" size="icon-sm" className="hover:bg-primary/10 hover:scale-105 transition-all duration-200">
                <Link to="/login">
                
                <User className="h-5 w-5" />
                </Link>
            </Button>
            )}

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

        <div className={cn(
          "lg:hidden overflow-hidden transition-all duration-500 ease-out border-t border-border/30",
          isOpen ? "max-h-96 py-6" : "max-h-0 py-0"
        )}>
          <div className="space-y-4 animate-fade-in">
            {navItems.map((item, index) => (
              <a
                key={item.title}
                href={item.href}
                className="block text-foreground hover:text-primary font-semibold transition-all duration-300 px-4 py-3 rounded-xl hover:bg-primary/5 transform hover:translate-x-2"
                onClick={() => setIsOpen(false)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {item.title}
              </a>
            ))}
          </div>
        </div>
      </Container>
    </nav>
  )
}