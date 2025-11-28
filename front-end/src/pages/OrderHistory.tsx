import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter,
  Eye,
  RotateCcw,
  MessageCircle,
  Star
} from "lucide-react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Container } from "@/components/layout/Container"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getOrders } from "@/lib/api"

interface OrderItem {
  id: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
  image: string;
}

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: OrderItem[];
  shippingAddress: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
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
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  const Icon = config.icon;

  return (
    <Badge variant="secondary" className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getOrders()
        const mapped = (data.orders || []).map((order: any) => ({
          id: order._id,
          orderNumber: order._id.slice(-6).toUpperCase(),
          date: order.createdAt,
          status: order.status,
          total: order.totals.total,
          items: order.items.map((item: any) => ({
            id: item.variantId,
            name: item.productSnapshot.name,
            size: item.productSnapshot.size,
            quantity: item.quantity,
            price: item.productSnapshot.price,
            image: item.productSnapshot.image || "/api/placeholder/80/80"
          })),
          shippingAddress: order.guestInfo?.address || "N/A",
          trackingNumber: order.trackingNumber
        }))
        setOrders(mapped)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesTab = activeTab === "all" || order.status === activeTab
    
    return matchesSearch && matchesTab
  })

  const getOrderCounts = () => {
    return {
      all: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
    }
  }

  const counts = getOrderCounts()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <p>Loading order history...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <Container className="py-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order history</h1>
            <p className="text-muted-foreground">
              Track and manage your orders
            </p>
          </div>

          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by order number or product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Order Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">
                All ({counts.all})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({counts.pending})
              </TabsTrigger>
              <TabsTrigger value="processing">
                Processing ({counts.processing})
              </TabsTrigger>
              <TabsTrigger value="shipped">
                Shipped ({counts.shipped})
              </TabsTrigger>
              <TabsTrigger value="delivered">
                Delivered ({counts.delivered})
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                Cancelled ({counts.cancelled})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {filteredOrders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Package className="w-16 h-16 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No orders found</h2>
                    <p className="text-muted-foreground mb-6">
                      {searchTerm 
                        ? "No orders found matching your search criteria"
                        : "You don't have any orders in this category"
                      }
                    </p>
                    <Button onClick={() => window.location.href = '/products'}>
                      Shop now
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <Card key={order.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                            <CardDescription>
                              Ordered: {new Date(order.date).toLocaleDateString('vi-VN')}
                              {order.estimatedDelivery && (
                                <span className="ml-4">
                                  Estimated delivery: {new Date(order.estimatedDelivery).toLocaleDateString('vi-VN')}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <StatusBadge status={order.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Order Items */}
                        <div className="space-y-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex gap-4">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium">{item.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Size: {item.size} | Quantity: {item.quantity}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  {item.price.toLocaleString('vi-VN')}₫
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order Summary */}
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              Shipping to: {order.shippingAddress}
                            </p>
                            {order.trackingNumber && (
                              <p className="text-sm text-muted-foreground">
                                Tracking number: {order.trackingNumber}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              Total: {order.total.toLocaleString('vi-VN')}₫
                            </p>
                          </div>
                        </div>

                        {/* Order Actions */}
                        <div className="flex flex-wrap gap-2 pt-4 border-t">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/orders/${order.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              View details
                            </Link>
                          </Button>
                          
                          {order.status === 'delivered' && (
                            <>
                              <Button variant="outline" size="sm">
                                <Star className="w-4 h-4 mr-2" />
                                Review
                              </Button>
                              <Button variant="outline" size="sm">
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Buy again
                              </Button>
                            </>
                          )}
                          
                          {order.status === 'shipped' && (
                            <Button variant="outline" size="sm">
                              <Truck className="w-4 h-4 mr-2" />
                              Track order
                            </Button>
                          )}
                          
                          <Button variant="outline" size="sm">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Contact support
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Container>

      <Footer />
    </div>
  );
}