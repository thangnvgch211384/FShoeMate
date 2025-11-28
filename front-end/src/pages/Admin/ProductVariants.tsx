import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Package,
  Save,
  X,
  Image as ImageIcon,
  Info,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { fetchProductDetail, fetchProductVariants, updateVariant, deleteVariant } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Variant {
  _id: string
  productId: string
  size: string
  color: string
  price: number
  discountPrice?: number
  stock: number
  images: string[]
  stockHistory?: Array<{
    type: "import" | "export"
    quantity: number
    note?: string
    supplier?: string
    date: Date
  }>
  createdAt?: string
  updatedAt?: string
}

export default function ProductVariants() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [product, setProduct] = useState<any>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null)
  const [variantToDelete, setVariantToDelete] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (productId) {
      loadData()
    }
  }, [productId])

  const loadData = async () => {
    if (!productId) return
    
    try {
      setLoading(true)
      const [productRes, variantsRes] = await Promise.all([
        fetchProductDetail(productId),
        fetchProductVariants(productId)
      ])
      
      setProduct(productRes.product)
      // Filter out variants with deleted products (productId is null or undefined)
      const validVariants = (variantsRes.variants || []).filter(v => v.productId && (typeof v.productId === 'string' ? v.productId : v.productId._id))
      setVariants(validVariants)
    } catch (error: any) {
      console.error("Failed to load data:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load product variants",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditVariant = (variant: Variant) => {
    setEditingVariant({ ...variant })
  }

  const handleSaveVariant = async () => {
    if (!editingVariant) return

    // Validate images
    const invalidImages = editingVariant.images.filter(img => {
      if (!img.trim()) return false
      try {
        new URL(img)
        return false
      } catch {
        return true
      }
    })

    if (invalidImages.length > 0) {
      toast({
        title: "Validation Error",
        description: "All images must be valid URLs",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      // Only update images, keep price and stock unchanged
      const payload = {
        size: editingVariant.size,
        color: editingVariant.color,
        price: editingVariant.price, // Keep existing price
        discountPrice: editingVariant.discountPrice, // Keep existing discountPrice
        stock: editingVariant.stock, // Keep existing stock
        images: editingVariant.images.filter(img => img.trim())
      }

      await updateVariant(editingVariant._id, payload)
      toast({
        title: "Success",
        description: "Variant images updated successfully",
      })
      setEditingVariant(null)
      loadData()
    } catch (error: any) {
      console.error("Failed to update variant:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update variant",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteVariant = async () => {
    if (!variantToDelete) return

    setSaving(true)
    try {
      await deleteVariant(variantToDelete)
      toast({
        title: "Success",
        description: "Variant deleted successfully",
      })
      setVariantToDelete(null)
      loadData()
    } catch (error: any) {
      console.error("Failed to delete variant:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete variant",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }


  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }).replace(/\u00a0/g, ' ')
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin/products">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold gradient-text">Product Variants</h1>
              <p className="text-muted-foreground mt-1">
                {product?.name || "Product"} - Manage variant images
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{variants.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {variants.reduce((sum, v) => sum + v.stock, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {variants.filter(v => v.stock > 0).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {variants.filter(v => v.stock === 0).length}
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Variants Table */}
        <Card>
          <CardHeader>
            <CardTitle>Variants</CardTitle>
            <CardDescription>
              Manage images for each variant. Price and stock are managed elsewhere.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {variants.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No variants found</h3>
                <p className="text-muted-foreground mb-4">
                  Variants are automatically created when you add sizes and colors to a product.
                </p>
                <Button asChild>
                  <Link to={`/admin/products/${productId}/edit`}>
                    Edit Product
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Size</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Images</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((variant) => (
                      <TableRow key={variant._id}>
                        <TableCell className="font-medium">{variant.size}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{variant.color}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">
                            {formatCurrency(variant.price)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={variant.stock > 0 ? "font-semibold" : "text-red-600"}>
                            {variant.stock}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{variant.images?.length || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setVariantToDelete(variant._id)}
                              title="Delete variant"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Variant Images Dialog */}
        {editingVariant && (
          <Dialog open={!!editingVariant} onOpenChange={() => setEditingVariant(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Variant Images</DialogTitle>
                <DialogDescription>
                  Manage images for {editingVariant.size} • {editingVariant.color}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Size</Label>
                    <Input value={editingVariant.size} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Input value={editingVariant.color} disabled />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="images">Images (URLs)</Label>
                  <div className="space-y-2">
                    {editingVariant.images.map((img, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={img}
                          onChange={(e) => {
                            const newImages = [...editingVariant.images]
                            newImages[index] = e.target.value
                            setEditingVariant({ ...editingVariant, images: newImages })
                          }}
                          placeholder="https://example.com/image.jpg"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newImages = editingVariant.images.filter((_, i) => i !== index)
                            setEditingVariant({ ...editingVariant, images: newImages })
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingVariant({
                          ...editingVariant,
                          images: [...editingVariant.images, ""]
                        })
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Image
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter image URLs. Empty URLs will be removed when saving.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingVariant(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveVariant} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Images"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!variantToDelete} onOpenChange={(open) => !open && setVariantToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Variant?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this variant? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteVariant}
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

