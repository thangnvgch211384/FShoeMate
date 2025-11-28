import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Package, AlertTriangle, TrendingUp, Search, X, MoreVertical, TrendingDown, History } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { fetchAllVariants, adjustVariantStock, getVariantDetail } from "@/lib/api"

interface Variant {
  _id: string
  productId: {
    _id: string
    name: string
    brand?: string
    categoryName?: string
    colors?: { name: string; hex: string; images?: string[] }[]
  }
  size: string
  color: string
  price: number
  discountPrice?: number
  stock: number
  images?: string[]
  stockHistory?: Array<{
    type: "import" | "export"
    quantity: number
    reason?: string
    supplier?: string
    date: string | Date
  }>
}

const StatusBadge = ({ stock }: { stock: number }) => {
  if (stock === 0) {
    return (
      <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Out of Stock
      </Badge>
    )
  }
  if (stock <= 5) {
    return (
      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Low Stock
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
      <Package className="w-3 h-3 mr-1" />
      In Stock
    </Badge>
  )
}

export default function AdminInventory() {
  const { toast } = useToast()
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sizeFilter, setSizeFilter] = useState<string>("all")

  const [saving, setSaving] = useState(false)

  const [showStockDialog, setShowStockDialog] = useState(false)
  const [stockAdjustment, setStockAdjustment] = useState({
    variantId: "",
    type: "import" as "import" | "export",
    quantity: "",
    reason: "",
    supplier: ""
  })

  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [selectedVariantForHistory, setSelectedVariantForHistory] = useState<Variant | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    loadInventory()
  }, [statusFilter])

  const loadInventory = async () => {
    try {
      setLoading(true)
      const res = await fetchAllVariants({
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined
      })
      // Filter out variants with deleted products (productId is null or undefined)
      const validVariants = (res.variants || []).filter(v => v.productId && v.productId._id)
      setVariants(validVariants)
    } catch (error: any) {
      console.error("Error fetching inventory:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load inventory",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadInventory()
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Lấy danh sách sizes có sẵn từ variants
  const availableSizes = useMemo(() => {
    const sizes = new Set<string>()
    variants.forEach(v => {
      if (v.size) sizes.add(v.size)
    })
    return Array.from(sizes).sort((a, b) => {
      // Sort sizes: numbers first, then letters
      const numA = parseInt(a)
      const numB = parseInt(b)
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      if (!isNaN(numA)) return -1
      if (!isNaN(numB)) return 1
      return a.localeCompare(b)
    })
  }, [variants])

  const filteredVariants = useMemo(() => {
    // Filter out variants with deleted products first
    let validVariants = variants.filter(v => v.productId && v.productId._id)
    
    // Filter by size
    if (sizeFilter !== "all") {
      validVariants = validVariants.filter(v => v.size === sizeFilter)
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      validVariants = validVariants.filter(v =>
        v.productId?.name?.toLowerCase().includes(searchLower) ||
        `${v.size} ${v.color}`.toLowerCase().includes(searchLower) ||
        v.productId?.brand?.toLowerCase().includes(searchLower) ||
        v.productId?.categoryName?.toLowerCase().includes(searchLower)
      )
    }
    
    return validVariants
  }, [variants, searchTerm, sizeFilter])

  const stats = useMemo(() => {
    const totalVariants = variants.length
    const lowStock = variants.filter(v => v.stock > 0 && v.stock <= 5).length
    const outOfStock = variants.filter(v => v.stock === 0).length
    const totalValue = variants.reduce((sum, v) => sum + (v.stock * v.price), 0)
    const inStock = variants.filter(v => v.stock > 5).length

    return {
      totalVariants,
      lowStock,
      outOfStock,
      totalValue,
      inStock
    }
  }, [variants])

  const hasActiveFilters = statusFilter !== "all" || sizeFilter !== "all" || searchTerm

  const clearFilters = () => {
    setStatusFilter("all")
    setSizeFilter("all")
    setSearchTerm("")
  }

  const handleOpenStockDialog = (variant: Variant) => {
    setStockAdjustment({
      variantId: variant._id,
      type: "import",
      quantity: "",
      reason: "",
      supplier: ""
    })
    setShowStockDialog(true)
  }

  const handleAdjustStock = async () => {
    if (!stockAdjustment.quantity || Number(stockAdjustment.quantity) <= 0) {
      toast({
        title: "Validation Error",
        description: "Quantity must be > 0",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        type: stockAdjustment.type,
        quantity: Number(stockAdjustment.quantity)
      }

      // Only include reason and supplier if they have values
      if (stockAdjustment.reason && stockAdjustment.reason.trim()) {
        payload.reason = stockAdjustment.reason.trim()
      }

      if (stockAdjustment.supplier && stockAdjustment.supplier.trim()) {
        payload.supplier = stockAdjustment.supplier.trim()
      }

      await adjustVariantStock(stockAdjustment.variantId, payload)
      toast({
        title: "Success",
        description: "Stock adjusted successfully",
      })
      setShowStockDialog(false)
      setStockAdjustment({
        variantId: "",
        type: "import",
        quantity: "",
        reason: "",
        supplier: ""
      })
      loadInventory()
    } catch (error: any) {
      console.error("Failed to adjust stock:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to adjust stock",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text">Inventory Management</h1>
            <p className="text-muted-foreground mt-2">
              Track and monitor all product variants stock levels
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalVariants}</p>
                  <p className="text-sm text-muted-foreground">Total Variants</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inStock}</p>
                  <p className="text-sm text-muted-foreground">In Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
                  <p className="text-sm text-muted-foreground">Out of Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inventory List</CardTitle>
          </CardHeader>

          <div className="px-6 pb-4 border-b space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name, size, color, brand or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low">Low Stock (≤5)</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Size</label>
                <div className="flex gap-2">
                  <Select value={sizeFilter} onValueChange={setSizeFilter}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="All sizes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sizes</SelectItem>
                      {availableSizes.map(size => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
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
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading inventory...</p>
              </div>
            ) : filteredVariants.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No variants found</h3>
                <p className="text-muted-foreground mb-4">
                  {variants.length === 0
                    ? "No variants in inventory yet."
                    : "Try adjusting your search or filter criteria."}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVariants.map((variant) => (
                      <TableRow key={variant._id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {(() => {
                              // Get image from variant first, then from product colors
                              if (variant.images?.[0]) {
                                return variant.images[0]
                              }
                              if (variant.productId?.colors && Array.isArray(variant.productId.colors) && variant.productId.colors.length > 0) {
                                const firstColor = variant.productId.colors[0]
                                if (typeof firstColor === 'object' && firstColor.images && firstColor.images.length > 0) {
                                  return firstColor.images[0]
                                }
                              }
                              return null
                            })() ? (
                              <img
                                src={(() => {
                                  if (variant.images?.[0]) return variant.images[0]
                                  if (variant.productId?.colors && Array.isArray(variant.productId.colors) && variant.productId.colors.length > 0) {
                                    const firstColor = variant.productId.colors[0]
                                    if (typeof firstColor === 'object' && firstColor.images && firstColor.images.length > 0) {
                                      return firstColor.images[0]
                                    }
                                  }
                                  return ""
                                })()}
                                alt={variant.productId?.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{variant.productId?.name || "Unknown Product"}</p>
                              <p className="text-xs text-muted-foreground">
                                {variant.productId?.brand && `${variant.productId.brand} • `}
                                {variant.productId?.categoryName || "Uncategorized"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{variant.size}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: variant.color.toLowerCase() }}
                            />
                            <span className="text-sm">{variant.color}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <span className={`font-medium ${variant.stock === 0 ? 'text-red-600' : variant.stock <= 5 ? 'text-yellow-600' : ''}`}>
                              {variant.stock}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            {variant.discountPrice && variant.discountPrice > variant.price ? (
                              <>
                                <p className="font-medium">{variant.price.toLocaleString('vi-VN')}₫</p>
                                <p className="text-xs text-muted-foreground line-through">
                                  {variant.discountPrice.toLocaleString('vi-VN')}₫
                                </p>
                              </>
                            ) : (
                              <p className="font-medium">{variant.price.toLocaleString('vi-VN')}₫</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge stock={variant.stock} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">

                              <DropdownMenuItem onClick={() => handleOpenStockDialog(variant)}>
                                <TrendingUp className="h-4 w-4 mr-2" />
                                Adjust Stock
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={async () => {
                                setLoadingHistory(true)
                                try {
                                  const res = await getVariantDetail(variant._id)
                                  setSelectedVariantForHistory(res.variant)
                                  setShowHistoryDialog(true)
                                } catch (error: any) {
                                  toast({
                                    title: "Error",
                                    description: error.message || "Failed to load stock history",
                                    variant: "destructive"
                                  })
                                } finally {
                                  setLoadingHistory(false)
                                }
                              }}>
                                <History className="h-4 w-4 mr-2" />
                                View History
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/products/${variant.productId?._id}/variants`}>
                                  View All Variants
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>

                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Adjust Stock Dialog */}
        <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adjust Stock</DialogTitle>
              <DialogDescription>
                Import or export stock for this variant
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={stockAdjustment.type}
                  onValueChange={(value: "import" | "export") =>
                    setStockAdjustment({ ...stockAdjustment, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="import">Import (Add Stock)</SelectItem>
                    <SelectItem value="export">Export (Remove Stock)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={stockAdjustment.quantity}
                  onChange={(e) => setStockAdjustment({
                    ...stockAdjustment,
                    quantity: e.target.value
                  })}
                  placeholder="Enter quantity"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier (Optional)</Label>
                <Input
                  id="supplier"
                  value={stockAdjustment.supplier}
                  onChange={(e) => setStockAdjustment({
                    ...stockAdjustment,
                    supplier: e.target.value
                  })}
                  placeholder="Supplier name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason/Note (Optional)</Label>
                <Textarea
                  id="reason"
                  value={stockAdjustment.reason}
                  onChange={(e) => setStockAdjustment({
                    ...stockAdjustment,
                    reason: e.target.value
                  })}
                  placeholder="Add a note about this adjustment"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStockDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdjustStock} disabled={saving}>
                {saving ? "Processing..." : "Adjust Stock"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stock History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Stock History</DialogTitle>
              <DialogDescription>
                {selectedVariantForHistory && (
                  <>
                    {selectedVariantForHistory.productId?.name} - {selectedVariantForHistory.size} • {selectedVariantForHistory.color}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedVariantForHistory && (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Stock</p>
                    <p className="text-2xl font-bold">{selectedVariantForHistory.stock}</p>
                  </div>
                </div>

                {selectedVariantForHistory.stockHistory && selectedVariantForHistory.stockHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...selectedVariantForHistory.stockHistory]
                          .sort((a, b) => {
                            const dateA = new Date(a.date).getTime()
                            const dateB = new Date(b.date).getTime()
                            return dateB - dateA // Most recent first
                          })
                          .map((entry, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {new Date(entry.date).toLocaleString('vi-VN', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={entry.type === "import" ? "default" : "destructive"}
                                  className={entry.type === "import"
                                    ? "bg-green-100 text-green-800 border-green-200"
                                    : "bg-red-100 text-red-800 border-red-200"}
                                >
                                  {entry.type === "import" ? (
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                  ) : (
                                    <TrendingDown className="w-3 h-3 mr-1" />
                                  )}
                                  {entry.type === "import" ? "Import" : "Export"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {entry.type === "import" ? "+" : "-"}{entry.quantity}
                              </TableCell>
                              <TableCell>
                                {entry.supplier || (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {entry.reason || (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No Stock History</h3>
                    <p className="text-muted-foreground">
                      No stock adjustments have been made for this variant yet.
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowHistoryDialog(false)
                setSelectedVariantForHistory(null)
              }}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
