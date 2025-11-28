import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Button } from "@/components/ui/button"
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Settings,
  Edit3,
  Bell,
  Shield,
  CreditCard
} from "lucide-react"
import { getProfile, updateProfile } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

const adminTabs = [
  { id: "overview", label: "Overview", icon: User },
  { id: "settings", label: "Settings", icon: Settings }
]

export default function AdminProfile() {
  const [activeTab, setActiveTab] = useState("overview")
  const [userInfo, setUserInfo] = useState<any>(null)
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
  const { refreshUser } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const profile = await getProfile().catch(() => null)
        
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
            role: profile.user.role
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
      } catch (error: any) {
        console.error("Failed to load profile:", error)
        toast({
          title: "Error",
          description: "Failed to load profile information",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [toast])

  const handleInputChange = (field: string, value: string) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".")
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as any,
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (userInfo) {
      const address = userInfo.addressObj || {}
      setFormData({
        name: userInfo.name || "",
        phone: userInfo.phone || "",
        address: {
          street: address.street || "",
          city: address.city || "",
          country: address.country || "",
          postalCode: address.postalCode || ""
        }
      })
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const address = formData.address
      const updateData: any = {
        name: formData.name,
        phone: formData.phone || undefined,
        address: {
          street: address.street || undefined,
          city: address.city || undefined,
          country: address.country || undefined,
          postalCode: address.postalCode || undefined
        }
      }

      await updateProfile(updateData)
      await refreshUser()
      
      toast({
        title: "Success",
        description: "Profile updated successfully"
      })
      
      setIsEditing(false)
      
      // Reload profile data
      const profile = await getProfile()
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
          role: profile.user.role
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded-xl"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!userInfo) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load profile</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold gradient-text">Admin Profile</h1>
          <p className="text-muted-foreground mt-2">Manage your account information</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-2">
              {adminTabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Overview Tab */}
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

                {/* User Info */}
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
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Account Settings</h2>
                
                <div className="space-y-4">
                  <div className="bg-card rounded-2xl border border-border p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Email Notifications</p>
                          <p className="text-sm text-muted-foreground">Receive notifications about system updates and alerts</p>
                        </div>
                      </div>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                  </div>

                  <div className="bg-card rounded-2xl border border-border p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-muted-foreground">Enhance account security</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Setup
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

