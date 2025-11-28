import { useState, useEffect } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
import { ArrowLeft, Save, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { fetchCategories, fetchProductDetail, createProduct, updateProduct } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

const TARGET_AUDIENCE_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "kids", label: "Kids" },
  { value: "unisex", label: "Unisex" }
]

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isEdit = !!id

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    categoryId: "",
    brand: "",
    price: "",
    originalPrice: "",
    defaultStock: "0", 
    targetAudience: [] as string[],
    status: "active" as "active" | "inactive",
    isFeatured: false,
    isNew: false,
    isOnSale: false,
    sizes: [] as string[],
    colors: [] as { name: string; hex: string; images: string[] }[]
  })

  useEffect(() => {
    loadCategories()
    if (isEdit && id) {
      loadProduct()
    }
  }, [id, isEdit])

  const loadCategories = async () => {
    try {
      const res = await fetchCategories()
      setCategories(res.categories || [])
    } catch (error) {
      console.error("Failed to load categories:", error)
    }
  }

  const loadProduct = async () => {
    if (!id) return
    try {
      setLoading(true)
      const res = await fetchProductDetail(id)
      const product = res.product

      setFormData({
        name: product.name || "",
        slug: product.slug || "",
        description: product.description || "",
        categoryId: product.categoryId || "",
        brand: product.brand || "",
        price: product.price?.toString() || "",
        originalPrice: product.originalPrice?.toString() || "",
        defaultStock: "0", 
        targetAudience: product.targetAudience || [],
        status: (product.status === "inactive" ? "inactive" : "active") as "active" | "inactive",
        isFeatured: product.isFeatured || false,
        isNew: product.isNew || false,
        isOnSale: product.isOnSale || false,
        sizes: product.sizes || [],
        colors: (() => {
          const productColors = product.colors || []

          if (productColors.length === 0) {
            return []
          }

          return productColors.map((c: any) => ({
            name: typeof c === 'string' ? c : c.name,
            hex: typeof c === 'string' ? '#000000' : (c.hex || '#000000'),
            images: (typeof c === 'object' && Array.isArray(c.images) && c.images.length > 0)
              ? c.images
              : [""]
          }))
        })()
      })
    } catch (error: any) {
      console.error("Failed to load product:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load product",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name)
    }))
  }


  const handleTargetAudienceToggle = (value: string) => {
    setFormData(prev => ({
      ...prev,
      targetAudience: prev.targetAudience.includes(value)
        ? prev.targetAudience.filter(v => v !== value)
        : [...prev.targetAudience, value]
    }))
  }

  // All available sizes (kids + adults)
  const availableSizes = [
    // Kids sizes
    "20", "20.5", "21", "21.5", "22", "22.5", "23", "23.5",
    "24", "24.5", "25", "25.5", "26", "26.5", "27", "27.5",
    "28", "28.5", "29", "29.5", "30", "30.5", "31", "31.5",
    "32", "32.5", "33", "33.5", "34", "34.5",
    // Adult sizes
    "35", "35.5", "36", "36.5", "37", "37.5", "38", "38.5",
    "39", "39.5", "40", "40.5", "41", "41.5", "42", "42.5",
    "43", "43.5", "44", "44.5", "45", "45.5", "46", "46.5", "47"
  ]

  // Age group size ranges for quick selection
  const ageGroupSizes: Record<string, string[]> = {
    toddler: ["20", "20.5", "21", "21.5", "22", "22.5", "23", "23.5", "24", "24.5", "25", "25.5", "26", "26.5"],
    littleKids: ["27", "27.5", "28", "28.5", "29", "29.5", "30", "30.5", "31", "31.5", "32", "32.5", "33", "33.5", "34", "34.5"],
    teens: ["35", "35.5", "36", "36.5", "37", "37.5", "38", "38.5", "39", "39.5", "40", "40.5"]
  }

  const handleAgeGroupSizeSelect = (ageGroup: string) => {
    const sizes = ageGroupSizes[ageGroup] || []
    setFormData(prev => ({
      ...prev,
      sizes: [...new Set([...prev.sizes, ...sizes])].sort((a, b) => {
        const numA = parseFloat(a)
        const numB = parseFloat(b)
        if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b)
        return numA - numB
      })
    }))
  }

  const handleSizeToggle = (size: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size].sort((a, b) => {
          const numA = parseFloat(a.replace(/[^0-9.]/g, '')) || 0
          const numB = parseFloat(b.replace(/[^0-9.]/g, '')) || 0
          return numA - numB
        })
    }))
  }

  const handleColorChange = (index: number, field: "name" | "hex", value: string) => {
    const newColors = [...formData.colors]
    newColors[index] = { ...newColors[index], [field]: value }
    setFormData(prev => ({ ...prev, colors: newColors }))
  }

  const addColorField = () => {
    setFormData(prev => ({ ...prev, colors: [...prev.colors, { name: "", hex: "#000000", images: [""] }] }))
  }

  const removeColorField = (index: number) => {
    const newColors = formData.colors.filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, colors: newColors }))
  }

  const handleColorImageChange = (colorIndex: number, imageIndex: number, value: string) => {
    const newColors = [...formData.colors]
    const colorImages = [...newColors[colorIndex].images]
    colorImages[imageIndex] = value
    newColors[colorIndex] = { ...newColors[colorIndex], images: colorImages }
    setFormData(prev => ({ ...prev, colors: newColors }))
  }

  const addColorImageField = (colorIndex: number) => {
    const newColors = [...formData.colors]
    newColors[colorIndex] = {
      ...newColors[colorIndex],
      images: [...newColors[colorIndex].images, ""]
    }
    setFormData(prev => ({ ...prev, colors: newColors }))
  }

  const removeColorImageField = (colorIndex: number, imageIndex: number) => {
    const newColors = [...formData.colors]
    if (newColors[colorIndex].images.length > 1) {
      const newImages = newColors[colorIndex].images.filter((_, i) => i !== imageIndex)
      newColors[colorIndex] = { ...newColors[colorIndex], images: newImages }
      setFormData(prev => ({ ...prev, colors: newColors }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.slug || !formData.categoryId || !formData.brand) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    const priceValue = formData.price ? Number(formData.price) : null
    const originalPriceValue = formData.originalPrice ? Number(formData.originalPrice) : null

    if (!priceValue && !originalPriceValue) {
      toast({
        title: "Validation Error",
        description: "Please provide either Price or Original Price",
        variant: "destructive"
      })
      return
    }

    // Validate colors: mỗi color phải có name không rỗng
    const invalidColors = formData.colors.filter(color => !color.name || color.name.trim() === '')
    if (invalidColors.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a name for all colors",
        variant: "destructive"
      })
      return
    }

    const hasColorImages = formData.colors.some(color =>
      color.images.some(img => img.trim())
    )

    if (!hasColorImages) {
      toast({
        title: "Validation Error",
        description: "Please add at least one image in the colors section",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {


      let finalPrice: number
      let finalOriginalPrice: number | undefined
      let finalIsOnSale: boolean

      if (priceValue && originalPriceValue) {
        if (originalPriceValue > priceValue) {
          finalPrice = priceValue
          finalOriginalPrice = originalPriceValue
          finalIsOnSale = true
        } else {
          finalPrice = priceValue
          finalOriginalPrice = undefined
          finalIsOnSale = false
        }
      } else if (originalPriceValue) {
        finalPrice = originalPriceValue
        finalOriginalPrice = undefined
        finalIsOnSale = false
      } else if (priceValue) {
        finalPrice = priceValue
        finalOriginalPrice = undefined
        finalIsOnSale = false
      } else {
        finalPrice = 0
        finalOriginalPrice = undefined
        finalIsOnSale = false
      }

      const selectedCategory = categories.find(cat => cat.id === formData.categoryId)
      const categoryName = selectedCategory?.name || ""

      const productStatus = formData.status || "active"

      const targetAudience = Array.isArray(formData.targetAudience) ? formData.targetAudience : []

      const defaultStockValue = formData.defaultStock && formData.defaultStock.trim() !== "" 
        ? Number(formData.defaultStock) 
        : 0
      
      

      const payload = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        categoryId: formData.categoryId,
        categoryName: categoryName,
        brand: formData.brand,
        price: finalPrice,
        originalPrice: finalOriginalPrice !== undefined ? finalOriginalPrice : null,
        defaultStock: defaultStockValue, 
        images: formData.colors.flatMap(color => color.images.filter(img => img.trim())),
        targetAudience: targetAudience,
        status: productStatus,
        isFeatured: formData.isFeatured,
        isNew: formData.isNew,
        isOnSale: finalIsOnSale,
        sizes: formData.sizes.filter(s => s.trim()),
        colors: formData.colors
          .map(c => ({
            name: c.name.trim(),
          hex: c.hex,
          images: c.images.filter(img => img.trim())
        }))
      }


      let result
      if (isEdit && id) {
        result = await updateProduct(id, payload)
        toast({
          title: "Success",
          description: "Product updated successfully. Variants have been automatically created/updated based on sizes and colors.",
        })
      } else {
        result = await createProduct(payload)   
        const variantCount = formData.sizes.length * formData.colors.length
        toast({
          title: "Success",
          description: `Product created successfully. ${variantCount} variant(s) have been automatically created based on sizes and colors.`,
        })
      }

      await new Promise(resolve => setTimeout(resolve, 500))

      navigate("/admin/products")
    } catch (error: any) {
      console.error("Failed to save product:", error)
      // Xử lý lỗi authentication
      if (error.message === "AUTH_REQUIRED" || error.message === "UNAUTHORIZED") {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please login again.",
          variant: "destructive"
        })
        // Redirect sẽ được xử lý tự động trong api.ts
      } else {
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
        variant: "destructive"
      })
      }
    } finally {
      setSaving(false)
    }
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin/products">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {isEdit ? "Edit Product" : "Create Product"}
              </h1>
              <p className="text-muted-foreground">
                {isEdit ? "Update product information" : "Add a new product to the store"}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g., Nike Air Force 1 '07"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="e.g., nike-air-force-1-07"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      URL-friendly identifier (auto-generated from name)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Product description..."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand *</Label>
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                        placeholder="e.g., Nike"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="categoryId">Category *</Label>
                      <Select
                        value={formData.categoryId}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (₫)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="2490000"
                        min="0"
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.originalPrice && Number(formData.originalPrice) > Number(formData.price || 0)
                          ? "Sale price (discounted price)"
                          : "Regular price (leave empty if only using original price)"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="originalPrice">Original Price (₫)</Label>
                      <Input
                        id="originalPrice"
                        type="number"
                        value={formData.originalPrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))}
                        placeholder="3200000"
                        min="0"
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.price && formData.originalPrice && Number(formData.originalPrice) > Number(formData.price)
                          ? "Original price (will show as crossed out)"
                          : "Original price (will be used as main price if price is empty)"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultStock">Default Stock</Label>
                    <Input
                      id="defaultStock"
                      type="number"
                      value={formData.defaultStock}
                      onChange={(e) => setFormData(prev => ({ ...prev, defaultStock: e.target.value }))}
                      placeholder="0"
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Default stock for all new variants when creating/updating product. Existing variants will keep their current stock.
                    </p>
                  </div>

                </CardContent>
              </Card>



              <Card>
                <CardHeader>
                  <CardTitle>Sizes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select available sizes for this product
                  </p>
                  
                  {/* Quick select by age group (for kids products) */}
                  {formData.targetAudience.includes("kids") && (
                    <div className="mb-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Quick Select by Age Group for:</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAgeGroupSizeSelect("toddler")}
                          className="text-xs"
                        >
                          Toddler  (20-26)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAgeGroupSizeSelect("littleKids")}
                          className="text-xs"
                        >
                          Little Kids (27-34)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAgeGroupSizeSelect("teens")}
                          className="text-xs"
                        >
                          Teens (35-40)
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-96 overflow-y-auto">
                    {availableSizes.map((size) => {
                      const isSelected = formData.sizes.includes(size)
                      return (
                        <div
                          key={size}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`size-${size}`}
                            checked={isSelected}
                            onCheckedChange={() => handleSizeToggle(size)}
                          />
                          <Label
                            htmlFor={`size-${size}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {size}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                  {formData.sizes.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">
                        Selected sizes ({formData.sizes.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {formData.sizes.map((size) => (
                          <Badge
                            key={size}
                            variant="secondary"
                            className="px-3 py-1"
                          >
                            {size}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Colors & Images</h3>
                  <Button type="button" variant="outline" onClick={addColorField}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Color
                  </Button>
                </div>

                {formData.colors.map((color, colorIndex) => (
                  <Card key={colorIndex} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-3">
                          <Input
                            value={color.name}
                            onChange={(e) => handleColorChange(colorIndex, "name", e.target.value)}
                            placeholder="Color name (e.g., Black)"
                            className="w-48"
                          />
                        </CardTitle>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeColorField(colorIndex)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Add images for this color variant
                      </p>
                      {color.images.map((image, imageIndex) => (
                        <div key={imageIndex} className="flex gap-2">
                          <Input
                            value={image}
                            onChange={(e) => handleColorImageChange(colorIndex, imageIndex, e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            type="url"
                          />
                          {color.images.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeColorImageField(colorIndex, imageIndex)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addColorImageField(colorIndex)}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Image for {color.name || "this color"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}


              </div>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: "active" | "inactive") =>
                        setFormData(prev => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Active products are visible to customers
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Product Flags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, isFeatured: !!checked }))
                      }
                    />
                    <Label htmlFor="isFeatured">Featured Product</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isNew"
                      checked={formData.isNew}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, isNew: !!checked }))
                      }
                    />
                    <Label htmlFor="isNew">New Product</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isOnSale"
                      checked={formData.isOnSale}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, isOnSale: !!checked }))
                      }
                    />
                    <Label htmlFor="isOnSale">On Sale</Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Target Audience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {TARGET_AUDIENCE_OPTIONS.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.value}
                        checked={formData.targetAudience.includes(option.value)}
                        onCheckedChange={() => handleTargetAudienceToggle(option.value)}
                      />
                      <Label htmlFor={option.value}>{option.label}</Label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={saving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      asChild
                    >
                      <Link to="/admin/products">Cancel</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}

