import { useEffect, useState, useMemo } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Search as SearchIcon, SlidersHorizontal, Grid3X3, List, X, Filter, Check } from "lucide-react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Container } from "@/components/layout/Container"
import { ProductCard } from "@/components/product/ProductCard"
import { Button } from "@/components/ui/button"
import { fetchProducts, fetchCategories } from "@/lib/api"
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
  colors?: { name: string; hex: string }[] | string[]
  createdAt?: string
  updatedAt?: string
}

interface Category {
  id?: string
  _id?: string
  name: string
  count?: number
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get("q") || ""
  
  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState("newest")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000000])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedSize, setSelectedSize] = useState<string | null>(null)

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetchCategories()
        const allCategories = res.categories || res || []
        setCategories(allCategories)
      } catch (e) {
        console.error(e)
      }
    }
    loadCategories()
  }, [])

  // Load all products for filter options
  useEffect(() => {
    if (!query.trim()) {
      setProducts([])
      setAllProducts([])
      setLoading(false)
      return
    }

    async function searchProducts() {
      try {
        setLoading(true)
        setError(null)
        
        const params: Record<string, string | number> = {
          q: query,
          limit: 100 
        }

        const res = await fetchProducts(params)
        const items = res.items || res.products || []
        
        const mappedProducts = items.map((p: any) => ({
          ...p,
          id: p._id,
          slug: p.slug,
          image: p.images?.[0] || p.image || "",
          categoryName: p.categoryName || p.category?.name,
          categoryId: p.categoryId || p.category?.id,
          rating: p.rating || p.averageRating || 0,
          sizes: p.sizes || [],
          colors: p.colors || []
        }))
        
        setProducts(mappedProducts)
        setAllProducts(mappedProducts)
      } catch (e: any) {
        setError(e.message || "Cannot search products")
      } finally {
        setLoading(false)
      }
    }

    searchProducts()
  }, [query])

  // Filter products (excluding category filter for count calculation)
  const productsWithoutCategoryFilter = useMemo(() => {
    return products.filter((product) => {
      // Filter by price
      if (product.price < priceRange[0] || product.price > priceRange[1]) return false
      // Filter by size
      if (selectedSize && product.sizes && !product.sizes.includes(selectedSize)) return false
      // Filter by colors
      if (selectedColors.length > 0 && product.colors) {
        const colorNames = product.colors.map((c: any) => typeof c === 'string' ? c : c.name)
        const hasSelectedColor = selectedColors.some(color => colorNames.includes(color))
        if (!hasSelectedColor) return false
      }
      // Filter by brands
      if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) return false
      return true
    })
  }, [products, priceRange, selectedSize, selectedColors, selectedBrands])

  // Final filtered products including category filter
  const filteredProducts = useMemo(() => {
    return productsWithoutCategoryFilter.filter((product) => {
      // Filter by categories (multi-select)
      if (selectedCategories.length > 0) {
        const productCategoryId = product.categoryId || product.category?.id || ""
        if (!selectedCategories.includes(productCategoryId)) return false
      }
      return true
    })
  }, [productsWithoutCategoryFilter, selectedCategories])

  // Sort products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
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
  }, [filteredProducts, sortBy])

  // Get available options from ALL products (not filtered) to always show all options
  const allBrands = allProducts.length > 0 ? [...new Set(allProducts.map(p => p.brand).filter(Boolean))].sort() : []
  const currentBrands = productsWithoutCategoryFilter.length > 0 ? [...new Set(productsWithoutCategoryFilter.map(p => p.brand).filter(Boolean))] : []
  const availableBrands = [...new Set([...currentBrands, ...selectedBrands, ...allBrands])].sort()
  
  // Get sizes from ALL products, not filtered products
  const allSizes = [...new Set(allProducts.flatMap(p => p.sizes || []))].sort((a, b) => {
    const numA = parseFloat(a.replace(/[^0-9.]/g, '')) || 0
    const numB = parseFloat(b.replace(/[^0-9.]/g, '')) || 0
    return numA - numB
  })
  
  // Get colors from ALL products, not filtered products
  const allColors = [...new Set(allProducts.flatMap(p => {
    if (!p.colors) return []
    return p.colors.map((c: any) => typeof c === 'string' ? c : c.name)
  }))].sort()
  
  // Use all options for display, but check availability in filtered products for disabled state
  const availableSizes = allSizes
  const availableColors = allColors

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    productsWithoutCategoryFilter.forEach((product) => {
      const productCategoryId = product.categoryId || product.category?.id || ""
      if (productCategoryId) {
        counts[productCategoryId] = (counts[productCategoryId] || 0) + 1
      }
    })
    return counts
  }, [productsWithoutCategoryFilter])

  const clearFilters = () => {
    setPriceRange([0, 5000000])
    setSelectedCategories([])
    setSelectedBrands([])
    setSelectedColors([])
    setSelectedSize(null)
  }

  const hasActiveFilters = selectedCategories.length > 0 || selectedBrands.length > 0 || selectedColors.length > 0 || selectedSize !== null || priceRange[1] < 5000000

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) ? prev.filter(c => c !== categoryId) : [...prev, categoryId]
    )
  }

  const handleBrandClick = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    )
  }

  const handleColorClick = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    )
  }

  const handleSizeClick = (size: string | null) => {
    setSelectedSize(size)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <Container className="py-8">
        {/* Search Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <SearchIcon className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold">
              {query ? `Search results for "${query}"` : "Search Products"}
            </h1>
          </div>
          
          {query && (
            <p className="text-muted-foreground">
              {loading ? "Searching..." : sortedProducts.length > 0 
                ? `Found ${sortedProducts.length} product${sortedProducts.length !== 1 ? 's' : ''}`
                : "No products found"}
            </p>
          )}
          
          {!query && (
            <p className="text-muted-foreground">
              Enter a search term to find products
            </p>
          )}
        </div>

        {query && (
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

                  {/* Sizes */}
                  {availableSizes.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-3">Size</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant={selectedSize === null ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handleSizeClick(null)}
                          className="text-xs"
                        >
                          All
                        </Button>
                        {availableSizes.map((size) => {
                          // Check if size is available in filtered products (excluding size filter)
                          const sizeAvailable = products.filter(p => {
                            if (p.price < priceRange[0] || p.price > priceRange[1]) return false
                            if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false
                            if (selectedColors.length > 0 && p.colors) {
                              const colorNames = p.colors.map((c: any) => typeof c === 'string' ? c : c.name)
                              const hasSelectedColor = selectedColors.some(color => colorNames.includes(color))
                              if (!hasSelectedColor) return false
                            }
                            if (selectedCategories.length > 0) {
                              const productCategoryId = p.categoryId || p.category?.id || ""
                              if (!selectedCategories.includes(productCategoryId)) return false
                            }
                            return p.sizes && p.sizes.includes(size)
                          }).length > 0
                          
                          const isSelected = selectedSize === size
                          const isDisabled = !sizeAvailable && !isSelected
                          
                          return (
                            <Button
                              key={size}
                              variant={isSelected ? "default" : "ghost"}
                              size="sm"
                              onClick={() => !isDisabled && handleSizeClick(size)}
                              disabled={isDisabled}
                              className={cn(
                                "text-xs",
                                isDisabled && "opacity-50 cursor-not-allowed"
                              )}
                              title={isDisabled ? "No products with this size" : ""}
                            >
                              {size}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Colors */}
                  {availableColors.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-3">Color</h4>
                      <div className="grid grid-cols-2 gap-2">

                        {availableColors.map((color) => {
                          const isSelected = selectedColors.includes(color)
                          // Check if color is available in filtered products (excluding color filter)
                          const colorAvailable = products.filter(p => {
                            if (p.price < priceRange[0] || p.price > priceRange[1]) return false
                            if (selectedSize && p.sizes && !p.sizes.includes(selectedSize)) return false
                            if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false
                            if (selectedCategories.length > 0) {
                              const productCategoryId = p.categoryId || p.category?.id || ""
                              if (!selectedCategories.includes(productCategoryId)) return false
                            }
                            if (!p.colors) return false
                            const colorNames = p.colors.map((c: any) => typeof c === 'string' ? c : c.name)
                            return colorNames.includes(color)
                          }).length > 0
                          
                          const count = productsWithoutCategoryFilter.filter(p => {
                            if (!p.colors) return false
                            const colorNames = p.colors.map((c: any) => typeof c === 'string' ? c : c.name)
                            return colorNames.includes(color)
                          }).length
                          
                          const isDisabled = !colorAvailable && !isSelected
                          
                          return (
                            <Button
                              key={color}
                              variant={isSelected ? "default" : "ghost"}
                              size="sm"
                              onClick={() => !isDisabled && handleColorClick(color)}
                              disabled={isDisabled}
                              className={cn(
                                "w-full justify-start text-sm flex items-center",
                                isDisabled && "opacity-50 cursor-not-allowed"
                              )}
                              title={isDisabled ? "No products with this color" : ""}
                            >
                              {color}
                              {isSelected && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                              {!isDisabled && !isSelected && (
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

                  {/* Categories */}
                  {categories.length > 0 && (
                    <div className="mb-6">
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
                              key={categoryId || category._id}
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
                              {!isDisabled && !isSelected && (
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
                    <div className="mb-6">
                      <h4 className="font-medium mb-3">Brands</h4>
                      <div className="space-y-2">
                        {selectedBrands.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedBrands([])}
                            className="w-full justify-start text-sm text-muted-foreground"
                          >
                            Clear Brands
                          </Button>
                        )}
                        {availableBrands.map((brand) => {
                          const isInCurrentProducts = currentBrands.includes(brand)
                          const isSelected = selectedBrands.includes(brand)
                          const count = productsWithoutCategoryFilter.filter(p => p.brand === brand).length
                          const isDisabled = count === 0 && !isSelected
                          return (
                            <Button
                              key={brand}
                              variant={isSelected ? "default" : "ghost"}
                              size="sm"
                              onClick={() => handleBrandClick(brand)}
                              disabled={isDisabled}
                              className={cn(
                                "w-full justify-start text-sm flex items-center",
                                isDisabled && "opacity-50 cursor-not-allowed"
                              )}
                              title={isDisabled ? "No products from this brand" : ""}
                            >
                              {brand}
                              {isSelected && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                              {!isDisabled && !isSelected && (
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

                  {/* Price Range */}
                  <div>
                    <h4 className="font-medium mb-3">Price Range</h4>
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
                  Searching products...
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
                        image={(() => {
                          if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
                            const firstColor = product.colors[0]
                            if (typeof firstColor === 'object' && firstColor.images && firstColor.images.length > 0) {
                              return firstColor.images[0]
                            }
                          }
                          return product.image || ""
                        })()}
                        hoverImage={product.hoverImage}
                        rating={product.rating || product.averageRating || 0}
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
                    <SearchIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No products found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search terms or filters
                  </p>
                  <Button onClick={() => navigate("/products")} variant="outline">
                    Browse All Products
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {!query && (
          <div className="text-center py-16">
            <SearchIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Start searching</h3>
            <p className="text-muted-foreground">
              Use the search bar above to find products
            </p>
          </div>
        )}
      </Container>

      <Footer />
    </div>
  )
}

