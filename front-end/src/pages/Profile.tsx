import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Edit3,
  Star,
  Gift,
  History
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getProfile, getLoyaltySummary, getOrders, updateProfile } from "@/lib/api"
import { removeToken } from "@/lib/auth"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

const profileTabs = [
  { id: "overview", label: "Overview", icon: User },
  { id: "orders", label: "Orders", icon: Package },
  { id: "points", label: "Points", icon: Gift }
]


const statusColors = {
  delivered: "success",
  shipping: "warning",
  processing: "primary",
  cancelled: "destructive"
}

const statusLabels = {
  delivered: "Delivered",
  shipping: "Shipping",
  processing: "Processing",
  cancelled: "Cancelled"
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState("overview")
  const [userInfo, setUserInfo] = useState<any>(null)
  const [loyaltySummary, setLoyaltySummary] = useState<any>(null)
  const [orderHistory, setOrderHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: {
      street: "",
      city: "",
      country: "",
      postalCode: ""
    }
  })
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const profile = await getProfile().catch(() => null)

        if (profile?.user?.role === "admin") {
          navigate("/admin/profile")
          return
        }

        const [loyalty, orders] = await Promise.all([
          getLoyaltySummary().catch(() => null),
          getOrders().catch(() => ({ orders: [] })),
        ])

        if (profile?.user) {
          const address = profile.user.address || {}
          setUserInfo({
            name: profile.user.name || "",
            email: profile.user.email || "",
            phone: profile.user.phone || "",
            address: profile.user.address ?
              `${address.street || ""}, ${address.city || ""}` : "",
            addressObj: address,
            joinDate: profile.user.createdAt || new Date().toISOString(),
            loyaltyPoints: profile.user.loyaltyPoints || 0,
            memberLevel: profile.user.membershipLevel || null
          })

          setFormData({
            name: profile.user.name || "",
            phone: profile.user.phone || "",
            address: {
              street: address.street || "",
              city: address.city || "",
              country: address.country || "",
              postalCode: address.postalCode || ""
            }
          })
        }

        if (loyalty?.summary) {
          setLoyaltySummary(loyalty.summary)
          if (!userInfo) {
            setUserInfo((prev: any) => ({
              ...prev,
              loyaltyPoints: loyalty.summary.points || 0,
              memberLevel: loyalty.summary.level || null
            }))
          }
        }

        if (orders?.orders) {
          setOrderHistory(orders.orders.map((o: any) => ({
            id: o._id || o.id,
            orderNumber: o._id || o.id,
            date: o.createdAt || new Date().toISOString(),
            status: o.status || "pending",
            total: o.totals?.total || 0,
            items: o.items?.map((item: any) => ({
              name: item.productSnapshot?.name || "",
              image: item.productSnapshot?.image || "",
              size: item.productSnapshot?.size || "",
              color: item.productSnapshot?.color || ""
            })) || []
          })))
        }
      } catch (error: any) {
        console.error("Failed to load profile:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])


  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (userInfo) {
      setFormData({
        name: userInfo.name || "",
        phone: userInfo.phone || "",
        address: userInfo.addressObj || {
          street: "",
          city: "",
          country: "",
          postalCode: ""
        }
      })
    }
  }

  const validatePhone = (phone: string): string | null => {
    if (!phone || phone.trim() === "") {
      return null
    }
    // Format: phone number (10-11 digits)
    const phoneRegex = /^[0-9]{10,11}$/
    const cleanPhone = phone.replace(/\s+/g, "") // Remove spaces
    if (!phoneRegex.test(cleanPhone)) {
      return "Invalid phone number. Example: 0901234567"
    }
    return null
  }

  const handleSave = async () => {
    // Validate phone number
    const phoneError = validatePhone(formData.phone)
    if (phoneError) {
      toast({
        title: "Validation Error",
        description: phoneError,
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const response = await updateProfile({
        name: formData.name,
        phone: formData.phone.trim() || undefined,
        address: formData.address
      })

      if (response?.user) {
        // Update local state
        const address = response.user.address || {}
        setUserInfo((prev: any) => ({
          ...prev,
          name: response.user.name,
          phone: response.user.phone,
          address: address.street && address.city
            ? `${address.street}, ${address.city}`
            : "",
          addressObj: address
        }))

        // Update AuthContext
        await refreshUser()

        setIsEditing(false)
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        })
      }
    } catch (error: any) {
      console.error("Failed to update profile:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith("address.")) {
      const addressField = field.split(".")[1]
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  if (loading || !userInfo) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <Container className="py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-24 bg-muted rounded-xl"></div>
            <div className="grid grid-cols-3 gap-6">
              <div className="h-32 bg-muted rounded-xl"></div>
              <div className="h-32 bg-muted rounded-xl"></div>
              <div className="h-32 bg-muted rounded-xl"></div>
            </div>
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="py-12 bg-gradient-to-r from-muted/50 to-muted/20">
        <Container>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-hero rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {userInfo.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Hello {userInfo.name}</h1>
              {userInfo.memberLevel && (
                <p className="text-muted-foreground mb-2">
                  Member {userInfo.memberLevel} • {userInfo.loyaltyPoints.toLocaleString()} points
                </p>
              )}
              <div className="flex gap-2">
                <Badge variant="secondary">
                  <Gift className="mr-1 h-3 w-3" />
                  {userInfo.loyaltyPoints} points
                </Badge>
                {userInfo.memberLevel && (
                  <Badge className="bg-yellow-500 text-white">
                    <Star className="mr-1 h-3 w-3" />
                    {userInfo.memberLevel}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-2">
              {profileTabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors",
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                )
              })}

            </div>
          </div>

          <div className="lg:col-span-3">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Account Overview</h2>
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                        Cancel
                      </Button>
                      <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-semibold text-lg mb-4">Personal Information</h3>
                  {!isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{userInfo.name}</p>
                            <p className="text-sm text-muted-foreground">Full Name</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{userInfo.email}</p>
                            <p className="text-sm text-muted-foreground">Email</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Phone className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{userInfo.phone || "Not set"}</p>
                            <p className="text-sm text-muted-foreground">Phone</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium">{userInfo.address || "Not set"}</p>
                            <p className="text-sm text-muted-foreground">Address</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Full Name *</label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => handleInputChange("name", e.target.value)}
                              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block">Email</label>
                            <input
                              type="email"
                              value={userInfo.email}
                              disabled
                              className="w-full px-4 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Phone</label>
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => handleInputChange("phone", e.target.value)}
                              placeholder="0901234567"
                              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium">Address</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Street</label>
                            <input
                              type="text"
                              value={formData.address.street}
                              onChange={(e) => handleInputChange("address.street", e.target.value)}
                              placeholder="123 Main Street"
                              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">City</label>
                            <input
                              type="text"
                              value={formData.address.city}
                              onChange={(e) => handleInputChange("address.city", e.target.value)}
                              placeholder="Ho Chi Minh City"
                              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Country</label>
                            <input
                              type="text"
                              value={formData.address.country}
                              onChange={(e) => handleInputChange("address.country", e.target.value)}
                              placeholder="Vietnam"
                              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Postal Code</label>
                            <input
                              type="text"
                              value={formData.address.postalCode}
                              onChange={(e) => handleInputChange("address.postalCode", e.target.value)}
                              placeholder="700000"
                              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                      </div>
                    </form>
                  )}
                </div>

                <div className="bg-card rounded-2xl border border-border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Recent Orders</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("orders")}
                    >
                      <History className="mr-2 h-4 w-4" />
                      View all
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {orderHistory.slice(0, 2).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                        <div className="flex items-center gap-4">
                          <img
                            src={order.items[0].image}
                            alt={order.items[0].name}
                            className="w-12 h-12 object-contain bg-background rounded-lg"
                          />
                          <div>
                            <p className="font-medium">#{order.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.date).toLocaleDateString('en-US')}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge variant={statusColors[order.status as keyof typeof statusColors] as any}>
                            {statusLabels[order.status as keyof typeof statusLabels]}
                          </Badge>
                          <p className="text-sm font-medium mt-1">
                            {order.total.toLocaleString('vi-VN')}₫
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "orders" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Order History</h2>
                  <div className="flex gap-2">
                    <select className="px-3 py-2 border border-border rounded-lg text-sm">
                      <option value="">All Status</option>
                      <option value="delivered">Delivered</option>
                      <option value="shipping">Shipping</option>
                      <option value="processing">Processing</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {orderHistory.map((order) => (
                    <div key={order.id} className="bg-card rounded-2xl border border-border p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">Order #{order.id}</h3>
                          <p className="text-sm text-muted-foreground">
                            Ordered on {new Date(order.date).toLocaleDateString('en-US')}
                          </p>
                        </div>
                        <Badge variant={statusColors[order.status as keyof typeof statusColors] as any}>
                          {statusLabels[order.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex items-center gap-4">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-16 h-16 object-contain bg-muted rounded-lg"
                            />
                            <div className="flex-1">
                              <p className="font-medium">{item.name}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">Size: {item.size}</Badge>
                                <Badge variant="outline" className="text-xs">{item.color}</Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        <p className="font-semibold">
                          Total: {order.total.toLocaleString('vi-VN')}₫
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/orders/${order.id}`}>
                              Details
                            </Link>
                          </Button>
                          {order.status === "delivered" && (
                            <Button variant="outline" size="sm">
                              Buy Again
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {activeTab === "points" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">ShoeFam Loyalty Points</h2>

                <div className="bg-gradient-hero rounded-2xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 mb-1">Current Points</p>
                      <p className="text-3xl font-bold">
                        {(loyaltySummary?.points || userInfo.loyaltyPoints || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/80 mb-1">Membership Level</p>
                      <Badge className="bg-white/20 text-white border-white/30">
                        {loyaltySummary?.level || userInfo.memberLevel || "No level"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-semibold mb-4">Progress to next level</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>{loyaltySummary?.level || userInfo.memberLevel || "No level"} (current)</span>
                      <span>Diamond (5000 points)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-primary h-2 rounded-full"
                        style={{ width: `${Math.min(((loyaltySummary?.points || userInfo.loyaltyPoints || 0) / 5000) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You need {Math.max(0, 5000 - (loyaltySummary?.points || userInfo.loyaltyPoints || 0)).toLocaleString()} points to reach Diamond level
                    </p>
                  </div>
                </div>


              </div>
            )}

          </div>
        </div>
      </Container>

      <Footer />
    </div>
  )
}