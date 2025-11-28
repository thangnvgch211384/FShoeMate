import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Container } from "@/components/layout/Container"
import { ProductCard } from "@/components/product/ProductCard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Filter, SlidersHorizontal, Grid3X3, List, Sparkles, Calendar, TrendingUp } from "lucide-react"
import { fetchProducts } from "@/lib/api"

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
  categoryId?: string
  createdAt?: string
  updatedAt?: string
}

const collections = {
  new: {
    title: "New Collection",
    description: "The latest designs from top brands",
    icon: Sparkles,
    gradient: "from-primary/10 to-secondary/10",
    filter: (product: Product) => product.isNew || false
  },
  trending: {
    title: "Trending 2025",
    description: "The most popular shoes of the year",
    icon: TrendingUp,
    gradient: "from-secondary/10 to-warning/10",
    filter: (product: Product) => (product.rating || 0) >= 4.5
  },
  limited: {
    title: "Limited Edition",
    description: "The limited edition shoes with a limited quantity",
    icon: Calendar,
    gradient: "from-destructive/10 to-primary/10",
    filter: (product: Product) => product.name.toLowerCase().includes('limited')
  }
}

export default function Collections() {
  const { slug } = useParams()
  const [sortBy, setSortBy] = useState("newest")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const collectionKey = slug || 'new'
  const collection = collections[collectionKey as keyof typeof collections] || collections.new

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true)
        const response = await fetchProducts()
        const items = response.items || response.products || []
        setProducts(items.map((p: any) => ({
          ...p,
          id: p._id,
          slug: p.slug,
          image: p.images?.[0] || p.image || ""
        })))
      } catch (err: any) {
        setError(err.message || "Cannot load products")
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  // Filter products based on collection
  const collectionProducts = products.filter(collection.filter)

  const sortedProducts = [...collectionProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        // Sort theo giá hiển thị thực tế (price field - giá mà user sẽ trả)
        return a.price - b.price
      case "price-high":
        // Sort theo giá hiển thị thực tế (price field - giá mà user sẽ trả)
        return b.price - a.price
      case "popularity":
        return (b.reviewCount || 0) - (a.reviewCount || 0)
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

  const filteredProducts = selectedBrand 
    ? sortedProducts.filter(p => p.brand.toLowerCase() === selectedBrand.toLowerCase())
    : sortedProducts

  const availableBrands = [...new Set(collectionProducts.map(p => p.brand))]

  const CollectionIcon = collection.icon

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className={`py-16 bg-gradient-to-br ${collection.gradient}`}>
        <Container>
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-20 h-20 bg-gradient-hero rounded-3xl flex items-center justify-center shadow-glow">
                <CollectionIcon className="h-10 w-10 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-5xl font-bold mb-2">
                  {collection.title}
                </h1>
                <p className="text-xl text-muted-foreground">
                  {collection.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
              <Badge variant="secondary" className="px-4 py-2">
                {filteredProducts.length} products
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                Weekly updates
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                Authentic 100%
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
                <h3 className="font-semibold text-lg mb-4 flex items-center">
                  <Filter className="mr-2 h-5 w-5" />
                  Collection Filter
                </h3>

                {/* Brands */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Brands</h4>
                  <div className="space-y-2">
                    <Button
                      variant={selectedBrand === null ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedBrand(null)}
                      className="w-full justify-start"
                    >
                      All
                    </Button>
                    {availableBrands.map((brand) => (
                      <Button
                        key={brand}
                        variant={selectedBrand === brand ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setSelectedBrand(brand)}
                        className="w-full justify-between"
                      >
                        {brand}
                        <Badge variant="secondary">
                          {collectionProducts.filter(p => p.brand === brand).length}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Collection Info */}
                <div className="bg-muted/50 rounded-xl p-4">
                  <h4 className="font-medium mb-2">💡 About this collection</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {collectionKey === 'new' && "Updated weekly with the latest designs from top brands worldwide."}
                    {collectionKey === 'trending' && "The most popular shoes of the year by customers and high ratings."}
                    {collectionKey === 'limited' && "The limited edition shoes with a limited quantity, only for true sneaker fans."}
                  </p>
                </div>
              </div>

              {/* Featured Collection */}
              <div className="bg-gradient-primary rounded-2xl p-6 text-white text-center">
                <h3 className="font-bold text-lg mb-2">🎯 Special selection</h3>
                <p className="text-sm opacity-90 mb-4">
                  Each product is carefully reviewed for quality and style
                </p>
                <Button variant="secondary" size="sm" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  Learn more
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-xl font-semibold mb-1 flex items-center">
                  <CollectionIcon className="h-5 w-5 mr-2" />
                  {collection.title}
                </h2>
                <p className="text-muted-foreground text-sm">
                  Displaying {filteredProducts.length} products
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
                  <option value="popularity">Most popular</option>
                  <option value="price-low">Price low to high</option>
                  <option value="price-high">Price high to low</option>
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

            {/* Collection Highlights */}
            {collectionKey === 'new' && (
              <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-6 mb-8 border border-primary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-primary mb-2">✨ New this week</h3>
                    <p className="text-sm text-muted-foreground">
                      The latest designs from top brands
                    </p>
                  </div>
                  <Badge variant="outline" className="px-4 py-2 border-primary text-primary">
                    HOT
                  </Badge>
                </div>
              </div>
            )}

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <div className={
                viewMode === "grid" 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }>
                {filteredProducts.map((product, index) => (
                  <div
                    key={product._id}
                    className="animate-fade-in relative group"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Collection Badge */}
                    {product.isNew && (
                      <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        NEW
                      </div>
                    )}
                    <ProductCard
                      id={product._id}
                      slug={product.slug}
                      name={product.name}
                      brand={product.brand}
                      price={product.price}
                      originalPrice={product.originalPrice}
                      image={product.image}
                      hoverImage={product.hoverImage}
                      rating={product.rating || 0}
                      reviewCount={product.reviewCount || 0}
                      isNew={product.isNew}
                      isOnSale={product.isOnSale}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <SlidersHorizontal className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2"></h3>
                <p className="text-muted-foreground">
                  Adjust the filters to see more products in the collection
                </p>
              </div>
            )}

            {/* Load More */}
            {filteredProducts.length > 0 && (
              <div className="text-center mt-12">
                <Button variant="outline" size="lg">
                  View more products
                </Button>
              </div>
            )}

            {/* Related Collections */}
            <div className="mt-16">
              <h3 className="text-xl font-semibold mb-6">Related collections</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(collections)
                  .filter(([key]) => key !== collectionKey)
                  .map(([key, col]) => {
                    const Icon = col.icon
                    return (
                      <div key={key} className="group cursor-pointer">
                        <div className={`bg-gradient-to-br ${col.gradient} rounded-2xl p-6 border border-border/50 hover:shadow-elegant transition-all duration-300`}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                              <Icon className="h-5 w-5" />
                            </div>
                            <h4 className="font-semibold">{col.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">
                            {col.description}
                          </p>
                          <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            Discover
                          </Button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      </Container>

      <Footer />
    </div>
  )
}