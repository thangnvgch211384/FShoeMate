import { useState, useEffect, useMemo } from "react"
import { 
  Tag, 
  Search, 
  MoreVertical, 
  Eye, 
  Edit,
  Copy,
  Plus,
  Calendar,
  Percent,
  Gift,
  Trash2,
  Save,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { fetchVouchers, createVoucher, updateVoucher, deleteVoucher, getVoucherUsageHistory, fetchProducts } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Voucher {
  _id: string
  code: string
  discountType: 'percentage' | 'fixed' | 'shipping'
  discountValue: number
  maxDiscount?: number
  membershipLevel?: 'silver' | 'gold' | 'diamond' | null
  minOrderValue: number
  maxUses: number
  usedCount: number
  applicableProducts?: string[]
  startDate?: string
  endDate?: string
  isActive: boolean
  createdAt?: string
  status?: 'active' | 'inactive' | 'expired'
}

interface Product {
  _id: string
  name: string
  brand?: string
}

const StatusBadge = ({ status }: { status: string }) => {
  const variants = {
    active: { variant: "default" as const, class: "bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-300" },
    inactive: { variant: "secondary" as const, class: "bg-gray-100 text-gray-800 dark:bg-gray-950/20 dark:text-gray-300" },
    expired: { variant: "destructive" as const, class: "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-300" }
  }
  
  const config = variants[status as keyof typeof variants] || variants.inactive
  
  return (
    <Badge variant={config.variant} className={config.class}>
      {status === 'active' && 'Active'}
      {status === 'inactive' && 'Inactive'}
      {status === 'expired' && 'Expired'}
    </Badge>
  )
}

const TypeBadge = ({ type }: { type: string }) => {
  const variants = {
    percentage: { icon: Percent, class: "bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300" },
    fixed: { icon: Tag, class: "bg-purple-100 text-purple-800 dark:bg-purple-950/20 dark:text-purple-300" },
    shipping: { icon: Gift, class: "bg-orange-100 text-orange-800 dark:bg-orange-950/20 dark:text-orange-300" }
  }
  
  const config = variants[type as keyof typeof variants] || variants.fixed
  const Icon = config.icon
  
  return (
    <Badge variant="outline" className={config.class}>
      <Icon className="h-3 w-3 mr-1" />
      {type === 'percentage' && 'Percentage'}
      {type === 'fixed' && 'Fixed'}
      {type === 'shipping' && 'Shipping'}
    </Badge>
  )
}

export default function AdminVouchers() {
  const { toast } = useToast()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [discountTypeFilter, setDiscountTypeFilter] = useState<string>("all")
  const [startDateFilter, setStartDateFilter] = useState<string>("")
  const [endDateFilter, setEndDateFilter] = useState<string>("")
  
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const [voucherToDelete, setVoucherToDelete] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  const [usageHistory, setUsageHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  useEffect(() => {
    loadVouchers()
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoadingProducts(true)
      const res = await fetchProducts({ limit: 1000 })
      const items = res.items || res.products || []
      setProducts(items.map((p: any) => ({
        _id: p._id,
        name: p.name,
        brand: p.brand
      })))
    } catch (error: any) {
      console.error("Failed to load products:", error)
    } finally {
      setLoadingProducts(false)
    }
  }

  const loadVouchers = async () => {
    try {
      setLoading(true)
      const res = await fetchVouchers()
      setVouchers(res.promotions || [])
    } catch (error: any) {
      console.error("Failed to load vouchers:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load vouchers",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getVoucherStatus = (voucher: Voucher): 'active' | 'inactive' | 'expired' => {
    // First check if manually set to inactive
    if (!voucher.isActive) return 'inactive'
    
    const now = new Date()
    
    // Check if expired by end date
    if (voucher.endDate && new Date(voucher.endDate) < now) return 'expired'
    
    // Check if not started yet (startDate in future)
    if (voucher.startDate && new Date(voucher.startDate) > now) return 'inactive'
    
    // Check if expired by max uses
    if (voucher.maxUses > 0 && voucher.usedCount >= voucher.maxUses) return 'expired'
    
    // Otherwise active
    return 'active'
  }

  const filteredVouchers = useMemo(() => {
    return vouchers.filter(voucher => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.trim().toLowerCase()
        const code = voucher.code.toLowerCase()
        
        const matchesSearch = code.includes(searchLower)
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== "all") {
        const status = getVoucherStatus(voucher)
        if (status !== statusFilter) return false
      }

      // Discount type filter
      if (discountTypeFilter !== "all") {
        if (voucher.discountType !== discountTypeFilter) return false
      }

      // Start date filter
      if (startDateFilter) {
        const filterStartDate = new Date(startDateFilter)
        filterStartDate.setHours(0, 0, 0, 0)
        
        if (voucher.startDate) {
          const voucherStartDate = new Date(voucher.startDate)
          voucherStartDate.setHours(0, 0, 0, 0)
          if (voucherStartDate < filterStartDate) return false
        } else {
          // If voucher has no startDate but filter is set, exclude it
          return false
        }
      }

      // End date filter
      if (endDateFilter) {
        const filterEndDate = new Date(endDateFilter)
        filterEndDate.setHours(23, 59, 59, 999)
        
        if (voucher.endDate) {
          const voucherEndDate = new Date(voucher.endDate)
          voucherEndDate.setHours(23, 59, 59, 999)
          if (voucherEndDate > filterEndDate) return false
        } else {
          // If voucher has no endDate but filter is set, exclude it
          return false
        }
      }

      return true
    })
  }, [vouchers, searchTerm, statusFilter, discountTypeFilter, startDateFilter, endDateFilter])

  const hasActiveFilters = statusFilter !== "all" || 
                          discountTypeFilter !== "all" || 
                          searchTerm ||
                          startDateFilter ||
                          endDateFilter

  const clearFilters = () => {
    setStatusFilter("all")
    setDiscountTypeFilter("all")
    setSearchTerm("")
    setStartDateFilter("")
    setEndDateFilter("")
  }

  const stats = useMemo(() => ({
    total: filteredVouchers.length,
    active: filteredVouchers.filter(v => getVoucherStatus(v) === 'active').length,
    expired: filteredVouchers.filter(v => getVoucherStatus(v) === 'expired').length,
    totalUsed: filteredVouchers.reduce((sum, v) => sum + v.usedCount, 0)
  }), [filteredVouchers])

  const handleCreateVoucher = () => {
    setEditingVoucher({
      _id: "",
      code: "",
      discountType: "percentage",
      discountValue: 0,
      maxDiscount: undefined,
      membershipLevel: null,
      minOrderValue: 0,
      maxUses: 0,
      usedCount: 0,
      applicableProducts: [],
      startDate: undefined,
      endDate: undefined,
      isActive: true
    })
  }

  const handleEditVoucher = (voucher: Voucher) => {
    setEditingVoucher({ 
      ...voucher,
      membershipLevel: voucher.membershipLevel || null,
      applicableProducts: voucher.applicableProducts || [],
      isActive: voucher.isActive !== undefined ? voucher.isActive : true
    })
  }

  const handleViewUsageHistory = async (voucher: Voucher) => {
    setSelectedVoucher(voucher)
    try {
      setLoadingHistory(true)
      const res = await getVoucherUsageHistory(voucher._id)
      setUsageHistory(res.history || [])
    } catch (error: any) {
      console.error("Failed to load usage history:", error)
      let errorMessage = "Failed to load usage history"
      try {
        // Try to parse error message from response
        if (error.message) {
          const parsed = typeof error.message === 'string' ? JSON.parse(error.message) : error.message
          errorMessage = parsed.message || parsed.error || errorMessage
        }
      } catch {
        // If parsing fails, use the error message as is
        errorMessage = error.message || errorMessage
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSaveVoucher = async () => {
    if (!editingVoucher) return

    if (!editingVoucher.code.trim()) {
      toast({
        title: "Validation Error",
        description: "Code is required",
        variant: "destructive"
      })
      return
    }

    if (editingVoucher.discountValue < 0) {
      toast({
        title: "Validation Error",
        description: "Discount value must be >= 0",
        variant: "destructive"
      })
      return
    }

    if (editingVoucher.maxDiscount && editingVoucher.maxDiscount < 0) {
      toast({
        title: "Validation Error",
        description: "Max discount must be >= 0",
        variant: "destructive"
      })
      return
    }

    if (editingVoucher.minOrderValue < 0) {
      toast({
        title: "Validation Error",
        description: "Min order value must be >= 0",
        variant: "destructive"
      })
      return
    }

    if (editingVoucher.maxUses < 0) {
      toast({
        title: "Validation Error",
        description: "Max uses must be >= 0",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        code: editingVoucher.code.toUpperCase().trim(),
        discountType: editingVoucher.discountType,
        discountValue: Number(editingVoucher.discountValue),
        minOrderValue: Number(editingVoucher.minOrderValue),
        maxUses: Number(editingVoucher.maxUses),
        isActive: editingVoucher.isActive === true
      }

      // Optional fields - only include if they have values
      if (editingVoucher.maxDiscount) payload.maxDiscount = Number(editingVoucher.maxDiscount)
      if (editingVoucher.membershipLevel) payload.membershipLevel = editingVoucher.membershipLevel
      if (editingVoucher.applicableProducts && editingVoucher.applicableProducts.length > 0) {
        payload.applicableProducts = editingVoucher.applicableProducts
      }
      if (editingVoucher.startDate) payload.startDate = editingVoucher.startDate
      if (editingVoucher.endDate) payload.endDate = editingVoucher.endDate

      if (editingVoucher._id) {
        await updateVoucher(editingVoucher._id, payload)
        toast({
          title: "Success",
          description: "Voucher updated successfully",
        })
      } else {
        await createVoucher(payload)
        toast({
          title: "Success",
          description: "Voucher created successfully",
        })
      }
      setEditingVoucher(null)
      loadVouchers()
    } catch (error: any) {
      console.error("Failed to save voucher:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save voucher",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteVoucher = async () => {
    if (!voucherToDelete) return

    setSaving(true)
    try {
      await deleteVoucher(voucherToDelete)
      toast({
        title: "Success",
        description: "Voucher deleted successfully",
      })
      setVoucherToDelete(null)
      loadVouchers()
    } catch (error: any) {
      console.error("Failed to delete voucher:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete voucher",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Code copied to clipboard",
    })
  }

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
              <Tag className="h-8 w-8" />
              Voucher Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Create and manage discount vouchers
            </p>
          </div>
          <Button className="bg-gradient-hero hover:opacity-90" onClick={handleCreateVoucher}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Voucher
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center">
                  <Tag className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total vouchers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <Tag className="h-6 w-6 text-white" />
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
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.expired}</p>
                  <p className="text-sm text-muted-foreground">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Gift className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsed}</p>
                  <p className="text-sm text-muted-foreground">Usage count</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card>
          <CardHeader>
            <CardTitle>Voucher List</CardTitle>
          </CardHeader>
          
          {/* Filter Panel - Always visible */}
          <div className="px-6 pb-4 border-b space-y-4">
            {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                placeholder="Search by code"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                  />
                </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Discount Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Discount Type</label>
                <Select value={discountTypeFilter} onValueChange={setDiscountTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="shipping">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date From</label>
                <Input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* End Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date To</label>
                <Input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full"
                />
              </div>

            </div>
          </div>

          <CardContent>
            {filteredVouchers.length === 0 ? (
              <div className="text-center py-12">
                {vouchers.length === 0 ? (
                  <>
                    <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No vouchers found</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first voucher to get started.
                    </p>
                    <Button onClick={handleCreateVoucher}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Voucher
                    </Button>
                  </>
                ) : (
                  <>
                    <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No vouchers match your filters</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your search or filter criteria.
                    </p>
                    <Button variant="outline" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </>
                )}
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>Voucher Code</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredVouchers.map((voucher) => {
                    const status = getVoucherStatus(voucher)
                    return (
                      <TableRow key={voucher._id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="font-mono font-semibold text-primary">
                        {voucher.code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                            <p className="font-medium">{voucher.code}</p>
                            {voucher.membershipLevel && (
                              <Badge variant="outline" className="mt-1 text-xs ">
                                {voucher.membershipLevel.charAt(0).toUpperCase() + voucher.membershipLevel.slice(1)} Only
                              </Badge>
                            )}
                            {voucher.applicableProducts && voucher.applicableProducts.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {voucher.applicableProducts.length} product(s)
                              </p>
                            )}
                      </div>
                    </TableCell>
                    <TableCell>
                          <TypeBadge type={voucher.discountType} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                            {voucher.discountType === 'percentage' ? (
                              <p className="font-semibold">{voucher.discountValue}%</p>
                        ) : (
                              <p className="font-semibold">{voucher.discountValue.toLocaleString('vi-VN')}₫</p>
                        )}
                        {voucher.maxDiscount && (
                          <p className="text-xs text-muted-foreground">
                                Maximum: {voucher.maxDiscount.toLocaleString('vi-VN')}₫
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{voucher.usedCount}</span>
                              <span>{voucher.maxUses || '∞'}</span>
                        </div>
                            {voucher.maxUses > 0 && (
                        <Progress 
                                value={(voucher.usedCount / voucher.maxUses) * 100} 
                          className="h-2"
                        />
                            )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                            {voucher.startDate ? (
                              <>
                                <p>{new Date(voucher.startDate).toLocaleDateString('vi-VN')}</p>
                                {voucher.endDate && (
                                  <p className="text-muted-foreground">until {new Date(voucher.endDate).toLocaleDateString('vi-VN')}</p>
                                )}
                              </>
                            ) : (
                              <p className="text-muted-foreground">No date limit</p>
                            )}
                      </div>
                    </TableCell>
                    <TableCell>
                          <StatusBadge status={status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewUsageHistory(voucher)}>
                            <Eye className="h-4 w-4 mr-2" />
                              View Usage History
                          </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditVoucher(voucher)}>
                            <Edit className="h-4 w-4 mr-2" />
                              Edit
                          </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyToClipboard(voucher.code)}>
                            <Copy className="h-4 w-4 mr-2" />
                              Copy Code
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setVoucherToDelete(voucher._id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Voucher Dialog */}
        {editingVoucher && (
          <Dialog open={!!editingVoucher} onOpenChange={() => setEditingVoucher(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingVoucher._id ? "Edit Voucher" : "Create Voucher"}</DialogTitle>
                <DialogDescription>
                  {editingVoucher._id ? "Update voucher information" : "Create a new voucher"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={editingVoucher.code}
                    onChange={(e) => setEditingVoucher({ ...editingVoucher, code: e.target.value })}
                    placeholder="WELCOME10"
                    disabled={!!editingVoucher._id}
                  />
                  <p className="text-xs text-muted-foreground">
                    Voucher code that customers will enter at checkout
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discountType">Discount Type *</Label>
                    <Select
                      value={editingVoucher.discountType}
                      onValueChange={(value: 'percentage' | 'fixed' | 'shipping') =>
                        setEditingVoucher({ ...editingVoucher, discountType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="shipping">Free Shipping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discountValue">Discount Value *</Label>
                    <Input
                      id="discountValue"
                      type="number"
                      value={editingVoucher.discountValue}
                      onChange={(e) => setEditingVoucher({ ...editingVoucher, discountValue: Number(e.target.value) })}
                      min="0"
                      step={editingVoucher.discountType === 'percentage' ? "1" : "1000"}
                    />
                  </div>
                </div>

                {editingVoucher.discountType === 'percentage' && (
                  <div className="space-y-2">
                    <Label htmlFor="maxDiscount">Max Discount (₫)</Label>
                    <Input
                      id="maxDiscount"
                      type="number"
                      value={editingVoucher.maxDiscount || ""}
                      onChange={(e) => setEditingVoucher({ ...editingVoucher, maxDiscount: e.target.value ? Number(e.target.value) : undefined })}
                      min="0"
                      step="1000"
                      placeholder="Optional"
                    />
                  </div>
                )}


                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minOrderValue">Min Order Value (₫)</Label>
                    <Input
                      id="minOrderValue"
                      type="number"
                      value={editingVoucher.minOrderValue}
                      onChange={(e) => setEditingVoucher({ ...editingVoucher, minOrderValue: Number(e.target.value) })}
                      min="0"
                      step="1000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxUses">Max Uses (0 = unlimited)</Label>
                    <Input
                      id="maxUses"
                      type="number"
                      value={editingVoucher.maxUses}
                      onChange={(e) => setEditingVoucher({ ...editingVoucher, maxUses: Number(e.target.value) })}
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="membershipLevel">Membership Level (Optional)</Label>
                  <Select
                    value={editingVoucher.membershipLevel || "none"}
                    onValueChange={(value) => 
                      setEditingVoucher({ 
                        ...editingVoucher, 
                        membershipLevel: value === "none" ? null : value as 'silver' | 'gold' | 'diamond'
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select membership level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Available for all)</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="diamond">Diamond</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Leave as "None" to make promotion available for all users
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Applicable Products (Optional)</Label>
                  <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                    {loadingProducts ? (
                      <p className="text-sm text-muted-foreground">Loading products...</p>
                    ) : products.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No products available</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 mb-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (editingVoucher) {
                                const allProductIds = products.map(p => p._id)
                                setEditingVoucher({
                                  ...editingVoucher,
                                  applicableProducts: allProductIds
                                })
                              }
                            }}
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (editingVoucher) {
                                setEditingVoucher({
                                  ...editingVoucher,
                                  applicableProducts: []
                                })
                              }
                            }}
                          >
                            Clear All
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {editingVoucher?.applicableProducts?.length || 0} selected
                          </span>
                        </div>
                        {products.map((product) => (
                          <div key={product._id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`product-${product._id}`}
                              checked={editingVoucher?.applicableProducts?.includes(product._id) || false}
                              onCheckedChange={(checked) => {
                                if (editingVoucher) {
                                  const current = editingVoucher.applicableProducts || []
                                  if (checked) {
                                    setEditingVoucher({
                                      ...editingVoucher,
                                      applicableProducts: [...current, product._id]
                                    })
                                  } else {
                                    setEditingVoucher({
                                      ...editingVoucher,
                                      applicableProducts: current.filter(id => id !== product._id)
                                    })
                                  }
                                }
                              }}
                            />
                            <Label 
                              htmlFor={`product-${product._id}`}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {product.name} {product.brand && `(${product.brand})`}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to make promotion applicable to all products. Select specific products to restrict promotion.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date (Optional)</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={editingVoucher.startDate ? new Date(editingVoucher.startDate).toISOString().slice(0, 16) : ""}
                      onChange={(e) => {
                        const value = e.target.value
                        setEditingVoucher({ 
                          ...editingVoucher, 
                          startDate: value ? new Date(value).toISOString() : undefined 
                        })
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to activate immediately
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date (Optional)</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={editingVoucher.endDate ? new Date(editingVoucher.endDate).toISOString().slice(0, 16) : ""}
                      onChange={(e) => {
                        const value = e.target.value
                        setEditingVoucher({ 
                          ...editingVoucher, 
                          endDate: value ? new Date(value).toISOString() : undefined 
                        })
                      }}
                      min={editingVoucher.startDate ? new Date(editingVoucher.startDate).toISOString().slice(0, 16) : undefined}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for no expiration
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={editingVoucher.isActive}
                    onCheckedChange={(checked) => setEditingVoucher({ ...editingVoucher, isActive: !!checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingVoucher(null)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveVoucher} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Usage History Dialog */}
        {selectedVoucher && (
          <Dialog open={!!selectedVoucher} onOpenChange={() => setSelectedVoucher(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Voucher Usage History</DialogTitle>
                <DialogDescription>
                  View who used the voucher code: <span className="font-mono font-semibold">{selectedVoucher.code}</span>
                </DialogDescription>
              </DialogHeader>
              
              {loadingHistory ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                </div>
              ) : usageHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No usage history found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Order Total</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageHistory.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">
                            {item.orderId?.slice(-8) || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.userName || 'Guest'}</p>
                              <p className="text-sm text-muted-foreground">{item.userEmail || 'N/A'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {item.orderTotal.toLocaleString('vi-VN')}₫
                          </TableCell>
                          <TableCell className="text-red-600 font-semibold">
                            -{item.discountAmount.toLocaleString('vi-VN')}₫
                          </TableCell>
                          <TableCell>
                            {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedVoucher(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!voucherToDelete} onOpenChange={(open) => !open && setVoucherToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Voucher?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this voucher? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteVoucher}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700"
              >
                {saving ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
    </AdminLayout>
  )
}
