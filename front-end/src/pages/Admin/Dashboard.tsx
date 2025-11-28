import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  DollarSign,
  Package,
  Star,
  Award
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { getAnalytics } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

const KPICard = ({ title, value, description, icon: Icon, trend }: {
  title: string
  value: string | number
  description: string
  icon: any
  trend?: string
}) => (
  <Card className="hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-primary" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold gradient-text">{value}</div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {trend && <span className="text-emerald-500">↗ {trend}</span>}
        {description}
      </p>
    </CardContent>
  </Card>
)

const RecentOrder = ({ order }: { order: any }) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'delivered': return 'default'
      case 'shipped': return 'default'
      case 'processing': return 'secondary'
      case 'pending': return 'secondary'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'border-green-500 text-green-700 bg-green-50 dark:bg-green-950/20'
      case 'shipped': return 'border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/20'
      case 'processing': return 'border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950/20'
      case 'pending': return 'border-orange-500 text-orange-700 bg-orange-50 dark:bg-orange-950/20'
      case 'cancelled': return 'border-red-500 text-red-700 bg-red-50 dark:bg-red-950/20'
      default: return 'border-gray-500 text-gray-700 bg-gray-50 dark:bg-gray-950/20'
    }
  }

  const getPaymentStatusVariant = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid': return 'default'
      case 'pending': return 'secondary'
      case 'failed': return 'destructive'
      default: return 'secondary'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Link to={`/admin/orders/${order.id}`}>
      <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold text-sm">#{order.orderNumber || order.id.slice(-6).toUpperCase()}</p>
            <Badge variant="outline" className={`text-xs capitalize border-2 ${getStatusColor(order.status)}`}>
              {order.status}
            </Badge>
            <Badge 
              variant="default"
              className={`text-xs text-white ${
                order.paymentStatus === 'paid' 
                  ? 'bg-blue-500 hover:bg-blue-600 border-blue-500' 
                  : order.paymentStatus === 'pending'
                  ? 'bg-orange-500 hover:bg-orange-600 border-orange-500'
                  : 'bg-red-500 hover:bg-red-600 border-red-500'
              }`}
            >
              {order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus === 'pending' ? 'Pending' : 'Failed'}
            </Badge>
          </div>
          <p className="text-sm font-medium truncate">{order.customer}</p>
          {order.customerEmail && (
            <p className="text-xs text-muted-foreground truncate">{order.customerEmail}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {order.createdAt ? formatDate(order.createdAt) : ''}
          </p>
        </div>
        <div className="text-right ml-4">
          <p className="font-semibold text-sm">{order.total.toLocaleString('vi-VN')}₫</p>
          <p className="text-xs text-muted-foreground capitalize mt-1">
            {order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod}
          </p>
        </div>
      </div>
    </Link>
  )
}

const MostSellingProduct = ({ product, rank }: { product: any; rank: number }) => (
  <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
    <div className="flex-shrink-0">
      {rank === 1 && <Award className="h-5 w-5 text-yellow-500" />}
      {rank === 2 && <Award className="h-5 w-5 text-gray-400" />}
      {rank === 3 && <Award className="h-5 w-5 text-amber-600" />}
      {rank > 3 && <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>}
    </div>
    {product.image && (
      <img
        src={product.image}
        alt={product.name}
        className="w-12 h-12 object-cover rounded"
      />
    )}
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm truncate">{product.name}</p>
      <p className="text-xs text-muted-foreground">
        {product.sold} sold • {product.revenue.toLocaleString('vi-VN')}₫
      </p>
    </div>
  </div>
)

const TopCustomer = ({ customer, rank }: { customer: any; rank: number }) => (
  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gradient-hero rounded-full flex items-center justify-center text-white font-bold">
        {rank}
      </div>
      <div>
        <p className="font-medium text-sm">{customer.name}</p>
        <p className="text-xs text-muted-foreground">{customer.email}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="font-medium text-sm">{customer.totalSpent.toLocaleString('vi-VN')}₫</p>
      <p className="text-xs text-muted-foreground">{customer.orderCount} orders</p>
    </div>
  </div>
)

interface AnalyticsData {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  avgOrderValue: number
  recentOrders: Array<{
    id: string
    orderNumber: string
    customer: string
    customerEmail?: string
    total: number
    status: string
    paymentStatus: string
    paymentMethod: string
    createdAt: string
  }>
  mostSellingProducts: Array<{
    name: string
    image?: string
    sold: number
    revenue: number
  }>
  weeklyTopCustomers: Array<{
    id: string
    name: string
    email: string
    totalSpent: number
    orderCount: number
  }>
}

export default function AdminDashboard() {
  const { toast } = useToast()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await getAnalytics()
        setAnalytics(res)
      } catch (error: any) {
        console.error('Failed to load analytics:', error)
        toast({
          title: "Error",
          description: error.message || "Failed to load dashboard data",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [toast])

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded-xl"></div>
            ))}
          </div>
        </div>
      </AdminLayout>
    )
  }

  const recentOrders = analytics?.recentOrders || []
  const mostSellingProducts = analytics?.mostSellingProducts || []
  const weeklyTopCustomers = analytics?.weeklyTopCustomers || []

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Family shoe store management</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Revenue"
            value={`${(analytics?.totalRevenue || 0).toLocaleString('vi-VN')}₫`}
            description="from delivered orders"
            icon={DollarSign}
          />
          <KPICard
            title="Orders"
            value={analytics?.totalOrders || 0}
            description="total orders"
            icon={ShoppingCart}
          />
          <KPICard
            title="Customers"
            value={analytics?.totalCustomers || 0}
            description="registered customers"
            icon={Users}
          />
          <KPICard
            title="Avg Value"
            value={`${Math.round(analytics?.avgOrderValue || 0).toLocaleString('vi-VN')}₫`}
            description="average order value"
            icon={TrendingUp}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest orders in the system</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/orders">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map(order => (
                  <RecentOrder key={order.id} order={order} />
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No recent orders</p>
              )}
            </CardContent>
          </Card>

          {/* Most Selling Products */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Most Selling Products
                  </CardTitle>
                  <CardDescription>Top 5 best sellers</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/products">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {mostSellingProducts.length > 0 ? (
                mostSellingProducts.map((product, index) => (
                  <MostSellingProduct key={index} product={product} rank={index + 1} />
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No sales data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Weekly Top Customers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Weekly Top Customers
                  </CardTitle>
                  <CardDescription>Last 7 days</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/customers">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {weeklyTopCustomers.length > 0 ? (
                weeklyTopCustomers.map((customer, index) => (
                  <TopCustomer key={customer.id} customer={customer} rank={index + 1} />
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No customer data this week</p>
              )}
            </CardContent>
          </Card>
        </div>


      </div>
    </AdminLayout>
  )
}
