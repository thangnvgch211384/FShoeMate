import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { Star, ThumbsUp, User, Filter, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Container } from "@/components/layout/Container"
import { Navbar } from "@/components/layout/Navbar"
import { fetchReviews, createReview } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface Review {
  _id: string
  id: string
  userId?: { name: string; avatar?: string }
  userName?: string
  rating: number
  comment: string
  createdAt: string
  date?: string
  helpful?: number
}

const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) => {
  const starSize = size === "lg" ? "h-6 w-6" : "h-4 w-4"
  
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${starSize} ${
            star <= rating 
              ? "fill-yellow-400 text-yellow-400" 
              : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  )
}

const ReviewCard = ({ review }: { review: Review }) => (
  <Card className="hover:shadow-elegant transition-all duration-300">
    <CardContent className="pt-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-hero rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold">{review.userName}</p>
            <p className="text-sm text-muted-foreground">{review.date}</p>
          </div>
        </div>
        <StarRating rating={review.rating} />
      </div>
      
      <p className="text-foreground mb-4 leading-relaxed">{review.comment}</p>
      
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground hover:text-primary"
        >
          <ThumbsUp className="h-4 w-4 mr-2" />
          Hữu ích ({review.helpful})
        </Button>
        <Badge variant="outline">Đã mua hàng</Badge>
      </div>
    </CardContent>
  </Card>
)

const WriteReviewForm = ({ onSubmit }: { onSubmit: (review: { rating: number; comment: string }) => void }) => {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [hoveredStar, setHoveredStar] = useState(0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0 || !comment.trim()) return
    
    onSubmit({ rating, comment })
    
    setRating(0)
    setComment("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write review</CardTitle>
        <CardDescription>Share your experience with the product</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Đánh giá của bạn</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 hover:scale-110 transition-transform"
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredStar || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Review</label>
            <Textarea
              placeholder="Share your experience with the product..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={rating === 0 || !comment.trim()}
            className="w-full"
          >
            Submit review
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function Reviews() {
  const { productId } = useParams()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const { toast } = useToast()

  useEffect(() => {
    const loadReviews = async () => {
      if (!productId) return
      try {
        setLoading(true)
        const response = await fetchReviews(productId, { page: 1, limit: 50 })
        const data = response.reviews || []
        setReviews(data.map((r: any) => ({
          ...r,
          id: r._id || r.id,
            userName: r.userId?.name || r.userName || "Guest",
          date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : r.date
        })))
      } catch (error: any) {
        console.error('Failed to load reviews:', error)
        toast({
          title: "Error",
          description: error.message || "Cannot load reviews",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    loadReviews()
  }, [productId, toast])

  const handleNewReview = async (newReview: { rating: number; comment: string }) => {
    if (!productId) return
    try {
      const response = await createReview(productId, newReview)
      const created = response.review || response
      setReviews(prev => [{
        ...created,
        id: created._id || created.id,
        userName: "You",
        date: new Date().toLocaleDateString('vi-VN'),
        helpful: 0
      }, ...prev])
      toast({
        title: "Success",
        description: "Your review has been submitted"
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Cannot submit review",
        variant: "destructive"
      })
    }
  }

  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0

  const ratingBreakdown = [5, 4, 3, 2, 1].map(rating => ({
    stars: rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 
      : 0
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <Container className="py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-muted rounded-xl"></div>
              ))}
            </div>
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Container className="py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text">Product reviews</h1>
            <p className="text-muted-foreground mt-2">
              <Link to="/products" className="hover:text-primary transition-colors">
                Product
              </Link>
              {" / "}
              <Link to={`/products/${productId}`} className="hover:text-primary transition-colors">
                Details
              </Link>
              <span> / Reviews</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rating Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Review Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold gradient-text mb-2">
                    {avgRating.toFixed(1)}
                  </div>
                  <StarRating rating={Math.round(avgRating)} size="lg" />
                  <p className="text-muted-foreground mt-2">
                    {reviews.length} reviews
                  </p>
                </div>
                
                <div className="space-y-3">
                  {ratingBreakdown.map(({ stars, count, percentage }) => (
                    <div key={stars} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-6">{stars}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-hero rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Write Review */}
            <WriteReviewForm onSubmit={handleNewReview} />
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                All reviews ({reviews.length})
              </h2>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {reviews.map(review => (
                <ReviewCard key={review.id} review={review} />
              ))}
              
              {reviews.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No reviews yet</h3>
                    <p className="text-muted-foreground">
                      Be the first to review this product
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}