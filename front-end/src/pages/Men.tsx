import { useState, useEffect, useMemo } from "react"
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
import { Filter, SlidersHorizontal, Grid3X3, List, Users, X, Check } from "lucide-react"
import { fetchProducts, fetchCategories } from "@/lib/api"
import { useNavigate } from "react-router-dom"
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
  averageRating?: number
  reviewCount?: number
  isNew?: boolean
  isOnSale?: boolean
  isFeatured?: boolean
  sizes?: string[]
  colors?: string[]
  categoryName?: string
  categoryId?: string
  category?: { id: string; name: string }
  images?: string[]
  createdAt?: string
  updatedAt?: string
}

interface Category {
  _id?: string
  id?: string
  name: string
  parentId?: string | null
  count?: number
  description?: string
}

export default function Men() {
  const navigate = useNavigate()
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000000])
  const [sortBy, setSortBy] = useState("newest")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([]) // Store all products to get all brands
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load all products once to get all available brands
  useEffect(() => {
    async function loadAllProducts() {
      try {
        const response = await fetchProducts({ targetAudience: "male" })
        const items = response.items || response.products || []
        setAllProducts(items.map((p: any) => ({
          ...p,
          id: p._id,
          slug: p.slug,
          image: p.images?.[0] || p.image || "",
          categoryName: p.categoryName || p.category?.name,
          categoryId: p.categoryId || p.category?.id
        })))
      } catch (err) {
        console.error("Failed to load all products", err)
      }
    }
    loadAllProducts()
  }, [])

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        
        // Load categories
        try {
          const categoriesRes = await fetchCategories()
          
          // Priority: Use grouped categories from backend if available
          if (categoriesRes.children && Array.isArray(categoriesRes.children) && categoriesRes.children.length > 0) {
            const sortedCategories = categoriesRes.children.sort((a: any, b: any) => {
              const order = ["lifestyle", "running", "football", "skateboarding", "training-gym"]
              const aIndex = order.indexOf(a.name?.toLowerCase() || "")
              const bIndex = order.indexOf(b.name?.toLowerCase() || "")
              if (aIndex === -1 && bIndex === -1) return 0
              if (aIndex === -1) return 1
              if (bIndex === -1) return -1
              return aIndex - bIndex
            })
            setCategories(sortedCategories)
          } else {
            // Fallback: Group categories manually
            const allCategories = categoriesRes.all || categoriesRes.categories || []
            const childCategories = allCategories.filter(
              (cat: any) => 
                cat.parentId !== null && 
                cat.parentId !== undefined &&
                cat.name?.toLowerCase() !== "men" && 
                cat.name?.toLowerCase() !== "women" &&
                cat.name?.toLowerCase() !== "kids"
            )
            
            // Group by name
            const groupedCategories = new Map<string, { name: string; count: number; id: string }>()
            childCategories.forEach((cat: any) => {
              const cleanName = (cat.name || "").replace(/^(Men|Women|Kids)\s+/i, "").trim() || cat.name
              const existing = groupedCategories.get(cleanName)
              if (existing) {
                existing.count += cat.count || 0
              } else {
                groupedCategories.set(cleanName, {
                  name: cleanName,
                  count: cat.count || 0,
                  id: cat.id || ""
                })
              }
            })
            
            const sortedCategories = Array.from(groupedCategories.values()).sort((a, b) => {
              const order = ["lifestyle", "running", "football", "skateboarding", "training-gym"]
              const aIndex = order.indexOf(a.name?.toLowerCase() || "")
              const bIndex = order.indexOf(b.name?.toLowerCase() || "")
              if (aIndex === -1 && bIndex === -1) return 0
              if (aIndex === -1) return 1
              if (bIndex === -1) return -1
              return aIndex - bIndex
            })
            setCategories(sortedCategories)
          }
        } catch (catErr) {
          console.error("Failed to load categories", catErr)
        }

        // Load products
        const params: any = { targetAudience: "male" }
        // Note: Backend only supports single category/brand filter, so we'll filter multiple on frontend
        // if (selectedCategories.length > 0) params.category = selectedCategories[0]
        
        const response = await fetchProducts(params)
        const items = response.items || response.products || []
        if (items.length > 0) {
          // Log all products to see which ones are featured
          items.forEach((p: any, index: number) => {
          })
          
          // Count featured vs non-featured
          const featuredCount = items.filter((p: any) => p.isFeatured).length
          const nonFeaturedCount = items.filter((p: any) => !p.isFeatured).length
        }
        setProducts(items.map((p: any) => ({
          ...p,
          id: p._id,
          slug: p.slug,
          image: p.images?.[0] || p.image || "",
          categoryName: p.categoryName || p.category?.name,
          categoryId: p.categoryId || p.category?.id,
          images: p.images || []
        })))
      } catch (err: any) {
        setError(err.message || "Cannot load products")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, []) // Load once, filter on client-side

  // Filter products excluding category filter (for count calculation)
  const productsWithoutCategoryFilter = products.filter((product) => {
    if (product.price < priceRange[0] || product.price > priceRange[1]) return false
    if (selectedSize && product.sizes && !product.sizes.includes(selectedSize)) return false
    // Filter by colors
    if (selectedColors.length > 0 && product.colors) {
      const colorNames = product.colors.map((c: any) => typeof c === 'string' ? c : (c.name || ''))
      const hasSelectedColor = selectedColors.some(color => colorNames.includes(color))
      if (!hasSelectedColor) return false
    }
    // Filter by brands
    if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) return false
    return true
  })

  // Final filtered products including category filter
  const filteredProducts = productsWithoutCategoryFilter.filter((product) => {
    // Exclude featured products from Men/Women/Kids pages (only show in Home and All Shoes)
    if (product.isFeatured) {
      return false
    }
    
    // Filter by categories (match by normalized category name)
    if (selectedCategories.length > 0) {
      let productCategoryName = product.categoryName || product.category?.name || ""
      // Remove prefix like "Men ", "Women ", "Kids " from category name
      if (productCategoryName) {
        productCategoryName = productCategoryName.replace(/^(Men|Women|Kids)\s+/i, "").trim() || productCategoryName
      }
      if (!selectedCategories.includes(productCategoryName)) return false
    }
    return true
  })
  
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    // Don't prioritize featured products in Men/Women/Kids pages
    // Just apply the selected sort
    switch (sortBy) {
      case "price-low":
        // Sort theo giá hiển thị thực tế (price field - giá mà user sẽ trả)
        return a.price - b.price
      case "price-high":
        // Sort theo giá hiển thị thực tế (price field - giá mà user sẽ trả)
        return b.price - a.price
      case "newest":
      default:
        // Ưu tiên isNew (JUST IN) trước
        if (a.isNew && !b.isNew) return -1
        if (!a.isNew && b.isNew) return 1
        // Sau đó sort theo createdAt (mới nhất trước)
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        // Nếu không có createdAt, sort theo updatedAt
        if (a.updatedAt && b.updatedAt) {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        }
        return 0
    }
  })

  const availableSizes = [...new Set(products.flatMap(p => p.sizes || []))].sort()
  const availableColors = [...new Set(products.flatMap(p => {
    if (!p.colors) return []
    return p.colors.map((c: any) => typeof c === 'string' ? c : (c.name || ''))
  }))].sort()
  
  const allBrands = [...new Set(allProducts.map(p => p.brand).filter(Boolean))].sort()
  const currentBrands = [...new Set(products.map(p => p.brand).filter(Boolean))]
  const availableBrands = [...new Set([...currentBrands, ...selectedBrands, ...allBrands])].sort()
  
  // Calculate category counts by category name (normalized) for Men's page
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    // Count products by normalized category name
    allProducts.forEach((product) => {
      let productCategoryName = product.categoryName || product.category?.name || ""
      // Remove prefix like "Men ", "Women ", "Kids " from category name
      if (productCategoryName) {
        productCategoryName = productCategoryName.replace(/^(Men|Women|Kids)\s+/i, "").trim() || productCategoryName
        counts[productCategoryName] = (counts[productCategoryName] || 0) + 1
      }
    })
    return counts
  }, [allProducts])



  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(c => c !== categoryName)
      } else {
        return [...prev, categoryName]
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

  const handleBrandClick = (brand: string) => {
    setSelectedBrands(prev => {
      if (prev.includes(brand)) {
        return prev.filter(b => b !== brand)
      } else {
        return [...prev, brand]
      }
    })
  }

  const clearFilters = () => {
    setSelectedSize(null)
    setSelectedColors([])
    setSelectedCategories([])
    setSelectedBrands([])
    setPriceRange([0, 5000000])
  }

  const hasActiveFilters = selectedSize !== null || selectedColors.length > 0 || selectedCategories.length > 0 || selectedBrands.length > 0 || priceRange[1] < 5000000

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <Container>
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-5xl font-bold">
                Shoes for <span className="gradient-text">Men</span>
              </h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8">
              Discover the men's shoe collection with modern designs, high quality and athletic style
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <Badge variant="secondary" className="px-4 py-2">
                {sortedProducts.length} products
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                Free shipping
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                Return within 30 days
              </Badge>
            </div>
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
                    Men's Filter
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
                      onValueChange={(value) => {
                        setSelectedSize(value === "all" ? null : value)
                      }}
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
                      value={selectedCategories.length > 0 ? selectedCategories[0] : "all"}
                      onValueChange={(value) => {
                        if (value === "all") {
                          setSelectedCategories([])
                        } else {
                          handleCategoryClick(value)
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category">
                          {selectedCategories.length > 0 
                            ? categories.find(c => (c.name || "") === selectedCategories[0])?.name || selectedCategories[0]
                            : "All categories"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categories.map((category) => {
                          const categoryName = category.name || ""
                          const count = categoryCounts[categoryName] ?? category.count ?? 0
                          const isDisabled = count === 0 && !selectedCategories.includes(categoryName)
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
                    {selectedCategories.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedCategories.map((categoryName) => {
                          const category = categories.find(c => (c.name || "") === categoryName)
                          return (
                            <Badge
                              key={categoryName}
                              variant="secondary"
                              className="text-xs px-2 py-1"
                            >
                              {category?.name || categoryName}
                              <button
                                onClick={() => handleCategoryClick(categoryName)}
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
                )}

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
                <h2 className="text-xl font-semibold mb-1">Men's Shoes</h2>
                <p className="text-muted-foreground text-sm">
                  Showing {sortedProducts.length} products
                </p>
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
            {sortedProducts.length > 0 ? (
              <div className={
                viewMode === "grid" 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }>
                {sortedProducts.map((product, index) => (
                  <div
                    key={product._id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <ProductCard
                      id={product._id}
                      slug={product.slug}
                      name={product.name}
                      brand={product.brand}
                      price={product.price}
                      originalPrice={product.originalPrice}
                      image={(() => {
                        if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
                          const firstColor = product.colors[0]
                          if (firstColor && typeof firstColor === 'object' && !Array.isArray(firstColor)) {
                            const colorObj = firstColor as { images?: string[] }
                            if (colorObj.images && Array.isArray(colorObj.images) && colorObj.images.length > 0) {
                              return colorObj.images[0]
                            }
                          }
                        }
                        return product.image || ""
                      })()}
                      hoverImage={product.hoverImage}
                      rating={product.rating || 0}
                      reviewCount={product.reviewCount || 0}
                      isNew={product.isNew}
                      isOnSale={product.isOnSale}
                      categoryName={product.categoryName}
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
                  Try adjusting the filters to see more men's products
                </p>
              </div>
            )}

            {/* Load More */}
            {/* {sortedProducts.length > 0 && ( */}
              {/* <div className="text-center mt-12">
                <Button variant="outline" size="lg" className="border-primary hover:bg-primary hover:text-white" onClick={() => navigate("/products")}>
                  View All Products
                </Button>
              </div> */}
            {/* )} */}
          </div>
        </div>
      </Container>

      <Footer />
    </div>
  )
}