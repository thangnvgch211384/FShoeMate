import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Filter, SlidersHorizontal, Grid3X3, List, X, Check } from "lucide-react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Container } from "@/components/layout/Container"
import { ProductCard } from "@/components/product/ProductCard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchCategories, fetchProducts } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Product {
  _id: string
  slug?: string
  name: string
  brand: string
  price: number
  originalPrice?: number
  image: string
  hoverImage?: string
  rating?: number
  reviewCount?: number
  isNew?: boolean
  isOnSale?: boolean
  categoryName?: string
  categoryId?: string
  category?: { id: string; name: string }
  images?: string[]
  averageRating?: number
  sizes?: string[]
  colors?: { name: string; hex: string; images?: string[] }[] | string[]
  targetAudience?: string[]
  createdAt?: string
  updatedAt?: string
}

// Helper function to get product image from colors
function getProductImage(product: Product): string {
  if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
    const firstColor = product.colors[0]
    if (typeof firstColor === 'object' && firstColor.images && firstColor.images.length > 0) {
      return firstColor.images[0]
    }
  }
  return product.image || ""
}

interface Category {
  id?: string
  _id?: string
  name: string
  count?: number
  parentId?: string | null
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryFromUrl = searchParams.get("category")
  const searchQuery = searchParams.get("q") || ""
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryFromUrl || null)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedTargetAudience, setSelectedTargetAudience] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000000])
  const [sortBy, setSortBy] = useState("newest")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Update selectedCategory when URL changes
  useEffect(() => {
    const categoryFromUrl = searchParams.get("category")
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl)
    } else {
      setSelectedCategory(null)
    }
  }, [searchParams])

  // Load all products once to get all available brands
  useEffect(() => {
    async function loadAllProducts() {
      try {
        const response = await fetchProducts({ limit: 1000 }) 
        const items = response.items || response.products || []
        setAllProducts(items.map((p: any) => ({
          ...p,
          id: p._id,
          slug: p.slug,
          image: p.images?.[0] || p.image || "",
          categoryName: p.categoryName || p.category?.name,
          targetAudience: p.targetAudience || []
        })))
      } catch (err) {
        console.error("Failed to load all products", err)
      }
    }
    loadAllProducts()
  }, [])

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetchCategories()
        
        // Priority: Use grouped categories from backend if available
        if (res.children && Array.isArray(res.children) && res.children.length > 0) {
          const sortedCategories = res.children.sort((a: any, b: any) => {
            const order = ["lifestyle", "running", "football", "skateboarding", "training-gym"]
            const aIndex = order.indexOf(a.name?.toLowerCase() || "")
            const bIndex = order.indexOf(b.name?.toLowerCase() || "")
            if (aIndex === -1 && bIndex === -1) return 0
            if (aIndex === -1) return 1
            if (bIndex === -1) return -1
            return aIndex - bIndex
          })
          setCategories(sortedCategories)
          return
        }
        
        // Fallback: Group categories manually if backend doesn't provide grouped
        const allCategories = res.all || res.categories || res || []
        
        // Filter out parent categories (men, women, kids) for display
        const childCategories = allCategories.filter(
          (cat: any) => 
            cat.parentId !== null && 
            cat.parentId !== undefined &&
            cat.name?.toLowerCase() !== "men" && 
            cat.name?.toLowerCase() !== "women" &&
            cat.name?.toLowerCase() !== "kids" &&
            cat.id?.toLowerCase() !== "men" &&
            cat.id?.toLowerCase() !== "women" &&
            cat.id?.toLowerCase() !== "kids"
        )
        
        // Group child categories by name (Running, Football, Lifestyle) and sum counts
        const groupedCategories = new Map<string, { name: string; count: number; id: string; ids: string[] }>()
        
        childCategories.forEach((cat: any) => {
          const name = cat.name || ""
          // Remove any prefix like "Men ", "Women ", "Kids " from name
          const cleanName = name.replace(/^(Men|Women|Kids)\s+/i, "").trim() || name
          
          const existing = groupedCategories.get(cleanName)
          if (existing) {
            existing.count += cat.count || 0
            if (cat.id && !existing.ids.includes(cat.id)) {
              existing.ids.push(cat.id)
            }
          } else {
            groupedCategories.set(cleanName, {
              name: cleanName,
              count: cat.count || 0,
              id: cat.id || "",
              ids: cat.id ? [cat.id] : []
            })
          }
        })
        
        // Convert map to array and sort
        const groupedArray = Array.from(groupedCategories.values())
        const sortedCategories = groupedArray.sort((a, b) => {
          const order = ["lifestyle", "running", "football", "skateboarding", "training-gym"]
          const aIndex = order.indexOf(a.name?.toLowerCase() || "")
          const bIndex = order.indexOf(b.name?.toLowerCase() || "")
          if (aIndex === -1 && bIndex === -1) return 0
          if (aIndex === -1) return 1
          if (bIndex === -1) return -1
          return aIndex - bIndex
        })
        
        setCategories(sortedCategories)
      } catch (e) {
        console.error("Error loading categories:", e)
        setCategories([])
      }
    }
    loadCategories()
  }, [])

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true)
        setError(null)
        const params: Record<string, string | number> = {
          sort: sortBy,
          limit: 1000 
        }
        const res = await fetchProducts(params)
        const items = res.items || res.products || []
        
        
        
        setProducts(items.map((p: any) => ({
          ...p,
          id: p._id,
          slug: p.slug,
          image: p.images?.[0] || p.image || "",
          categoryName: p.categoryName || p.category?.name,
          targetAudience: p.targetAudience || []
        })))
      } catch (e: any) {
        setError(e.message || "Cannot load products")
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [sortBy])

  const productsWithoutCategoryFilter = products.filter((product) => {
    if (product.price < priceRange[0] || product.price > priceRange[1]) return false
    if (selectedSize && product.sizes && !product.sizes.includes(selectedSize)) return false
    if (selectedColors.length > 0 && product.colors) {
      const colorNames = product.colors.map((c: any) => typeof c === 'string' ? c : c.name)
      const hasSelectedColor = selectedColors.some(color => colorNames.includes(color))
      if (!hasSelectedColor) return false
    }
    if (selectedTargetAudience.length > 0) {
      if (!product.targetAudience || product.targetAudience.length === 0) {
        if (!selectedTargetAudience.includes("unisex")) return false
      } else {
        const hasSelectedAudience = selectedTargetAudience.some(audience => 
          product.targetAudience?.includes(audience)
        )
        if (!hasSelectedAudience) return false
      }
    }
    if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) return false
    return true
  })

  // Filter products by category name and search query
  const filteredProducts = productsWithoutCategoryFilter.filter((product) => {
    // Filter by category if selected
    if (selectedCategory) {
      let productCategoryName = product.categoryName || product.category?.name || ""
      // Remove prefix like "Men ", "Women ", "Kids " from category name for comparison
      if (productCategoryName) {
        productCategoryName = productCategoryName.replace(/^(Men|Women|Kids)\s+/i, "").trim() || productCategoryName
      }
      // Match by category name (case-insensitive)
      if (productCategoryName?.toLowerCase() !== selectedCategory.toLowerCase()) return false
    }
    
    // Filter by search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      const nameMatch = product.name?.toLowerCase().includes(query)
      const brandMatch = product.brand?.toLowerCase().includes(query)
      const categoryMatch = product.categoryName?.toLowerCase().includes(query)
      if (!nameMatch && !brandMatch && !categoryMatch) return false
    }
    
    return true
  })

  const sortedProducts = [...filteredProducts].sort((a: any, b: any) => {
    switch (sortBy) {
      case "price-low":
        const priceA = Number(a.price) || 0
        const priceB = Number(b.price) || 0
        return priceA - priceB
      case "price-high":
        const priceAHigh = Number(a.price) || 0
        const priceBHigh = Number(b.price) || 0
        return priceBHigh - priceAHigh
      case "newest":
      default:
        if (a.isFeatured && !b.isFeatured) return -1
        if (!a.isFeatured && b.isFeatured) return 1
        if (a.isNew && !b.isNew) return -1
        if (!a.isNew && b.isNew) return 1
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        if (a.updatedAt && b.updatedAt) {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        }
        return 0
    }
  })

  const allBrands = allProducts.length > 0 ? [...new Set(allProducts.map(p => p.brand).filter(Boolean))].sort() : []
  const currentBrands = products.length > 0 ? [...new Set(products.map(p => p.brand).filter(Boolean))] : []
  const availableBrands = [...new Set([...currentBrands, ...selectedBrands, ...allBrands])].sort()
  
  const availableSizes = [...new Set(products.flatMap(p => p.sizes || []))].sort()
  const availableColors = [...new Set(products.flatMap(p => {
    if (!p.colors) return []
    return p.colors.map((c: any) => typeof c === 'string' ? c : c.name)
  }))].sort()
  
  // Count products by category name (grouped) - normalize names by removing Men/Women/Kids prefix
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    productsWithoutCategoryFilter.forEach((product) => {
      let productCategoryName = product.categoryName || product.category?.name || ""
      // Remove prefix like "Men ", "Women ", "Kids " from category name
      if (productCategoryName) {
        productCategoryName = productCategoryName.replace(/^(Men|Women|Kids)\s+/i, "").trim() || productCategoryName
        counts[productCategoryName] = (counts[productCategoryName] || 0) + 1
      }
    })
    return counts
  }, [productsWithoutCategoryFilter])




  const handleCategoryClick = (categoryName: string) => {
    if (selectedCategory === categoryName) {
      setSelectedCategory(null)
      setSearchParams({})
    } else {
      setSelectedCategory(categoryName)
      setSearchParams({ category: categoryName })
    }
  }

  const handleBrandClick = (brand: string) => {
    setSelectedBrands(prev => {
      if (prev.includes(brand)) {
        return prev.filter(b => b !== brand)
      } else {
        return [...prev, brand]
      }
    })
  }

  const handleColorClick = (color: string) => {
    setSelectedColors(prev => {
      if (prev.includes(color)) {
        return prev.filter(c => c !== color)
      } else {
        return [...prev, color]
      }
    })
  }

  const handleTargetAudienceClick = (audience: string) => {
    setSelectedTargetAudience(prev => {
      if (prev.includes(audience)) {
        return prev.filter(a => a !== audience)
      } else {
        return [...prev, audience]
      }
    })
  }

  const clearFilters = () => {
    setSelectedCategory(null)
    setSelectedBrands([])
    setSelectedColors([])
    setSelectedSize(null)
    setSelectedTargetAudience([])
    setPriceRange([0, 5000000])
    setSearchParams({})
  }

  const hasActiveFilters = selectedCategory !== null || selectedBrands.length > 0 || selectedColors.length > 0 || selectedSize !== null || selectedTargetAudience.length > 0 || priceRange[1] < 5000000

  const handleSizeChange = (size: string) => {
    setSelectedSize(size === "all" ? null : size)
  }


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="py-12 bg-gradient-to-r from-muted/50 to-muted/20">
        <Container>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              All <span className="gradient-text">Shoes</span>  
            </h1>
            <p className="text-lg text-muted-foreground">
              Discover a wide range of shoes and products for the whole family
            </p>
          </div>
        </Container>
      </section>

      <Container className="py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-6"> 
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center">
                    <Filter className="mr-2 h-5 w-5" />
                    Filters
                  </h3>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs h-7 px-2"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Colors */}
                {availableColors.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Color</h4>
                    <Select
                      value={selectedColors.length > 0 ? selectedColors[0] : "all"}
                      onValueChange={(value) => {
                        if (value === "all") {
                          setSelectedColors([])
                        } else {
                          setSelectedColors([value])
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select color">
                          {selectedColors.length > 0 
                            ? selectedColors.length === 1 
                              ? selectedColors[0]
                              : `${selectedColors.length} colors selected`
                            : "All colors"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All colors</SelectItem>
                        {availableColors.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedColors.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedColors.map((color) => (
                          <Badge
                            key={color}
                            variant="secondary"
                            className="text-xs px-2 py-1"
                          >
                            {color}
                            <button
                              onClick={() => handleColorClick(color)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sizes */}
                {availableSizes.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Size</h4>
                    <Select
                      value={selectedSize || "all"}
                      onValueChange={handleSizeChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select size">
                          {selectedSize || "All sizes"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sizes</SelectItem>
                        {availableSizes.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Price Range */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Price range</h4>
                  <Select
                    value={priceRange[1].toString()}
                    onValueChange={(value) => {
                      const maxPrice = parseInt(value)
                      setPriceRange([0, maxPrice])
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select price range">
                        {priceRange[1] === 5000000 
                          ? "All prices" 
                          : `Up to ${priceRange[1].toLocaleString('vi-VN')}₫`}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5000000">All prices</SelectItem>
                      <SelectItem value="1000000">Up to 1.000.000₫</SelectItem>
                      <SelectItem value="2000000">Up to 2.000.000₫</SelectItem>
                      <SelectItem value="3000000">Up to 3.000.000₫</SelectItem>
                      <SelectItem value="4000000">Up to 4.000.000₫</SelectItem>
                      <SelectItem value="5000000">Up to 5.000.000₫</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Categories</h4>
                    <Select
                      value={selectedCategory || "all"}
                      onValueChange={(value) => {
                        if (value === "all") {
                          setSelectedCategory(null)
                          setSearchParams({})
                        } else {
                          handleCategoryClick(value)
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category">
                          {selectedCategory 
                            ? categories.find(c => (c.name || "") === selectedCategory)?.name || selectedCategory
                            : "All categories"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categories.map((category) => {
                          const categoryName = category.name || ""
                          const count = categoryCounts[categoryName] ?? category.count ?? 0
                          const isDisabled = count === 0 && selectedCategory !== categoryName
                          return (
                            <SelectItem 
                              key={categoryName || category.id} 
                              value={categoryName}
                              disabled={isDisabled}
                            >
                              {categoryName} {!isDisabled && count > 0 && `(${count})`}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Target Audience */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Target Audience</h4>
                  <Select
                    value={selectedTargetAudience.length > 0 ? selectedTargetAudience[0] : "all"}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setSelectedTargetAudience([])
                      } else {
                        // Toggle: nếu đã chọn thì bỏ, chưa chọn thì thêm
                        handleTargetAudienceClick(value)
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select audience">
                        {selectedTargetAudience.length > 0
                          ? selectedTargetAudience.length === 1
                            ? selectedTargetAudience[0] === "male" ? "Men"
                            : selectedTargetAudience[0] === "female" ? "Women"
                            : selectedTargetAudience[0] === "kids" ? "Kids"
                            : "Unisex"
                            : `${selectedTargetAudience.length} selected`
                          : "All audiences"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All audiences</SelectItem>
                      <SelectItem value="male">Men</SelectItem>
                      <SelectItem value="female">Women</SelectItem>
                      <SelectItem value="kids">Kids</SelectItem>
                      <SelectItem value="unisex">Unisex</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedTargetAudience.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedTargetAudience.map((audience) => {
                        const labels: Record<string, string> = {
                          male: "Men",
                          female: "Women",
                          kids: "Kids",
                          unisex: "Unisex"
                        }
                        return (
                          <Badge
                            key={audience}
                            variant="secondary"
                            className="text-xs px-2 py-1"
                          >
                            {labels[audience] || audience}
                            <button
                              onClick={() => handleTargetAudienceClick(audience)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Brands */}
                {availableBrands.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Brands</h4>
                    <Select
                      value={selectedBrands.length > 0 ? selectedBrands[0] : "all"}
                      onValueChange={(value) => {
                        if (value === "all") {
                          setSelectedBrands([])
                        } else {
                          // Toggle: nếu đã chọn thì bỏ, chưa chọn thì thêm
                          handleBrandClick(value)
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select brand">
                          {selectedBrands.length > 0
                            ? selectedBrands.length === 1
                              ? selectedBrands[0]
                              : `${selectedBrands.length} brands selected`
                            : "All brands"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All brands</SelectItem>
                        {availableBrands.map((brand) => {
                          const isInCurrentProducts = currentBrands.includes(brand)
                          const isSelected = selectedBrands.includes(brand)
                          return (
                            <SelectItem 
                              key={brand} 
                              value={brand}
                              disabled={!isInCurrentProducts && !isSelected}
                            >
                              {brand} {!isInCurrentProducts && isSelected && "(0)"}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {selectedBrands.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedBrands.map((brand) => (
                          <Badge
                            key={brand}
                            variant="secondary"
                            className="text-xs px-2 py-1"
                          >
                            {brand}
                            <button
                              onClick={() => handleBrandClick(brand)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
              <div>
                {error ? (
                  <p className="text-destructive text-sm">{error}</p>
                ) : (
              <p className="text-muted-foreground">
                Showing {sortedProducts.length} products
              </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>

                {/* View Mode */}
                <div className="flex border border-border rounded-lg">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="icon-sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-none rounded-l-lg"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="icon-sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-none rounded-r-lg"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="py-16 text-center text-muted-foreground">
                Loading products...
              </div>
            ) : sortedProducts.length > 0 ? (
              <div className={
                viewMode === "grid" 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }>
                {sortedProducts.map((product: any, index) => (
                      <div
                        key={product._id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <ProductCard
                          id={product._id}
                          slug={product.slug}
                          name={product.name}
                          brand={product.brand}
                          price={product.price}
                          originalPrice={product.originalPrice}
                          image={getProductImage(product)}
                          hoverImage={product.hoverImage}
                          rating={product.rating || product.averageRating || 0}
                          reviewCount={product.reviewCount || 0}
                          isNew={product.isNew}
                          isOnSale={product.isOnSale}
                          categoryName={product.categoryName}
                          targetAudience={product.targetAudience}
                        />
                      </div>
                    ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <SlidersHorizontal className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground">
                  Try adjusting the filters to see more products
                </p>
              </div>
            )}
          </div>
        </div>
      </Container>

      <Footer />
    </div>
  )
}