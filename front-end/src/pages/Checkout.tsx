import { useState, useEffect } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useCart } from "@/contexts/CartContext"
import { useAuth } from "@/contexts/AuthContext"
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  CreditCard, 
  MapPin, 
  Phone, 
  User,
  Mail,
  Tag,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createOrder, createGuestOrder, getProfile, cancelOrder, cancelGuestOrder, validatePromotion } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type CheckoutStep = "shipping" | "payment" | "review"

export default function Checkout() {
  const { state, clearCart, refreshCart } = useCart()
  const { user, isAuthenticated, login: setAuthUser, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("shipping")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const paymentStatus = searchParams.get("payment")
    if (paymentStatus === "cancelled") {
      // Auto-cancel the order when PayOS payment is cancelled
      const handlePaymentCancellation = async () => {
        try {
          // Get orderId from localStorage (saved before redirecting to PayOS)
          const pendingOrderId = localStorage.getItem("pendingPayOSOrderId")
          const pendingOrderEmail = localStorage.getItem("pendingPayOSOrderEmail")
          
          if (pendingOrderId) {
            // Cancel the order
            if (isAuthenticated) {
              await cancelOrder(pendingOrderId)
            } else if (pendingOrderEmail) {
              await cancelGuestOrder(pendingOrderId)
            }
            
            localStorage.removeItem("pendingPayOSOrderId")
            localStorage.removeItem("pendingPayOSOrderEmail")
          }
          
          toast({
            title: "Payment cancelled",
            description: "Your payment was cancelled. You can try again.",
            variant: "destructive",
          })
        } catch (error: any) {
          console.error("Failed to cancel order:", error)
          toast({
            title: "Payment cancelled",
            description: "Your payment was cancelled. You can try again.",
            variant: "destructive",
          })
        }
      }
      
      handlePaymentCancellation()
      navigate("/checkout", { replace: true })
    }
  }, [searchParams, navigate, toast, isAuthenticated])
  
  const [shippingInfo, setShippingInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    ward: "",
    notes: ""
  })

  const [paymentMethod, setPaymentMethod] = useState("cod")
  const [voucherCode, setVoucherCode] = useState("")
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string
    discountAmount: number
    shippingDiscount: number
    discountType: string
  } | null>(null)
  const [validatingVoucher, setValidatingVoucher] = useState(false)
  
  const subtotal = state.total
  const shipping = subtotal > 500000 ? 0 : 30000
  const discount = appliedVoucher?.discountAmount || 0
  const shippingDiscount = appliedVoucher?.shippingDiscount || 0
  const finalShipping = Math.max(0, shipping - shippingDiscount)
  const total = Math.max(0, subtotal - discount + finalShipping)

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserProfile()
    }
  }, [isAuthenticated, user])

  const loadUserProfile = async () => {
    try {
      const response = await getProfile()
      if (response?.user) {
        const address = response.user.address || {}
        setShippingInfo({
          fullName: response.user.name || "",
          email: response.user.email || "",
          phone: response.user.phone || "",
          address: address.street || "",
          city: address.city || "",
          district: address.district || "",
          ward: address.ward || "",
          notes: ""
        })
      }
    } catch (error) {
      console.error("Failed to load user profile:", error)
    }
  }


  const steps = [
    { id: "shipping", title: "Shipping", icon: MapPin },
    { id: "payment", title: "Payment", icon: CreditCard },
    { id: "review", title: "Review", icon: Check }
  ]


  const handleContinue = () => {
    if (currentStep === "shipping") {
      setCurrentStep("payment")
    } else if (currentStep === "payment") {
      setCurrentStep("review")
    }
  }

  const handlePlaceOrder = async () => {
    if (state.items.length === 0) return

    setIsProcessing(true)
    try {
      const fullAddress = `${shippingInfo.address}, ${shippingInfo.ward}, ${shippingInfo.district}, ${shippingInfo.city}`.replace(/^,\s*/, '').replace(/,\s*$/, '')
      
      const payload = {
        paymentMethod,
        shippingMethod: finalShipping > 0 ? "standard" : "free",
        discountCode: appliedVoucher?.code || undefined,
        totals: {
          discount: discount,
          shippingFee: finalShipping
        },
        guestInfo: {
          name: shippingInfo.fullName,
          email: shippingInfo.email,
          phone: shippingInfo.phone,
          address: fullAddress
        }
      }

      let orderResponse;
      if (isAuthenticated) {
        orderResponse = await createOrder(payload)
      } else {
        const items = state.items.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity
        })).filter(item => item.variantId)

        if (items.length === 0) {
          toast({
            title: "Error",
            description: "Cannot place order. Please try again.",
            variant: "destructive",
          })
          setIsProcessing(false)
          return
        }

        orderResponse = await createGuestOrder({
          ...payload,
          items
        })
      }

      const order = orderResponse.order || orderResponse

      if (paymentMethod === "payos") {
        if (order.metadata?.payosPaymentLink) {
          // Save orderId and email to localStorage before redirecting
          // This allows us to cancel the order if user cancels PayOS payment
          localStorage.setItem("pendingPayOSOrderId", order._id || order.id)
          if (!isAuthenticated && shippingInfo.email) {
            localStorage.setItem("pendingPayOSOrderEmail", shippingInfo.email)
          }
          
          window.location.href = order.metadata.payosPaymentLink
          return
        } else {
          // Nếu chọn PayOS nhưng không có payment link, có thể là lỗi PayOS
          toast({
            title: "PayOS Payment Error",
            description: "Không thể tạo payment link. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.",
            variant: "destructive",
          })
          return
        }
      }

      clearCart()
      toast({
        title: "Order placed successfully!",
        description: "Your order has been confirmed.",
      })
      navigate("/orders")
    } catch (error: any) {
      console.error("Checkout error:", error)
      
      // Xử lý lỗi PayOS cụ thể
      if (error.message?.includes("PayOS") || error.code === '214') {
        toast({
          title: "PayOS Payment Error",
          description: error.message || "Cổng thanh toán PayOS không khả dụng. Vui lòng kiểm tra cấu hình hoặc chọn phương thức thanh toán khác.",
          variant: "destructive",
          duration: 8000, // Hiển thị lâu hơn để user đọc được
        })
      } else {
        toast({
          title: "Error",
          description: error.message || "Cannot place order. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const updateShippingInfo = (field: string, value: string) => {
    setShippingInfo(prev => ({ ...prev, [field]: value }))
  }

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      toast({
        title: "Voucher Code Required",
        description: "Please enter a voucher code",
        variant: "destructive",
      })
      return
    }

    setValidatingVoucher(true)
    try {
      const items = state.items.map(item => ({
        variantId: item.variantId,
        productId: item.productId,
        quantity: item.quantity
      }))

      const result = await validatePromotion(voucherCode.trim().toUpperCase(), subtotal, items)
      
      if (result.success && result.data) {
        setAppliedVoucher({
          code: voucherCode.trim().toUpperCase(),
          discountAmount: result.data.discountAmount || 0,
          shippingDiscount: result.data.shippingDiscount || 0,
          discountType: result.data.discountType
        })
        setVoucherCode("")
        toast({
          title: "Voucher applied!",
          description: result.data.message || "Discount has been applied to your order",
        })
      } else {
        toast({
          title: "Cannot Apply Voucher",
          description: result.message || "This voucher code is not valid",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Cannot Apply Voucher",
        description: error.message || "Failed to validate voucher code. Please try again.",
        variant: "destructive",
      })
    } finally {
      setValidatingVoucher(false)
    }
  }

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null)
    setVoucherCode("")
    toast({
      title: "Voucher removed",
      description: "Discount has been removed from your order",
    })
  }

  const isShippingValid = shippingInfo.fullName && shippingInfo.email && shippingInfo.phone && shippingInfo.address

  if (state.items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <Container className="py-16">
          <div className="text-center max-w-md mx-auto">
            <h1 className="text-3xl font-bold mb-4">Cart is empty</h1>
            <p className="text-muted-foreground mb-8">
              No products to checkout.
            </p>
            <Button asChild variant="hero" size="lg">
              <Link to="/products">Shop now</Link>
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
      
      <section className="py-8 bg-gradient-to-r from-muted/50 to-muted/20">
        <Container>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Checkout</h1>
              <p className="text-muted-foreground">
                Complete your order
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/cart">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to cart
              </Link>
            </Button>
          </div>
        </Container>
      </section>

      <Container className="py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between bg-card rounded-2xl border border-border p-6">
              {steps.map((step, index) => {
                const isActive = step.id === currentStep
                const isCompleted = (
                  (step.id === "shipping" && (currentStep === "payment" || currentStep === "review")) ||
                  (step.id === "payment" && currentStep === "review")
                )
                const Icon = step.icon

                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex items-center">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                        isActive && "bg-primary text-primary-foreground",
                        isCompleted && "bg-success text-success-foreground",
                        !isActive && !isCompleted && "bg-muted text-muted-foreground"
                      )}>
                        {isCompleted ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="ml-3">
                        <p className={cn(
                          "font-medium",
                          isActive && "text-primary",
                          isCompleted && "text-success"
                        )}>
                          {step.title}
                        </p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={cn(
                        "w-16 h-0.5 mx-4",
                        isCompleted ? "bg-success" : "bg-muted"
                      )} />
                    )}
                  </div>
                )
              })}
            </div>

            {currentStep === "shipping" && (
              <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Shipping information</h2>
                  {isAuthenticated && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Member
                    </Badge>
                  )}
                  {!isAuthenticated && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      Guest
                    </Badge>
                  )}
                </div>
                
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={shippingInfo.fullName}
                        onChange={(e) => updateShippingInfo("fullName", e.target.value)}
                        placeholder="Enter full name"
                        className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={shippingInfo.email}
                        onChange={(e) => updateShippingInfo("email", e.target.value)}
                        placeholder="Enter email address"
                        className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                      <label className="text-sm font-medium">Phone number *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="tel"
                        value={shippingInfo.phone}
                        onChange={(e) => updateShippingInfo("phone", e.target.value)}
                        placeholder="Enter phone number"
                        className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">State/City *</label>
                    <select
                      value={shippingInfo.city}
                      onChange={(e) => updateShippingInfo("city", e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors bg-background"
                      required
                    >
                      <option value="">Select state/city</option>
                      <option value="ho-chi-minh">Ho Chi Minh City</option>
                      <option value="ha-noi">Hanoi</option>
                      <option value="da-nang">Da Nang</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">District/County</label>
                    <select
                      value={shippingInfo.district}
                      onChange={(e) => updateShippingInfo("district", e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors bg-background"
                    >
                      <option value="">Select district/county</option>
                      <option value="quan-1">District 1</option>
                      <option value="quan-2">District 2</option>
                      <option value="quan-3">District 3</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ward/Commune</label>
                    <select
                      value={shippingInfo.ward}
                      onChange={(e) => updateShippingInfo("ward", e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors bg-background"
                    >
                      <option value="">Select ward/commune</option>
                      <option value="phuong-1">Ward 1</option>
                      <option value="phuong-2">Ward 2</option>
                      <option value="phuong-3">Ward 3</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Specific address *</label>
                  <textarea
                    value={shippingInfo.address}
                    onChange={(e) => updateShippingInfo("address", e.target.value)}
                    placeholder="House number, street name..."
                    rows={3}
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors resize-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <textarea
                    value={shippingInfo.notes}
                    onChange={(e) => updateShippingInfo("notes", e.target.value)}
                    placeholder="Notes for the delivery..."
                    rows={2}
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <Button
                  variant="hero"
                  size="lg"
                  onClick={handleContinue}
                  disabled={!isShippingValid}
                  className="w-full md:w-auto"
                >
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}

            {currentStep === "payment" && (
              <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                <h2 className="text-xl font-semibold">Payment method</h2>
                
                {/* Voucher Code Section */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Discount Code
                  </h3>
                  
                  {appliedVoucher ? (
                    <div className="bg-success/5 border border-success/20 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-success" />
                          <div>
                            <p className="font-semibold text-success">{appliedVoucher.code}</p>
                            <p className="text-xs text-muted-foreground">
                              {appliedVoucher.discountType === "percentage" 
                                ? `${appliedVoucher.discountAmount.toLocaleString('vi-VN')}₫ discount applied`
                                : appliedVoucher.discountType === "shipping"
                                ? "Free shipping applied"
                                : `${appliedVoucher.discountAmount.toLocaleString('vi-VN')}₫ discount applied`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveVoucher}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <Input
                        type="text"
                        placeholder="Enter voucher code"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleApplyVoucher()
                          }
                        }}
                        className="flex-1 h-10"
                      />
                      <Button
                        variant="outline"
                        onClick={handleApplyVoucher}
                        disabled={validatingVoucher || !voucherCode.trim()}
                      >
                        {validatingVoucher ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div 
                    className={cn(
                      "border-2 rounded-xl p-4 cursor-pointer transition-colors",
                      paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-border"
                    )}
                    onClick={() => setPaymentMethod("cod")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 border-2 border-primary rounded-full flex items-center justify-center">
                        {paymentMethod === "cod" && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                      </div>
                      <div>
                        <p className="font-semibold">Cash on delivery (COD)</p>
                        <p className="text-sm text-muted-foreground">Payment by cash on delivery</p>
                      </div>
                    </div>
                  </div>

                  <div 
                    className={cn(
                      "border-2 rounded-xl p-4 cursor-pointer transition-colors",
                      paymentMethod === "payos" ? "border-primary bg-primary/5" : "border-border"
                    )}
                    onClick={() => setPaymentMethod("payos")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 border-2 border-primary rounded-full flex items-center justify-center">
                        {paymentMethod === "payos" && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                      </div>
                      <div>
                        <p className="font-semibold">Online payment (PayOS)</p>
                        
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCurrentStep("shipping")}
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back to shipping
                  </Button>
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={handleContinue}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Order Review */}
            {currentStep === "review" && (
              <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                <h2 className="text-xl font-semibold">Order confirmation</h2>
                
                {/* Shipping Info Review */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Shipping information
                  </h3>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="font-semibold">{shippingInfo.fullName}</p>
                    <p className="text-sm text-muted-foreground">{shippingInfo.email}</p>
                    <p className="text-sm text-muted-foreground">{shippingInfo.phone}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {shippingInfo.address}, {shippingInfo.ward}, {shippingInfo.district}, {shippingInfo.city}
                    </p>
                  </div>
                </div>

                {/* Voucher Review */}
                {appliedVoucher && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Discount Code
                    </h3>
                    <div className="bg-success/5 border border-success/20 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-success" />
                          <div>
                            <p className="font-semibold text-success">{appliedVoucher.code}</p>
                            <p className="text-xs text-muted-foreground">
                              {appliedVoucher.discountType === "percentage" 
                                ? `${appliedVoucher.discountAmount.toLocaleString('vi-VN')}₫ discount`
                                : appliedVoucher.discountType === "shipping"
                                ? "Free shipping"
                                : `${appliedVoucher.discountAmount.toLocaleString('vi-VN')}₫ discount`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Method Review */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Payment method
                  </h3>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="font-semibold">
                      {paymentMethod === "payos" ? "Online payment (PayOS)" : "Cash on delivery (COD)"}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Ordered products
                  </h3>
                  <div className="space-y-3">
                    {state.items.map((item) => (
                      <div key={item.lineId} className="flex items-center gap-4 bg-muted/50 rounded-xl p-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-contain bg-background rounded-lg"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.name}</h4>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">Size: {item.size}</Badge>
                            <Badge variant="outline" className="text-xs">Color: {item.color}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{item.price.toLocaleString('vi-VN')}₫</p>
                          <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCurrentStep("payment")}
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back
                  </Button>
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={handlePlaceOrder}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Processing...
                      </div>
                    ) : (
                      <>
                        Place Order
                        <Check className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">
              <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
              
              {/* Member Benefits Notice */}
              {!isAuthenticated && (
                <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-xs font-medium text-primary mb-1">Become a Member</p>
                  <p className="text-xs text-muted-foreground">
                    Sign in or create an account to earn loyalty points and get exclusive offers!
                  </p>
                </div>
              )}
              
              {isAuthenticated && user?.role === "customer" && user?.loyaltyPoints !== undefined && (
                <div className="mb-4 p-3 bg-success/5 rounded-lg border border-success/20">
                  <p className="text-xs font-medium text-success mb-1">
                    You'll earn {Math.floor(subtotal * 0.01)} points
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Current balance: {user.loyaltyPoints.toLocaleString()} points
                  </p>
                </div>
              )}
              
              {/* Items */}
              <div className="space-y-3 mb-4">
                {state.items.slice(0, 3).map((item) => (
                  <div key={item.lineId} className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 object-contain bg-muted rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.size} • {item.color} • x{item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-sm">
                      {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                    </p>
                  </div>
                ))}
                {state.items.length > 3 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{state.items.length - 3} more {state.items.length - 3 === 1 ? 'item' : 'items'}
                  </p>
                )}
              </div>

              <div className="border-t border-border pt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal ({state.itemCount} {state.itemCount === 1 ? 'item' : 'items'})</span>
                  <span>{subtotal.toLocaleString('vi-VN')}₫</span>
                </div>

                {appliedVoucher && discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Discount ({appliedVoucher.code})
                    </span>
                    <span>-{discount.toLocaleString('vi-VN')}₫</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className={cn(finalShipping === 0 && "text-success")}>
                    {finalShipping === 0 ? "Free" : `${finalShipping.toLocaleString('vi-VN')}₫`}
                  </span>
                </div>

                <div className="border-t border-border pt-3 flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{total.toLocaleString('vi-VN')}₫</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      <Footer />
    </div>
  )
}