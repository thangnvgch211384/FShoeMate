import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Package,
  Image as ImageIcon,
  DollarSign
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { fetchProducts, deleteProduct } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { fetchCategories } from "@/lib/api"

interface Product {
  _id: string
  name: string
  slug?: string
  brand: string
  price: number
  originalPrice?: number
  categoryId?: string
  category?: { id: string; name: string }
  categoryName?: string
  isFeatured?: boolean
  isNew?: boolean
  isOnSale?: boolean
  status?: "active" | "inactive"
  targetAudience?: string[]
  sizes?: string[]
  colors?: { name: string; hex: string; images?: string[] }[]
}


export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load products
      const productsRes = await fetchProducts({ limit: 1000, includeInactive: "true" })
      // Backend returns { items, total, page, limit }
      setProducts(productsRes.items || productsRes.products || [])

      // Load categories
      try {
        const categoriesRes = await fetchCategories()
        // Get all categories (including parent and child)
        const allCategories = categoriesRes.all || categoriesRes.categories || []
        
        // Filter to only show child categories (categories with parentId)
        const childCategories = allCategories.filter((cat: any) => cat.parentId)
        
        // Get parent categories for display name formatting
        const parents = allCategories.filter((cat: any) => !cat.parentId)
        const parentMap = new Map(parents.map((p: any) => [p.id, p.name]))
        
        // Format child categories with parent name prefix (e.g., "Men > Running")
        const formattedCategories = childCategories.map((cat: any) => {
          const parentName = parentMap.get(cat.parentId) || ""
          const displayName = parentName ? `${parentName} > ${cat.name}` : cat.name
          return {
            id: cat.id,
            name: displayName
          }
        })
        
        // Sort by parent name, then by child name
        formattedCategories.sort((a, b) => {
          return a.name.localeCompare(b.name)
        })
        
        setCategories(formattedCategories)
      } catch (catError) {
        console.error("Failed to load categories:", catError)
      }
    } catch (error: any) {
      console.error("Failed to load products:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load products",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!productId) return

    setDeleting(true)
    try {
      await deleteProduct(productId)
      toast({
        title: "Success",
        description: "Product deleted successfully",
      })
      setProductToDelete(null)
      loadData() // Reload products
    } catch (error: any) {
      console.error("Failed to delete product:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive"
      })
    } finally {
      setDeleting(false)
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch =
          product.name.toLowerCase().includes(searchLower) ||
          product.brand.toLowerCase().includes(searchLower) ||
          (product.slug && product.slug.toLowerCase().includes(searchLower))
        if (!matchesSearch) return false
      }

      // Category filter
      if (filterCategory !== "all") {
        const productCategoryId = product.categoryId || product.category?.id
        if (productCategoryId !== filterCategory) return false
      }

      return true
    })
  }, [products, searchTerm, filterCategory])

  const stats = useMemo(() => {
    const total = filteredProducts.length
    const outOfStock = 0 // We don't have stock info at product level, only in variants
    const uniqueCategories = new Set(filteredProducts.map(p => p.categoryId || p.category?.id).filter(Boolean)).size
    const totalValue = filteredProducts.reduce((sum, p) => sum + p.price, 0)

    return { total, outOfStock, uniqueCategories, totalValue }
  }, [filteredProducts])

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text">Product management</h1>
            <p className="text-muted-foreground mt-2">
              {stats.total} products • Total value: {stats.totalValue.toLocaleString('vi-VN')}₫
            </p>
          </div>
          <Button asChild className="bg-gradient-hero hover:opacity-90">
            <Link to="/admin/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Add product
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold gradient-text">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of stock</CardTitle>
              <Package className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {stats.outOfStock}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold gradient-text">{stats.uniqueCategories}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold gradient-text">
                {(stats.totalValue / 1000000).toFixed(1)}M
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>

        {/* Products Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredProducts.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const image = (() => {
                      if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
                        const firstColor = product.colors[0]
                        if (typeof firstColor === 'object' && firstColor.images && firstColor.images.length > 0) {
                          return firstColor.images[0]
                        }
                      }
                      return ""
                    })()
                    const categoryName = product.category?.name || product.categoryName || "Uncategorized"

                    return (
                      <TableRow key={product._id}>
                        <TableCell>
                          {image ? (
                            <img
                              src={image}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                              No Image
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.slug || product._id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{product.brand}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{categoryName}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-semibold">
                              {product.price.toLocaleString('vi-VN')}₫
                            </div>
                            {product.originalPrice && product.originalPrice > product.price && (
                              <div className="text-xs text-muted-foreground line-through">
                                {product.originalPrice.toLocaleString('vi-VN')}₫
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.status === "active" ? "default" : "secondary"}>
                            {product.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {product.isFeatured && (
                              <Badge className="bg-yellow-500 text-white">Featured</Badge>
                            )}
                            {product.isNew && (
                              <Badge variant="default">New</Badge>
                            )}
                            {product.isOnSale && (
                              <Badge variant="destructive">Sale</Badge>
                            )}
                            {!product.isFeatured && !product.isNew && !product.isOnSale && (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/products/${product.slug || product._id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>

                            <Button asChild size="sm" variant="outline">
                              <Link to={`/admin/products/${product._id}/edit`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>

                            <Button asChild size="sm" variant="outline">
                              <Link to={`/admin/products/${product._id}/variants`}>
                                <Package className="h-4 w-4" />
                              </Link>
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setProductToDelete(product._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-6">
                Try changing the search keyword or filter
              </p>
              <Button asChild>
                <Link to="/admin/products/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add new product
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this product? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => productToDelete && handleDelete(productToDelete)}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  )
}