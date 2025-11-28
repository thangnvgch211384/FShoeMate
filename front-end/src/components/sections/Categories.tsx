import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { ArrowRight, Footprints, Zap, Activity, Trophy, Dumbbell } from "lucide-react"
import { fetchCategories } from "@/lib/api"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

// Category icons mapping
const categoryIcons: Record<string, any> = {
  lifestyle: Footprints,
  running: Zap,
  skateboarding: Activity,
  football: Trophy,
  "training-gym": Dumbbell,
  "training & gym": Dumbbell,
}

// Category colors mapping
const categoryColors: Record<string, string> = {
  lifestyle: "from-blue-500/20 to-purple-500/20",
  running: "from-green-500/20 to-emerald-500/20",
  skateboarding: "from-orange-500/20 to-red-500/20",
  football: "from-yellow-500/20 to-amber-500/20",
  "training-gym": "from-pink-500/20 to-rose-500/20",
  "training & gym": "from-pink-500/20 to-rose-500/20",
}

export function Categories() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const response = await fetchCategories()
        // Backend returns { success: true, categories }
        const items = response.categories || response.items || []
        
        if (items.length === 0) {
          setCategories([])
          setLoading(false)
          return
        }
        
        // Sort to show specific categories first
        const sortedItems = items.sort((a: any, b: any) => {
          const order = ["lifestyle", "running", "skateboarding", "football", "training-gym"]
          const aIndex = order.indexOf(a.id?.toLowerCase() || "")
          const bIndex = order.indexOf(b.id?.toLowerCase() || "")
          if (aIndex === -1 && bIndex === -1) return 0
          if (aIndex === -1) return 1
          if (bIndex === -1) return -1
          return aIndex - bIndex
        })
        setCategories(sortedItems)
      } catch (error) {
        console.error("Failed to load categories:", error)
        setCategories([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const getCategoryIcon = (categoryId: string, categoryName: string) => {
    const id = categoryId?.toLowerCase() || ""
    const name = categoryName?.toLowerCase() || ""
    return categoryIcons[id] || categoryIcons[name] || Footprints
  }

  const getCategoryColor = (categoryId: string, categoryName: string) => {
    const id = categoryId?.toLowerCase() || ""
    const name = categoryName?.toLowerCase() || ""
    return categoryColors[id] || categoryColors[name] || "from-primary/20 to-secondary/20"
  }

  return (
    <section className="py-16 bg-background">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Shop by <span className="gradient-text">Category</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find the perfect shoes for every activity and style.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.slice(0, 5).map((category, index) => {
              const Icon = getCategoryIcon(category.id, category.name)
              const gradientColor = getCategoryColor(category.id, category.name)
              
              // Ensure we use category.id (string) not _id (ObjectId)
              // category.id should be "lifestyle", "running", etc.
              const categoryId = category.id
              
              if (!categoryId) {
                console.warn("Category missing id field:", category)
              }
              
              return (
                <Link
                  key={category._id || category.id || index}
                  to={`/products?category=${categoryId}`}
                  className="group relative bg-card rounded-2xl border border-border/50 p-6 hover:shadow-large hover:border-primary/30 transition-all duration-300 hover:-translate-y-2 cursor-pointer overflow-hidden"
                >
                  {/* Gradient Background */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                    gradientColor
                  )} />
                  
                  {/* Icon */}
                  <div className="relative z-10 mb-4">
                    <div className="w-16 h-16 bg-gradient-hero/10 rounded-2xl flex items-center justify-center group-hover:bg-gradient-hero/20 transition-colors">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  
                  {/* Content */}
              <div className="relative z-10">
                    <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {category.count || 0} products
                </p>
                    <div className="flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Shop now
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
              </div>

                  {/* Hover Border Effect */}
                  <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/20 rounded-2xl transition-colors pointer-events-none" />
                </Link>
              )
            })}
            </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No categories available</p>
        </div>
        )}
      </Container>
    </section>
  )
}