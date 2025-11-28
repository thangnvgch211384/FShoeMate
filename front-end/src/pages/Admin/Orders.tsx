import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import {
  Package,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  X,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { getAdminOrders, updateOrderStatus } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const StatusBadge = ({ status, paymentStatus, paymentMethod }: { status: string, paymentStatus?: string, paymentMethod?: string }) => {
  const variants = {
    pending: { variant: "secondary" as const, icon: Clock, class: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20" },
    processing: { variant: "default" as const, icon: Package, class: "text-blue-600 bg-blue-50 dark:bg-blue-950/20" },
    shipped: { variant: "outline" as const, icon: Truck, class: "text-orange-600 bg-orange-50 dark:bg-orange-950/20" },
    delivered: { variant: "default" as const, icon: CheckCircle, class: "text-green-600 bg-green-50 dark:bg-green-950/20" },
    cancelled: { variant: "destructive" as const, icon: XCircle, class: "text-red-600 bg-red-50 dark:bg-red-950/20" }
  }

  const config = variants[status as keyof typeof variants] || variants.pending
  const Icon = config.icon

  // Show additional info if cancelled with PayOS payment
  const isCancelledWithPayOS = status === 'cancelled' && paymentMethod === 'payos' && paymentStatus === 'failed'

  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant={config.variant} className={cn(config.class, "pointer-events-none cursor-default")}>
        <Icon className="h-3 w-3 mr-1" />
        {status === 'pending' && 'Pending'}
        {status === 'processing' && 'Processing'}
        {status === 'shipped' && 'Shipped'}
        {status === 'delivered' && 'Delivered'}
        {status === 'cancelled' && 'Cancelled'}
      </Badge>
      {isCancelledWithPayOS && (
        <span className="text-xs text-red-600 font-medium">Payment refunded</span>
      )}
    </div>
  )
}

const PaymentBadge = ({ paymentStatus, paymentMethod, orderStatus }: { paymentStatus: string, paymentMethod: string, orderStatus?: string }) => {
  const variants = {
    paid: { variant: "default" as const, icon: CheckCircle, class: "text-green-600 bg-green-50 dark:bg-green-950/20" },
    pending: { variant: "secondary" as const, icon: Clock, class: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20" },
    failed: { variant: "destructive" as const, icon: XCircle, class: "text-red-600 bg-red-50 dark:bg-red-950/20" }
  }

  const config = variants[paymentStatus as keyof typeof variants] || variants.pending
  const Icon = config.icon

  const methodLabels = {
    cod: "COD",
    payos: "PayOS"
  }

  // Show special indicator if order is cancelled and payment was via PayOS
  const isCancelledWithPayOS = orderStatus === 'cancelled' && paymentMethod === 'payos' && paymentStatus === 'failed'

  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant={config.variant} className={cn(config.class, "pointer-events-none cursor-default")}>
        <Icon className="h-3 w-3 mr-1" />
        {paymentStatus === 'paid' && 'Paid'}
        {paymentStatus === 'pending' && 'Pending'}
        {paymentStatus === 'failed' && (isCancelledWithPayOS ? 'Failed (Cancelled)' : 'Failed')}
      </Badge>
      <span className="text-xs text-muted-foreground uppercase ml-3.5">
        {methodLabels[paymentMethod as keyof typeof methodLabels] || paymentMethod}
      </span>

    </div>
  )
}

interface OrderItem {
  variantId: string
  productSnapshot: {
    name: string
    brand: string
    size: string
    color: string
    image: string
    price: number
  }
  quantity: number
}

interface Order {
  _id: string
  userId?: {
    _id: string
    name: string
    email: string
  }
  guestInfo?: {
    name: string
    email: string
    phone?: string
    address: string
  }
  items: OrderItem[]
  totals: {
    subtotal: number
    discount: number
    shippingFee: number
    total: number
  }
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  paymentStatus: "pending" | "paid" | "failed"
  paymentMethod: "cod" | "payos"
  createdAt: string
  updatedAt: string
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState<string>("")
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()

  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")

  useEffect(() => {
    loadOrders()
    
    // Auto-refresh orders every 30 seconds to catch status changes
    const interval = setInterval(() => {
      loadOrders()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const response = await getAdminOrders()
      setOrders(response.orders || [])
    } catch (error: any) {
      console.error('Failed to load orders:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to load orders",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return

    setUpdating(true)
    try {
      await updateOrderStatus(selectedOrder._id, newStatus)
      toast({
        title: "Success",
        description: "Order status updated successfully",
      })
      setShowStatusDialog(false)
      setSelectedOrder(null)
      setNewStatus("")
      loadOrders()
    } catch (error: any) {
      console.error('Failed to update order status:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive"
      })
    } finally {
      setUpdating(false)
    }
  }

  const openStatusDialog = (order: Order) => {
    setSelectedOrder(order)
    setNewStatus(order.status)
    setShowStatusDialog(true)
  }

  const getCustomerName = (order: Order) => {
    if (order.userId) {
      return order.userId.name
    }
    if (order.guestInfo) {
      return order.guestInfo.name
    }
    return "Unknown"
  }

  const getCustomerEmail = (order: Order) => {
    if (order.userId) {
      return order.userId.email
    }
    if (order.guestInfo) {
      return order.guestInfo.email
    }
    return "Unknown"
  }

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (searchTerm) {
        const orderId = order._id.slice(-6).toUpperCase()
        const fullOrderId = order._id.toUpperCase()
        const customerName = getCustomerName(order).toLowerCase()
        const customerEmail = getCustomerEmail(order).toLowerCase()
        const searchLower = searchTerm.trim().toUpperCase()
        const searchLowerNormal = searchTerm.trim().toLowerCase()

        const matchesSearch =
          orderId.includes(searchLower) ||
          fullOrderId.includes(searchLower) ||
          customerName.includes(searchLowerNormal) ||
          customerEmail.includes(searchLowerNormal)
        if (!matchesSearch) return false
      }

      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false
      }

      if (paymentStatusFilter !== "all" && order.paymentStatus !== paymentStatusFilter) {
        return false
      }

      if (dateFrom || dateTo) {
        const orderDate = new Date(order.createdAt)
        if (dateFrom) {
          const fromDate = new Date(dateFrom)
          fromDate.setHours(0, 0, 0, 0)
          if (orderDate < fromDate) return false
        }
        if (dateTo) {
          const toDate = new Date(dateTo)
          toDate.setHours(23, 59, 59, 999)
          if (orderDate > toDate) return false
        }
      }

      return true
    })
  }, [orders, searchTerm, statusFilter, paymentStatusFilter, dateFrom, dateTo])

  const hasActiveFilters = statusFilter !== "all" ||
    paymentStatusFilter !== "all" ||
    dateFrom ||
    dateTo

  const clearFilters = () => {
    setStatusFilter("all")
    setPaymentStatusFilter("all")
    setDateFrom("")
    setDateTo("")
    setSearchTerm("")
  }

  const stats = useMemo(() => ({
    total: filteredOrders.length,
    pending: filteredOrders.filter(o => o.status === 'pending').length,
    processing: filteredOrders.filter(o => o.status === 'processing').length,
    completed: filteredOrders.filter(o => o.status === 'delivered').length
  }), [filteredOrders])

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
              <Package className="h-8 w-8" />
              Order Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Track and manage all orders
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadOrders}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.processing}</p>
                  <p className="text-sm text-muted-foreground">Processing</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order List</CardTitle>
          </CardHeader>

          <div className="px-6 pb-4 border-b space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Order ID, Customer name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Order Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Status</label>
                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All payment statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date To</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    min={dateFrom || undefined}
                    className="flex-1"
                  />
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
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        #{order._id.slice(-6).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{getCustomerName(order)}</div>
                          <div className="text-sm text-muted-foreground">{getCustomerEmail(order)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {order.items.length} items
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {order.totals.total.toLocaleString('vi-VN')}₫
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>

                      <TableCell>
                          <PaymentBadge 
                            paymentStatus={order.paymentStatus || 'pending'}
                            paymentMethod={order.paymentMethod || 'cod'}
                            orderStatus={order.status}
                          />
                      </TableCell>

                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/orders/${order._id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openStatusDialog(order)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Update Status
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

        <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Update Order Status</AlertDialogTitle>
              <AlertDialogDescription>
                Update the status for order #{selectedOrder?._id.slice(-6).toUpperCase()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUpdateStatus}
                disabled={updating || !newStatus || newStatus === selectedOrder?.status}
                className="bg-primary hover:bg-primary/90"
              >
                {updating ? "Updating..." : "Update Status"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  )
}