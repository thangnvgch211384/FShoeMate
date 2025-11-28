import { useState, useEffect, useMemo } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Container } from "@/components/layout/Container"
import { ProductCard } from "@/components/product/ProductCard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Filter, SlidersHorizontal, Grid3X3, List, Heart, X, Check } from "lucide-react"
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
  colors?: { name: string; hex: string; images?: string[] }[]
  categoryName?: string
  categoryId?: string
  category?: { id: string; name: string }
  createdAt?: string
  updatedAt?: string
}

interface Category {
  _id: string
  id: string
  name: string
  description?: string
  count?: number
}

export default function Women() {
  const navigate = useNavigate()
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000000])
  const [sortBy, setSortBy] = useState("newest")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load all products once to get all available brands
  useEffect(() => {
    async function loadAllProducts() {
      try {
        const response = await fetchProducts({ targetAudience: "female" })
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
          const cats = categoriesRes.categories || []
          setCategories(cats)
        } catch (catErr) {
          console.error("Failed to load categories", catErr)
        }

        // Load products
        const params: any = { targetAudience: "female" }
        // Note: Backend only supports single category filter, so we'll filter multiple on frontend
        // if (selectedCategories.length > 0) params.category = selectedCategories[0]
        
        const response = await fetchProducts(params)
        const items = response.items || response.products || []
        setProducts(items.map((p: any) => ({
          ...p,
          id: p._id,
          slug: p.slug,
          image: (() => {
            // Lấy image từ colors[0].images[0] (format mới)
            if (p.colors && Array.isArray(p.colors) && p.colors.length > 0) {
              const firstColor = p.colors[0]
              if (typeof firstColor === 'object' && firstColor.images && firstColor.images.length > 0) {
                return firstColor.images[0]
              }
            }
            // Fallback về image cũ nếu không có colors
            return p.images?.[0] || p.image || ""
          })(),
          categoryName: p.categoryName || p.category?.name,
          categoryId: p.categoryId || p.category?.id
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
      const colorNames = product.colors.map(c => typeof c === 'string' ? c : c.name)
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
    if (product.isFeatured) return false
    
    // Filter by categories
    if (selectedCategories.length > 0) {
      const productCategoryId = product.categoryId || product.category?.id || ""
      if (!selectedCategories.includes(productCategoryId)) return false
    }
    return true
  })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
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
  const availableColors = [...new Set(products.flatMap(p => (p.colors || []).map(c => typeof c === 'string' ? c : c.name)))]
  
  // Get brands from all products (not just filtered), and merge with selected brands
  const allBrands = allProducts.length > 0 ? [...new Set(allProducts.map(p => p.brand).filter(Boolean))].sort() : []
  const currentBrands = products.length > 0 ? [...new Set(products.map(p => p.brand).filter(Boolean))] : []
  const availableBrands = [...new Set([...currentBrands, ...selectedBrands, ...allBrands])].sort()
  
  // Calculate category counts based on all products (all female products)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    // Count all products for each category (excluding featured products)
    allProducts.forEach((product) => {
      // Exclude featured products from count (same as filtering logic)
      if (product.isFeatured) return
      const productCategoryId = product.categoryId || product.category?.id || ""
      if (productCategoryId) {
        counts[productCategoryId] = (counts[productCategoryId] || 0) + 1
      }
    })
    return counts
  }, [allProducts])

  // Scroll to top when filters change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [selectedSize, selectedColors, selectedCategories, selectedBrands, priceRange])

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(c => c !== categoryId)
      } else {
        return [...prev, categoryId]
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
      <section className="py-16 bg-gradient-to-br from-secondary/10 via-background to-primary/10">
        <Container>
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-16 h-16 bg-gradient-secondary rounded-2xl flex items-center justify-center">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-5xl font-bold">
                Shoes for <span className="gradient-text">Women</span>
              </h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8">
              Discover the women's shoe collection with elegant designs, bright colors and modern style
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
                    Women's Filter
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
                    <div className="grid grid-cols-2 gap-2">

                      {availableColors.map((color) => {
                        const isSelected = selectedColors.includes(color)
                        return (
                          <Button
                            key={color}
                            variant={isSelected ? "default" : "ghost"}
                            size="sm"
                            onClick={() => handleColorClick(color)}
                            className="text-xs flex items-center"
                          >
                            {color}
                            {isSelected && (
                              <Check className="ml-auto h-3 w-3" />
                            )}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Sizes */}
                {availableSizes.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Size</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={selectedSize === null ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setSelectedSize(null)}
                        className="text-xs"
                      >
                        All
                      </Button>
                      {availableSizes.map((size) => (
                        <Button
                          key={size}
                          variant={selectedSize === size ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setSelectedSize(size)}
                          className="text-xs"
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Range */}
                <div>
                  <h4 className="font-medium mb-3">Price range</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{priceRange[0].toLocaleString('vi-VN')}₫</span>
                      <span>{priceRange[1].toLocaleString('vi-VN')}₫</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5000000"
                      step="100000"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Categories</h4>
                    <div className="space-y-2">
                      {selectedCategories.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCategories([])}
                          className="w-full justify-start text-sm text-muted-foreground"
                        >
                          Clear Categories
                        </Button>
                      )}
                      {categories.map((category) => {
                        const categoryId = category.id || ""
                        const isSelected = selectedCategories.includes(categoryId)
                        const count = categoryCounts[categoryId] ?? 0
                        const isDisabled = count === 0 && !isSelected
                        
                        return (
                          <Button
                            key={category._id || categoryId}
                            variant={isSelected ? "default" : "ghost"}
                            size="sm"
                            onClick={() => handleCategoryClick(categoryId)}
                            disabled={isDisabled}
                            className={cn(
                              "w-full justify-start text-sm flex items-center",
                              isDisabled && "opacity-50 cursor-not-allowed"
                            )}
                            title={isDisabled ? "No products in this category" : ""}
                          >
                            {category.name}
                            {isSelected && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                            {!isDisabled && !isSelected && count > 0 && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                ({count})
                              </span>
                            )}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Brands */}
                {availableBrands.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Brands</h4>
                    <div className="space-y-2">

                      {availableBrands.map((brand) => {
                        const isInCurrentProducts = currentBrands.includes(brand)
                        const isSelected = selectedBrands.includes(brand)
                        return (
                          <Button
                            key={brand}
                            variant={isSelected ? "default" : "ghost"}
                            size="sm"
                            onClick={() => handleBrandClick(brand)}
                            disabled={!isInCurrentProducts && !isSelected}
                            className={cn(
                              "w-full justify-start text-sm",
                              !isInCurrentProducts && !isSelected && "opacity-50 cursor-not-allowed"
                            )}
                            title={!isInCurrentProducts && !isSelected ? "No products in this category" : ""}
                          >
                            {brand}
                            {isSelected && (
                              <span className="ml-auto text-xs">✓</span>
                            )}
                            {!isInCurrentProducts && isSelected && (
                              <span className="ml-auto text-xs text-muted-foreground">(0)</span>
                            )}
                          </Button>
                        )
                      })}
                    </div>
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
                <h2 className="text-xl font-semibold mb-1">Women's Shoes</h2>
                <p className="text-muted-foreground text-sm">
                  Showing {sortedProducts.length} products
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-secondary"
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
                        // Lấy image từ colors[0].images[0] (format mới)
                        if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
                          const firstColor = product.colors[0]
                          if (typeof firstColor === 'object' && firstColor.images && firstColor.images.length > 0) {
                            return firstColor.images[0]
                          }
                        }
                        // Fallback về image cũ nếu không có colors
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
                <div className="w-24 h-24 bg-gradient-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground">
                  Adjust the filters to see more products for women
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