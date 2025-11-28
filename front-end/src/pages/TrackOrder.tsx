import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { findGuestOrder } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Search, Package, Mail, Hash } from "lucide-react"

export default function TrackOrder() {
  const [email, setEmail] = useState("")
  const [orderId, setOrderId] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !orderId) {
      toast({
        title: "Missing information",
        description: "Please enter both email and order ID.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await findGuestOrder(email, orderId)
      if (response.success && response.order) {
        navigate(`/orders/${response.order._id}`)
      } else {
        toast({
          title: "Order not found",
          description: "Please check your email and order ID and try again.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to find order. Please check your information and try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-16 bg-gradient-to-r from-muted/50 to-muted/20">
        <Container>
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold mb-2">Track Your Order</h1>
              <p className="text-muted-foreground">
                Enter your email and order ID to view your order details
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Find Your Order</CardTitle>
                <CardDescription>
                  Use the email address and order ID from your order confirmation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orderId" className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Order ID or Order Number
                    </Label>
                    <Input
                      id="orderId"
                      type="text"
                      placeholder="Enter order ID or order number (e.g., #10CB95)"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      required
                      className="h-12"
                    />
                    <p className="text-xs text-muted-foreground">
                      You can enter either the full order ID or the 6-character order number (e.g., #10CB95) from your confirmation email
                    </p>
                  </div>

                  <Button
                    type="submit"
                    variant="hero"
                    size="lg"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Searching...
                      </div>
                    ) : (
                      <>
                        <Search className="mr-2 h-5 w-5" />
                        Track Order
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-muted-foreground text-center">
                    Don't have an account?{" "}
                    <a href="/register" className="text-primary hover:underline font-medium">
                      Sign up
                    </a>{" "}
                    to easily track all your orders
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  )
}

