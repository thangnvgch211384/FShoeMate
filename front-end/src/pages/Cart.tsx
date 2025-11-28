import { Link, useNavigate } from "react-router-dom"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/CartContext"
import { useAuth } from "@/contexts/AuthContext"
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Cart() {
  const { state, updateQuantity, removeFromCart, loading } = useCart()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const subtotal = state.total
  const shipping = subtotal > 500000 ? 0 : 30000
  const finalTotal = subtotal + shipping

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading cart...</p>
      </div>
    )
  } 

  if (state.items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <Container className="py-16">
          <div className="text-center max-w-md mx-auto">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
            <p className="text-muted-foreground mb-8">
              You don't have any products in your cart. Start shopping to fill it up.
            </p>
            <Button asChild variant="hero" size="lg">
              <Link to="/products">
                Shop now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </Container>

        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="py-12 bg-gradient-to-r from-muted/50 to-muted/20">
        <Container>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Your cart
            </h1>
            <p className="text-lg text-muted-foreground">
              {state.itemCount} items waiting to be paid
            </p>
          </div>
        </Container>
      </section>

      <Container className="py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {state.items.map((item) => (
              <div
                key={item.lineId}
                className="bg-card rounded-2xl border border-border p-6 transition-all duration-200 hover:shadow-medium"
              >
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-contain bg-muted rounded-xl"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                      {item.name}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {item.size && <Badge variant="secondary">Size: {item.size}</Badge>}
                      {item.color && <Badge variant="outline">Color: {item.color}</Badge>}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xl font-bold">
                        {item.price.toLocaleString('vi-VN')}₫
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        
                        <span className="font-semibold min-w-8 text-center">
                          {item.quantity}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeFromCart(item.lineId)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">
              <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal ({state.itemCount} items)</span>
                  <span>{subtotal.toLocaleString('vi-VN')}₫</span>
                </div>

                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className={cn(
                    shipping === 0 && "text-success"
                  )}>
                    {shipping === 0 ? "Free" : `${shipping.toLocaleString('vi-VN')}₫`}
                  </span>
                </div>

                {shipping === 0 && (
                  <div className="text-xs text-success">
                    🎉 You get free shipping for orders over 500k!
                  </div>
                )}

                <div className="border-t border-border pt-3 flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{finalTotal.toLocaleString('vi-VN')}₫</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {!isAuthenticated && (
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full"
                    onClick={() => navigate("/checkout")}
                  >
                    Checkout as Guest
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
                
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    if (isAuthenticated) {
                      navigate("/checkout")
                    } else {
                      navigate("/login?redirect=/checkout")
                    }
                  }}
                >
                  {isAuthenticated ? "Checkout" : "Checkout as Member"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link to="/products">
                    Continue shopping
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Container>
 
      <Footer />
    </div>
  )
}