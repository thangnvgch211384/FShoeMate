import { ProductCard } from "@/components/product/ProductCard"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { fetchProducts } from "@/lib/api"
import { useEffect, useState } from "react"

export function FeaturedProducts() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        // Fetch only featured products
        const response = await fetchProducts({ isFeatured: "true", limit: "5" })
        // Backend returns { success: true, items, total, page, limit }
        const items = response.items || response.products || []
        
        if (items.length === 0) {
          setFeaturedProducts([])
          setLoading(false)
          return
        }
        
        
        const featured = items
          .filter((p: any) => {
            // Only show active products
            return p.status === "active" || p.status === undefined
          })
          .map((p: any) => ({
            ...p,
            id: p._id, // Use _id as fallback
            slug: p.slug, // Use slug for URLs
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
            rating: p.rating || p.averageRating || 0,
            reviewCount: p.reviewCount || 0,
            categoryName: p.categoryName || p.category?.name
          }))
          .slice(0, 5) // Limit to 5 featured products
        setFeaturedProducts(featured)
      } catch (error) {
        console.error("Failed to load featured products:", error)
        setFeaturedProducts([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <section className="py-20 bg-background">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            <span className="gradient-text">Featured</span> Products
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the most loved shoes with modern designs 
            and advanced technology.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
          {featuredProducts.map((product, index) => (
            <div 
                  key={product._id || index}
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
                    image={product.image}
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
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No featured products available</p>
            <Button variant="outline" size="lg" className="group" asChild>
              <a href="/products">
            View All Products
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
          </Button>
        </div>
        )}
        
      </Container>
    </section>
  )
}