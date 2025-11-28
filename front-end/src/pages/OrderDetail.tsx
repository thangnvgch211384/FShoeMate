import { useState, useEffect } from "react"
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCart } from "@/contexts/CartContext"
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle,
  MapPin,
  CreditCard,
  Calendar,
  FileText,
  RotateCcw,
  Star,
  MessageCircle,
  Download
} from "lucide-react"
import { getOrderDetail, getGuestOrderDetail, cancelOrder, cancelGuestOrder, getAdminOrderDetail } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface OrderItem {
  id: string
  name: string
  size: string
  color?: string
  quantity: number
  price: number
  image: string
}

interface Order {
  id: string
  orderNumber: string
  date: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'failed'
  paymentMethod: string
  total: number
  subtotal: number
  discount: number
  shippingFee: number
  items: OrderItem[]
  shippingAddress: string
  guestInfo?: {
    name?: string
    email?: string
    phone?: string
    address?: string
  }
  estimatedDelivery?: string
  trackingNumber?: string
  createdAt: string
  updatedAt: string
}

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    pending: { 
      label: "Pending", 
      className: "bg-yellow-100 text-yellow-800", 
      icon: Package 
    },
    processing: { 
      label: "Processing", 
      className: "bg-blue-100 text-blue-800", 
      icon: Package 
    },
    shipped: { 
      label: "Shipped", 
      className: "bg-purple-100 text-purple-800", 
      icon: Truck 
    },
    delivered: { 
      label: "Delivered", 
      className: "bg-green-100 text-green-800", 
      icon: CheckCircle 
    },
    cancelled: { 
      label: "Cancelled", 
      className: "bg-red-100 text-red-800", 
      icon: XCircle 
    }
  }

  const config = statusConfig[status as keyof typeof statusConfig]
  const Icon = config.icon

  return (
    <Badge variant="secondary" className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  )
}

const TrackingTimeline = ({ status }: { status: string }) => {
  const steps = [
    { key: 'pending', label: 'Pending', icon: Package, color: 'bg-yellow-500' },
    { key: 'processing', label: 'Processing', icon: Package, color: 'bg-blue-500' },
    { key: 'shipped', label: 'Shipped', icon: Truck, color: 'bg-orange-500' },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'bg-green-500' }
  ]

  const statusOrder = ['pending', 'processing', 'shipped', 'delivered']
  const currentIndex = statusOrder.indexOf(status)

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
      
      <div className="space-y-6">
        {steps.map((step, index) => {
          const stepIndex = statusOrder.indexOf(step.key)
          const isCompleted = stepIndex <= currentIndex
          const isCurrent = stepIndex === currentIndex
          const isPast = stepIndex < currentIndex
          const Icon = step.icon

          return (
            <div key={step.key} className="relative flex items-start gap-4">
              <div className={cn(
                "relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm",
                isCurrent 
                  ? `${step.color} border-transparent text-white scale-110` 
                  : isCompleted
                  ? `${step.color} border-transparent text-white`
                  : "bg-gray-100 border-gray-300 text-gray-400"
              )}>
                <Icon className={cn(
                  "w-5 h-5 transition-all duration-300",
                  isCurrent && "scale-110"
                )} />
                {isCurrent && (
                  <div className={cn(
                    "absolute inset-0 rounded-full animate-ping",
                    step.color,
                    "opacity-75"
                  )} />
                )}
              </div>

              <div className="flex-1 pt-1.5">
                <p className={cn(
                  "font-semibold text-base transition-colors duration-300",
                  isCurrent ? "text-gray-900" : isCompleted ? "text-gray-700" : "text-gray-400"
                )}>
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="text-sm text-muted-foreground mt-1.5 animate-in fade-in duration-300">
                    Your order is at this step
                  </p>
                )}
                {isPast && !isCurrent && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Completed
                  </p>
                )}
              </div>

              {index < steps.length - 1 && (
                <div className={cn(
                  "absolute left-5 w-0.5 transition-all duration-500",
                  stepIndex < currentIndex ? step.color : "bg-gray-200"
                )} style={{ 
                  top: '2.5rem', 
                  height: '1.5rem',
                  transform: stepIndex < currentIndex ? 'scaleY(1)' : 'scaleY(0.5)'
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const { clearCart, refreshCart } = useCart()
  const isAdmin = user?.role === "admin"
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isPolling, setIsPolling] = useState(false)

  const mapOrderData = (orderData: any): Order => ({
    id: orderData._id,
    orderNumber: orderData._id.slice(-6).toUpperCase(),
    date: orderData.createdAt,
    status: orderData.status,
    paymentStatus: orderData.paymentStatus || 'pending',
    paymentMethod: orderData.paymentMethod || 'cod',
    total: orderData.totals?.total || 0,
    subtotal: orderData.totals?.subtotal || 0,
    discount: orderData.totals?.discount || 0,
    shippingFee: orderData.totals?.shippingFee || 0,
    items: orderData.items?.map((item: any) => ({
      id: item.variantId || item._id,
      name: item.productSnapshot?.name || "Unknown Product",
      size: item.productSnapshot?.size || "N/A",
      color: item.productSnapshot?.color,
      quantity: item.quantity,
      price: item.productSnapshot?.price || 0,
      image: item.productSnapshot?.image || "/api/placeholder/80/80"
    })) || [],
    shippingAddress: orderData.guestInfo?.address || orderData.shippingAddress || "N/A",
    guestInfo: orderData.guestInfo,
    estimatedDelivery: orderData.estimatedDelivery,
    trackingNumber: orderData.trackingNumber,
    createdAt: orderData.createdAt,
    updatedAt: orderData.updatedAt
  })

  useEffect(() => {
    const paymentStatus = searchParams.get("payment")
    if (paymentStatus === "success") {
      localStorage.removeItem("pendingPayOSOrderId")
      localStorage.removeItem("pendingPayOSOrderEmail")
      
      // Clear cart when payment is successful
      // Backend already cleared server cart when order was created
      // But we need to clear local cart and refresh server cart
      
      if (isAuthenticated) {
        refreshCart() //
      } else {
        clearCart() 
      }
    }
    
    if (paymentStatus === "success" && !isPolling && id) {
      setIsPolling(true)
      toast({
        title: "Payment successful!",
        description: "Your payment has been processed successfully.",
      })
      navigate(`/orders/${id}`, { replace: true })
      
      let pollCount = 0
      const maxPolls = 10 
      
      
      const pollInterval = setInterval(async () => {
        if (!id) {
          clearInterval(pollInterval)
          setIsPolling(false)
          return
        }
        
        pollCount++
        
        try {
          let response
          if (isAdmin) {
            response = await getAdminOrderDetail(id)
          } else if (isAuthenticated) {
            response = await getOrderDetail(id)
          } else {
            response = await getGuestOrderDetail(id)
          }
          
          if (response.order.paymentStatus === "paid") {
            clearInterval(pollInterval)
            setIsPolling(false)
            setOrder(mapOrderData(response.order))
            toast({
              title: "Payment confirmed!",
              description: "Your payment has been confirmed.",
            })
            return
          }
          
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval)
            setIsPolling(false)
            try {
              let finalResponse
              if (isAdmin) {
                finalResponse = await getAdminOrderDetail(id)
              } else if (isAuthenticated) {
                finalResponse = await getOrderDetail(id)
              } else {
                finalResponse = await getGuestOrderDetail(id)
              }
              setOrder(mapOrderData(finalResponse.order))
            } catch (error) {
            }
          }
        } catch (error) {
            if (pollCount >= maxPolls) {
            clearInterval(pollInterval)
            setIsPolling(false)
          }
        }
      }, 1000) 
      
      return () => {
        clearInterval(pollInterval)
        setIsPolling(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    if (authLoading) return
    
    const paymentStatus = searchParams.get("payment")
    
    // Allow guest to view order if they have payment=success (redirect from PayOS)
    // or if they're viewing their own guest order
    if (paymentStatus !== "success" && !isAuthenticated && !isAdmin) {
      navigate("/login")
      return
    }
    
    if (!id) {
      setError("Order ID is required")
      setLoading(false)
      return
    }

    async function loadOrder() {
      try {
        setLoading(true)
        
        let response
        if (isAdmin) {
          response = await getAdminOrderDetail(id)
        } else if (isAuthenticated) {
          response = await getOrderDetail(id)
        } else {
          // Guest order - use guest endpoint
          response = await getGuestOrderDetail(id)
        }
        const orderData = response.order
        
        setOrder(mapOrderData(orderData))
        setError(null)
      } catch (err: any) {
        setError(err.message || "Order not found")
        
        // If guest order fails, try to redirect to login
        if (!isAuthenticated && !isAdmin) {
          if (paymentStatus === "success") {
            toast({
              title: "Please login to view order",
              description: "Your payment was successful. Please login to view order details.",
              variant: "default"
            })
            navigate(`/login?redirect=/orders/${id}`, { replace: true })
            return
          } else {
            navigate("/login")
            return
          }
        }
        
        toast({
          title: "Error",
          description: err.message || "Failed to load order details",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [id, isAuthenticated, navigate, toast, isAdmin, searchParams, authLoading])

  const handleCancelOrder = async () => {
    if (!order || !id) return

    setCancelling(true)
    try {
      // Use appropriate cancel function based on authentication
      if (isAuthenticated) {
        await cancelOrder(id)
      } else {
        await cancelGuestOrder(id)
      }
      setShowCancelDialog(false)
      toast({
        title: "Order cancelled",
        description: "Your order has been cancelled successfully.",
      })
      const response = isAuthenticated 
        ? await getOrderDetail(id)
        : await getGuestOrderDetail(id)
      const orderData = response.order
      setOrder({
        id: orderData._id,
        orderNumber: orderData._id.slice(-6).toUpperCase(),
        date: orderData.createdAt,
        status: orderData.status,
        paymentStatus: orderData.paymentStatus || 'pending',
        paymentMethod: orderData.paymentMethod || 'cod',
        total: orderData.totals?.total || 0,
        subtotal: orderData.totals?.subtotal || 0,
        discount: orderData.totals?.discount || 0,
        shippingFee: orderData.totals?.shippingFee || 0,
        items: orderData.items?.map((item: any) => ({
          id: item.variantId || item._id,
          name: item.productSnapshot?.name || "Unknown Product",
          size: item.productSnapshot?.size || "N/A",
          color: item.productSnapshot?.color,
          quantity: item.quantity,
          price: item.productSnapshot?.price || 0,
          image: item.productSnapshot?.image || "/api/placeholder/80/80"
        })) || [],
        shippingAddress: orderData.guestInfo?.address || orderData.shippingAddress || "N/A",
        estimatedDelivery: orderData.estimatedDelivery,
        trackingNumber: orderData.trackingNumber,
        createdAt: orderData.createdAt,
        updatedAt: orderData.updatedAt
      })
    } catch (err: any) {
      console.error("Failed to cancel order:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to cancel order",
        variant: "destructive"
      })
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <Container className="py-8">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </Container>
        <Footer />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <Container className="py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <XCircle className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Order not found</h2>
              <p className="text-muted-foreground mb-6">{error || "Order not found"}</p>
              <Button onClick={() => navigate(isAdmin ? "/admin/orders" : "/orders")}>
                {isAdmin ? "Back to order management" : "Back to order history"}
              </Button>
            </CardContent>
          </Card>
        </Container>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <Container className="py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(isAdmin ? "/admin/orders" : "/orders")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Order details</h1>
                <p className="text-muted-foreground">
                  Order #{order.orderNumber}
                </p>
              </div>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Size: {item.size}
                            {item.color && ` | Color: ${item.color}`}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Quantity: {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.price.toLocaleString('vi-VN')}₫ / product
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {order.status !== 'cancelled' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tracking order</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <TrackingTimeline status={order.status} />
                    </div>
                    {order.trackingNumber && (
                      <div className="mt-6 p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Tracking number</p>
                        <p className="text-lg font-mono">{order.trackingNumber}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {order.status === 'delivered' && (
                      <>
                        <Button variant="outline" asChild>
                          <Link to={`/products/${order.items[0]?.id}/reviews`}>
                            <Star className="w-4 h-4 mr-2" />
                            Review product
                          </Link>
                        </Button>
                        <Button variant="outline">
                          <RotateCcw className="w-4 h-4 mr-2" />
                            Buy again
                        </Button>
                      </>
                    )}
                    
                    {order.status === 'shipped' && (
                      <Button variant="outline">
                        <Truck className="w-4 h-4 mr-2" />
                        Track shipping
                      </Button>
                    )}
                    
                    {order.status === 'pending' && (
                      <>
                        <Button 
                          variant="destructive"
                          onClick={() => setShowCancelDialog(true)}
                          disabled={cancelling}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel order
                        </Button>
                        
                        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <XCircle className="h-5 w-5 text-red-500" />
                                Cancel Order?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="pt-2">
                                Are you sure you want to cancel order <span className="font-semibold">#{order.orderNumber}</span>?
                                <br />
                                <span className="text-sm text-muted-foreground mt-2 block">
                                  This action cannot be undone. The items will be returned to stock.
                                </span>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={cancelling}>
                                Keep Order
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleCancelOrder}
                                disabled={cancelling}
                                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                              >
                                {cancelling ? "Cancelling..." : "Yes, Cancel Order"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    
                    <Button variant="outline">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact support
                    </Button>
                    
                    {order.paymentStatus === 'paid' && (
                      <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download invoice
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Order date</p>
                      <p className="font-medium">
                        {new Date(order.date).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {order.estimatedDelivery && (
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated delivery</p>
                        <p className="font-medium">
                          {new Date(order.estimatedDelivery).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Payment method</p>
                      <p className="font-medium capitalize">
                        {order.paymentMethod === 'cod' ? 'Payment on delivery' : 
                         order.paymentMethod === 'momo' ? 'MoMo' :
                         order.paymentMethod === 'stripe' ? 'Stripe' : order.paymentMethod}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">Shipping address</p>
                        {order.guestInfo ? (
                          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <div className="font-medium text-base">{order.guestInfo.name}</div>
                            {order.guestInfo.email && (
                              <div className="text-sm text-muted-foreground">{order.guestInfo.email}</div>
                            )}
                            {order.guestInfo.phone && (
                              <div className="text-sm text-muted-foreground">{order.guestInfo.phone}</div>
                            )}
                            {order.guestInfo.address && (
                              <div className="text-sm font-medium mt-2 pt-2 border-t border-border">
                                {order.guestInfo.address.split(',').map((part, index) => (
                                  <div key={index} className={index === 0 ? "font-semibold" : ""}>
                                    {part.trim()}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-muted/50 rounded-lg p-4">
                            <p className="font-medium">{order.shippingAddress}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{order.subtotal.toLocaleString('vi-VN')}₫</span>
                  </div>
                  
                  {order.discount > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount</span>
                      <span className="text-red-600">-{order.discount.toLocaleString('vi-VN')}₫</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping fee</span>
                    <span>{order.shippingFee > 0 ? order.shippingFee.toLocaleString('vi-VN') + '₫' : 'Free'}</span>
                  </div>
                  
                  <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{order.total.toLocaleString('vi-VN')}₫</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Container>

      <Footer />
    </div>
  )
}

