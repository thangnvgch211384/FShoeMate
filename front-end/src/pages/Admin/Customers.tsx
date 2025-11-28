import { useState, useEffect, useMemo } from "react"
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Mail,
  Phone,
  MapPin,
  Star,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { fetchCustomers, updateCustomerStatus, getCustomerDetail, getCustomerOrders } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface Customer {
  _id: string
  name: string
  email: string
  phone?: string
  membershipLevel?: 'silver' | 'gold' | 'diamond' | null
  totalOrders: number
  totalSpent: number
  lastOrderDate?: string | null
  isActive: boolean
  createdAt: string
}

const LoyaltyBadge = ({ tier }: { tier?: string | null }) => {
  if (!tier) return <Badge variant="outline">No Tier</Badge>

  const variants = {
    silver: { class: "bg-gray-100 text-gray-800 dark:bg-gray-950/20 dark:text-gray-300", label: "Silver" },
    gold: { class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-300", label: "Gold" },
    diamond: { class: "bg-purple-100 text-purple-800 dark:bg-purple-950/20 dark:text-purple-300", label: "Diamond" }
  }

  const config = variants[tier as keyof typeof variants] || variants.silver

  return (
    <Badge variant="outline" className={config.class}>
      <Star className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}

export default function AdminCustomers() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [membershipLevelFilter, setMembershipLevelFilter] = useState<string>("all")

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerOrders, setCustomerOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const res = await fetchCustomers({
        page: 1,
        limit: 1000 // Load all customers for client-side filtering
      })
      setCustomers(res.users || [])
    } catch (error: any) {
      console.error("Failed to load customers:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load customers",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewCustomer = async (customerId: string) => {
    try {
      setLoadingOrders(true)
      const [customerRes, ordersRes] = await Promise.all([
        getCustomerDetail(customerId),
        getCustomerOrders(customerId)
      ])
      setSelectedCustomer(customerRes.customer)
      setCustomerOrders(ordersRes.orders || [])
    } catch (error: any) {
      console.error("Failed to load customer detail:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load customer detail",
        variant: "destructive"
      })
    } finally {
      setLoadingOrders(false)
    }
  }

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.trim().toLowerCase()
        const customerId = customer._id.toLowerCase()
        const name = customer.name.toLowerCase()
        const email = customer.email.toLowerCase()
        const phone = customer.phone?.toLowerCase() || ""

        const matchesSearch =
          customerId.includes(searchLower) ||
          name.includes(searchLower) ||
          email.includes(searchLower) ||
          phone.includes(searchLower)
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== "all") {
        const isActive = statusFilter === "active"
        if (customer.isActive !== isActive) return false
      }

      // Membership level filter
      if (membershipLevelFilter !== "all") {
        if (membershipLevelFilter === "none") {
          if (customer.membershipLevel !== null) return false
        } else {
          if (customer.membershipLevel !== membershipLevelFilter) return false
        }
      }

      return true
    })
  }, [customers, searchTerm, statusFilter, membershipLevelFilter])

  const hasActiveFilters = statusFilter !== "all" ||
    membershipLevelFilter !== "all" ||
    searchTerm

  const clearFilters = () => {
    setStatusFilter("all")
    setMembershipLevelFilter("all")
    setSearchTerm("")
  }

  const handleToggleStatus = async (customerId: string, currentStatus: boolean) => {
    try {
      await updateCustomerStatus(customerId, !currentStatus)
      toast({
        title: "Success",
        description: "Customer status updated successfully",
      })
      loadCustomers()
    } catch (error: any) {
      console.error("Failed to update status:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update customer status",
        variant: "destructive"
      })
    }
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  const stats = useMemo(() => ({
    total: filteredCustomers.length,
    active: filteredCustomers.filter(c => c.isActive).length,
    newThisMonth: filteredCustomers.filter(c => {
      const joinDate = new Date(c.createdAt)
      const now = new Date()
      return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear()
    }).length,
    vip: filteredCustomers.filter(c => c.membershipLevel === 'diamond' || c.membershipLevel === 'gold').length
  }), [filteredCustomers])

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted rounded-xl"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded-xl"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
              <Users className="h-8 w-8" />
              Customer Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Track and manage customer information
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total customers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.newThisMonth}</p>
                  <p className="text-sm text-muted-foreground">New this month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.vip}</p>
                  <p className="text-sm text-muted-foreground">VIP customers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card>
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
          </CardHeader>

          {/* Filter Panel - Always visible */}
          <div className="px-6 pb-4 border-b space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone or customer ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Membership Level Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Membership Level</label>
                <div className="flex gap-2">
                  <Select value={membershipLevelFilter} onValueChange={setMembershipLevelFilter}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="All levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="diamond">Diamond</SelectItem>
                      <SelectItem value="none">No Tier</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={clearFilters}
                      title="Clear all filters"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Membership Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No customers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer._id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">ID: {customer._id.slice(-8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <LoyaltyBadge tier={customer.membershipLevel} />
                      </TableCell>

                      <TableCell>
                        <Badge variant={customer.isActive ? "default" : "secondary"}>
                          {customer.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-medium">
                        {customer.totalOrders}
                      </TableCell>

                      <TableCell className="font-semibold text-primary">
                        {customer.totalSpent.toLocaleString('vi-VN')}₫
                      </TableCell>

                    <TableCell>{formatDate(customer.lastOrderDate)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewCustomer(customer._id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(customer._id, customer.isActive)}>
                              {customer.isActive ? (
                                <>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Customer Detail Dialog */}
        {selectedCustomer && (
          <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Customer Details</DialogTitle>
                <DialogDescription>
                  View customer information and order history
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-muted-foreground">Name</Label>
                        <p className="font-medium">{selectedCustomer.name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="font-medium">{selectedCustomer.email}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Phone</Label>
                        <p className="font-medium">{selectedCustomer.phone || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <div>
                          <Badge variant={selectedCustomer.isActive ? "default" : "secondary"}>
                            {selectedCustomer.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Membership & Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-muted-foreground">Membership Level</Label>
                        <div className="mt-1">
                          <LoyaltyBadge tier={selectedCustomer.membershipLevel} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Total Orders</Label>
                        <p className="font-medium">{selectedCustomer.totalOrders}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Total Spent</Label>
                        <p className="font-medium text-primary">
                          {selectedCustomer.totalSpent.toLocaleString('vi-VN')}₫
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Last Order</Label>
                        <p className="font-medium">{formatDate(selectedCustomer.lastOrderDate)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingOrders ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      </div>
                    ) : customerOrders.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No orders found</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {customerOrders.slice(0, 10).map((order: any) => (
                          <div key={order._id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Order #{order._id.slice(-8)}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(order.createdAt)} • {order.items?.length || 0} items
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-primary">
                                {order.totals?.total?.toLocaleString('vi-VN')}₫
                              </p>
                              <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {customerOrders.length > 10 && (
                          <p className="text-sm text-muted-foreground text-center pt-2">
                            Showing 10 of {customerOrders.length} orders
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  )
}