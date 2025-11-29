import { useEffect, useMemo, useRef, useState } from "react"
import { useCart } from "@/contexts/CartContext"
import { useAuth } from "@/contexts/AuthContext"
import { useParams } from "react-router-dom"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { Heart, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchProductDetail, fetchProductVariants, addToWishlist, removeFromWishlist, checkWishlist, fetchReviews, createReview } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface Product {
  _id: string
  name: string
  slug?: string
  description: string
  price: number
  originalPrice?: number
  rating?: number
  reviewCount?: number
  brand?: string
  isNew?: boolean
  isOnSale?: boolean
  categoryName?: string
  sizes?: string[]
  colors?: { name: string; hex: string; images?: string[] }[]
}

interface ProductVariant {
  _id: string
  size: string
  color: string
  price: number
  discountPrice?: number
  images?: string[]
  stock?: number
}

export default function ProductDetail() {
  const { id } = useParams()
  const { addToCart } = useCart()
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()

  const [product, setProduct] = useState<Product | null>(null)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [selectedSize, setSelectedSize] = useState("")
  const [selectedColor, setSelectedColor] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [isLiked, setIsLiked] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [showDeliveryInfo, setShowDeliveryInfo] = useState(false)
  const [showReviews, setShowReviews] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewFilter, setReviewFilter] = useState<number | null>(null)
  const [showWriteReview, setShowWriteReview] = useState(false)
  const [newReviewRating, setNewReviewRating] = useState(0)
  const [newReviewComment, setNewReviewComment] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    if (!id) return

    let isMounted = true
    setLoading(true)

    const loadData = async () => {
      try {
        const detailRes = await fetchProductDetail(id)
        if (!isMounted) return
        const productData: Product = detailRes.product
        setProduct(productData)

        try {
          const variantRes = await fetchProductVariants(productData._id)
          if (!isMounted) return
          const list: ProductVariant[] = variantRes.variants ?? []
          setVariants(list)
          if (list.length > 0) {
            const first = list[0]
            setSelectedSize(first.size)
            setSelectedColor(first.color)
          } else if (productData.sizes && productData.sizes.length > 0) {
            setSelectedSize(productData.sizes[0])
          }
          if (list.length === 0 && productData.colors && productData.colors.length > 0) {
            const firstColor = typeof productData.colors[0] === 'string'
              ? productData.colors[0]
              : productData.colors[0].name
            setSelectedColor(firstColor)
          }
        } catch (variantError) {
          console.error("Failed to load variants", variantError)
          if (productData.sizes && productData.sizes.length > 0 && !selectedSize) {
            setSelectedSize(productData.sizes[0])
          }
          if (productData.colors && productData.colors.length > 0 && !selectedColor) {
            const firstColor = typeof productData.colors[0] === 'string'
              ? productData.colors[0]
              : productData.colors[0].name
            setSelectedColor(firstColor)
          }
        }

        if (isAuthenticated && productData._id) {
          try {
            const wishlistRes = await checkWishlist(productData._id)
            if (!isMounted) return
            setIsLiked(wishlistRes.inWishlist || wishlistRes.isInWishlist || false)
          } catch (wishlistError) {
            console.error("Failed to check wishlist", wishlistError)
            setIsLiked(false)
          }
        } else {
          setIsLiked(false)
        }

        try {
          const reviewsRes = await fetchReviews(productData._id, { page: 1, limit: 10 })
          if (!isMounted) return
          const reviewsList = reviewsRes.reviews || []
          setReviews(reviewsList.map((r: any) => ({
            ...r,
            userName: r.userId?.name || r.userName || "Anonymous",
            date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : r.date,
            helpful: r.helpful || 0
          })))
        } catch (reviewsError) {
          console.error("Failed to load reviews", reviewsError)
        }

        setError(null)
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setError("Product not found")
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [id, isAuthenticated])

  const sizeOptions = useMemo(() => {
    if (variants.length > 0) {
      return Array.from(new Set(variants.map(v => v.size))).sort((a, b) => {
        const numA = parseFloat(a.replace(/[^0-9.]/g, '')) || 0
        const numB = parseFloat(b.replace(/[^0-9.]/g, '')) || 0
        return numA - numB
      })
    }
    if (product?.sizes && product.sizes.length > 0) {
      return product.sizes.sort((a, b) => {
        const numA = parseFloat(a.replace(/[^0-9.]/g, '')) || 0
        const numB = parseFloat(b.replace(/[^0-9.]/g, '')) || 0
        return numA - numB
      })
    }
    return []
  }, [variants, product])

  const colorOptions = useMemo(() => {
    if (product?.colors && product.colors.length > 0) {
      return product.colors.map(c => typeof c === 'string' ? c : c.name)
    }

    if (!selectedSize) {
      return Array.from(new Set(variants.map(v => v.color)))
    }
    return variants
      .filter(v => v.size === selectedSize)
      .map(v => v.color)
      .filter((color, index, self) => self.indexOf(color) === index)
  }, [product?.colors, variants, selectedSize])

  const selectedVariant = variants.find(
    (variant) => variant.size === selectedSize && variant.color === selectedColor
  )

  const imagesByColor = useMemo(() => {
    const map: Record<string, string[]> = {}

    if (product?.colors && product.colors.length > 0) {
      const hasImagesInColors = product.colors.some((c: any) =>
        c && typeof c === 'object' && Array.isArray(c.images) && c.images.length > 0
      )

      product.colors.forEach((color: any) => {
        const colorName = typeof color === 'string' ? color : color.name
        const colorImages = typeof color === 'object' && Array.isArray(color.images)
          ? color.images.filter((img: string) => img && img.trim())
          : []
        if (colorImages.length > 0) {
          map[colorName] = colorImages
        }
      })
    }

    variants.forEach(variant => {
      if (variant.images && variant.images.length > 0) {
        if (!map[variant.color] || map[variant.color].length === 0) {
          map[variant.color] = variant.images
        }
      }
    })

    return map
  }, [product?.colors, variants])

  const stableImagesByColorRef = useRef<Record<string, string[]>>({})

  useEffect(() => {
    Object.keys(imagesByColor).forEach(color => {
      const colorImages = imagesByColor[color]
      if (colorImages && colorImages.length > 0) {
        stableImagesByColorRef.current[color] = colorImages
      }
    })
  }, [imagesByColor])

  const allImages = useMemo(() => {
    if (selectedColor && stableImagesByColorRef.current[selectedColor] && stableImagesByColorRef.current[selectedColor].length > 0) {
      return stableImagesByColorRef.current[selectedColor]
    }

    if (selectedColor && imagesByColor[selectedColor] && imagesByColor[selectedColor].length > 0) {
      return imagesByColor[selectedColor]
    }

    if (selectedVariant?.images && selectedVariant.images.length > 0 && selectedVariant.color === selectedColor) {
      return selectedVariant.images
    }

    return []
  }, [selectedColor, imagesByColor, selectedVariant?.images, selectedVariant?.color])

  const prevSelectedColorRef = useRef<string>(selectedColor)
  const isSizeChangingRef = useRef<boolean>(false)

  useEffect(() => {
    const colorChanged = prevSelectedColorRef.current !== selectedColor

    if (isSizeChangingRef.current) {
      isSizeChangingRef.current = false
      prevSelectedColorRef.current = selectedColor
      return
    }

    if (allImages.length > 0 && selectedImageIndex >= allImages.length) {
      setSelectedImageIndex(0)
    } else if (allImages.length === 0 && selectedImageIndex > 0) {
      setSelectedImageIndex(0)
    } else if (colorChanged) {
      setSelectedImageIndex(0)
    }

    prevSelectedColorRef.current = selectedColor
  }, [allImages.length, selectedImageIndex, selectedColor])

  // Reset to first image (index 0) when allImages array changes (e.g., product loads or color changes)
  const prevAllImagesLengthRef = useRef<number>(0)
  useEffect(() => {
    // Only reset if allImages actually changed (length or content)
    if (allImages.length > 0 && (prevAllImagesLengthRef.current !== allImages.length || selectedImageIndex >= allImages.length)) {
      setSelectedImageIndex(0)
      prevAllImagesLengthRef.current = allImages.length
    } else if (allImages.length === 0) {
      prevAllImagesLengthRef.current = 0
    }
  }, [allImages.length, selectedImageIndex])


  const displayPrice = (() => {
    if (selectedVariant) {
      return selectedVariant.price
    }
    if (variants.length > 0) {
      return variants[0]?.price ?? 0
    }
    return product?.price ?? 0
  })()

  const originalPrice = (() => {
    if (selectedVariant?.discountPrice && selectedVariant.discountPrice > selectedVariant.price) {
      return selectedVariant.discountPrice
    }
    if (variants.length > 0 && variants[0]?.discountPrice && variants[0].discountPrice > variants[0].price) {
      return variants[0].discountPrice
    }
    if (!variants.length && product?.originalPrice && product.originalPrice > product?.price) {
      return product.originalPrice
    }
    return undefined
  })()

  const discountPercentage = originalPrice && originalPrice > displayPrice
    ? Math.max(0, Math.round(((originalPrice - displayPrice) / originalPrice) * 100))
    : 0

  const formatCurrency = (value: number) =>
    value
      .toLocaleString("vi-VN", { style: "currency", currency: "VND" })
      .replace(/\u00a0/g, " ")

  const handleSizeSelect = (size: string) => {
    isSizeChangingRef.current = true

    const currentImageIndex = selectedImageIndex

    setSelectedSize(size)
    const availableColors = variants
      .filter(v => v.size === size)
      .map(v => v.color)
      .filter((color, index, self) => self.indexOf(color) === index)

    const nextColor = availableColors.length === 0
      ? (selectedColor || colorOptions[0] || "")
      : availableColors.includes(selectedColor)
        ? selectedColor
        : availableColors[0]

    if (nextColor !== selectedColor) {
      setSelectedColor(nextColor)
      setSelectedImageIndex(0)
      isSizeChangingRef.current = false
    } else {
      requestAnimationFrame(() => {
        setSelectedImageIndex(currentImageIndex)
        isSizeChangingRef.current = false
      })
    }
  }

  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    setSelectedImageIndex(0)
  }

  const handleImageClick = (index: number) => {
    if (index >= 0 && index < allImages.length) {
      setSelectedImageIndex(index)
    }
  }

  const handleImageNavigation = (direction: "prev" | "next") => {
    let newIndex: number
    if (direction === "prev") {
      newIndex = selectedImageIndex === 0 ? allImages.length - 1 : selectedImageIndex - 1
    } else {
      newIndex = selectedImageIndex === allImages.length - 1 ? 0 : selectedImageIndex + 1
    }

    setSelectedImageIndex(newIndex)
  }

  const handleAddToCart = () => {
    if (!product) return

    if (sizeOptions.length > 0 && !selectedSize) {
      toast({
        title: "Please select a size",
        description: "Choose a size before adding to cart.",
        variant: "destructive",
      })
      return
    }

    if (variants.length > 0 && !selectedVariant) {
      toast({
        title: "Please select a variant",
        description: "Choose size and color before adding to cart.",
        variant: "destructive",
      })
      return
    }

    const priceToUse = (() => {
      if (selectedVariant) {
        return selectedVariant.price
      }
      if (variants.length > 0) {
        return variants[0]?.price ?? product.price
      }
      return product.price
    })()

    addToCart({
      productId: product._id,
      name: product.name,
      brand: product.brand,
      price: priceToUse,
      image: allImages[0] || "",
      size: selectedVariant?.size ?? (selectedSize || "Free"),
      color: selectedVariant?.color ?? (selectedColor || "Default"),
      quantity,
      ...(selectedVariant ? { variantId: selectedVariant._id } : (variants.length > 0 ? { variantId: variants[0]._id } : {}))
    })

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    })
  }

  const handleToggleWishlist = async () => {
    if (!product || !isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your wishlist.",
        variant: "destructive",
      })
      return
    }

    setWishlistLoading(true)
    try {
      if (isLiked) {
        await removeFromWishlist(product._id)
        setIsLiked(false)
        toast({
          title: "Removed from wishlist",
          description: "Item has been removed from your wishlist.",
        })
        window.dispatchEvent(new CustomEvent('wishlistUpdated'))
      } else {
        await addToWishlist(product._id)
        setIsLiked(true)
        toast({
          title: "Added to wishlist",
          description: "Item has been added to your wishlist.",
        })
        window.dispatchEvent(new CustomEvent('wishlistUpdated'))
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update wishlist",
        variant: "destructive",
      })
    } finally {
      setWishlistLoading(false)
    }
  }

  const canAddToCart = variants.length === 0 || !!selectedVariant

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : (product?.rating || 0)

  const ratingBreakdown = [5, 4, 3, 2, 1].map(rating => ({
    stars: rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0
      ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100
      : 0
  }))

  const filteredReviews = reviewFilter
    ? reviews.filter(r => r.rating === reviewFilter)
    : reviews

  const handleSubmitReview = async () => {
    if (!product || !isAuthenticated || newReviewRating === 0 || !newReviewComment.trim()) {
      toast({
        title: "Please complete your review",
        description: "Rating and comment are required.",
        variant: "destructive",
      })
      return
    }

    setSubmittingReview(true)
    try {
      const response = await createReview(product._id, {
        rating: newReviewRating,
        comment: newReviewComment
      })
      const created = response.review || response
      setReviews(prev => [{
        ...created,
        userName: "You",
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        helpful: 0
      }, ...prev])
      setNewReviewRating(0)
      setNewReviewComment("")
      setShowWriteReview(false)
      toast({
        title: "Review submitted",
        description: "Thank you for your review!",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      })
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-600">Loading product...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-red-600">{error ?? "Product not found"}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <Container className="py-8">
        <div className="grid lg:grid-cols-[120px_1fr_500px] gap-8 items-start">
          <div className="hidden lg:flex flex-col gap-2">
            {allImages.map((img, index) => (
              <button
                key={`${img}-${index}`}
                onClick={() => handleImageClick(index)}
                className={cn(
                  "w-full aspect-square border-2 rounded transition-colors overflow-hidden",
                  selectedImageIndex === index
                    ? "border-black"
                    : "border-transparent hover:border-gray-300"
                )}
                title={`View ${index + 1}`}
              >
                <img
                  src={img}
                  alt={`View ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          <div className="relative">
            <div className="relative aspect-square bg-gray-100 flex items-center justify-center">
              {allImages.length > 0 && (
                <>
                  <img
                    src={allImages[selectedImageIndex]}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />

                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={() => handleImageNavigation("prev")}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-900" />
                      </button>
                      <button
                        onClick={() => handleImageNavigation("next")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center transition-colors"
                      >
                        <ChevronRight className="h-5 w-5 text-gray-900" />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              {product.categoryName && (
                <p className="text-sm text-gray-600 uppercase tracking-wide">{product.categoryName}</p>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-semibold text-gray-900">
                {formatCurrency(displayPrice)}
              </span>
              {originalPrice && originalPrice > displayPrice && (
                <span className="text-lg text-gray-500 line-through">
                  {formatCurrency(originalPrice)}
                </span>
              )}
              {discountPercentage > 0 && (
                <span className="text-sm font-semibold text-red-600">
                  {discountPercentage}% Off
                </span>
              )}
            </div>

            {colorOptions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Color</h3>
                  <span className="text-sm text-gray-600">{selectedColor || colorOptions[0]}</span>
                </div>
                <div className="flex gap-2">
                  {colorOptions.map((color) => {
                    const productColor = product?.colors?.find(c => {
                      const colorName = typeof c === 'string' ? c : c.name
                      return colorName === color
                    })
                    const colorHex = typeof productColor === 'object' ? productColor.hex : undefined

                    const colorImages = imagesByColor[color] || []
                    const colorImage = colorImages.length > 0
                      ? colorImages[0]
                      : (variants.find(v => v.color === color)?.images?.[0] || "")

                    return (
                      <button
                        key={color}
                        onClick={() => handleColorSelect(color)}
                        className={cn(
                          "w-16 h-16 rounded border-2 transition-all",
                          selectedColor === color
                            ? "border-black scale-105"
                            : "border-gray-300 hover:border-gray-500"
                        )}
                        title={color}
                      >
                        {colorImage ? (
                          <img
                            src={colorImage}
                            alt={color}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : colorHex ? (
                          <div
                            className="w-full h-full rounded"
                            style={{ backgroundColor: colorHex }}
                          />
                        ) : (
                          <div className="w-full h-full rounded bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                            {color}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {sizeOptions.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Select Size</h3>
                  <a
                    href="/size-guide"
                    className="text-sm text-gray-600 hover:text-gray-900 underline flex items-center gap-1"
                  >
                  </a>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {sizeOptions.map((size) => {    
                    let isOutOfStock = false
                    if (variants.length > 0) {
                      const sizeVariant = variants.find(v => v.size === size && v.color === selectedColor)
                      isOutOfStock = sizeVariant ? (sizeVariant.stock === 0 || sizeVariant.stock === undefined) : true
                    }
                    const isSelected = selectedSize === size
                    return (
                      <button
                        key={size}
                        onClick={() => !isOutOfStock && handleSizeSelect(size)}
                        disabled={isOutOfStock}
                        className={cn(
                          "py-3 px-4 border-2 rounded-md text-sm font-medium transition-all",
                          isSelected && !isOutOfStock
                            ? "border-gray-900 bg-gray-900 text-white"
                            : isOutOfStock
                              ? "border-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                              : "border-gray-300 hover:border-gray-900 text-gray-900"
                        )}
                      >
                        EU {size}
                      </button>
                    )
                  })}
                </div>
                {!selectedSize && sizeOptions.length > 0 && (
                  <p className="text-sm text-red-600 mt-2">Please select a size</p>
                )}
              </div>
            )}

            <div className="space-y-3 pt-4">
              <Button
                onClick={handleAddToCart}
                disabled={!canAddToCart}
                className="w-full bg-black text-white hover:bg-gray-900 h-14 text-base font-semibold rounded-none"
              >
                Add to Bag
              </Button>

              <Button
                variant="outline"
                onClick={handleToggleWishlist}
                disabled={wishlistLoading}
                className="w-full border-2 border-gray-300 hover:border-black h-14 text-base font-semibold rounded-none"
              >
                <Heart className={cn("mr-2 h-5 w-5", isLiked && "fill-current text-red-500")} />
                Favourite
              </Button>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed">
              {product.description}
            </p>

            <div className="space-y-2 text-sm">
              <p className="text-gray-600">
                <span className="font-semibold">Colour Shown:</span>{" "}
                {colorOptions.length > 0 ? (
                  <span className="inline-flex flex-wrap gap-1">
                    {colorOptions.map((color, index) => (
                      <span key={color}>
                        {color}
                        {index < colorOptions.length - 1 && ", "}
                      </span>
                    ))}
                  </span>
                ) : (
                  "N/A"
                )}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Style:</span> {product._id.slice(-8).toUpperCase()}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Country/Region of Origin:</span> Vietnam
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => setShowDeliveryInfo(!showDeliveryInfo)}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900"
              >
                Free Delivery and Returns
                {showDeliveryInfo ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {showDeliveryInfo && (
                <div className="mt-3 text-sm text-gray-600 space-y-2">
                  <p>• Free standard delivery on orders over 500,000₫</p>
                  <p>• Free returns within 30 days</p>
                  <p>• Estimated delivery: 2-3 business days</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <button
                onClick={() => setShowReviews(!showReviews)}
                className="w-full flex items-center justify-between text-base font-semibold text-gray-900 mb-4"
              >
                <span>Reviews ({reviews.length || product.reviewCount || 0})</span>
                {showReviews ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>

              {showReviews && (
                <div className="mt-4 space-y-6">
                  {reviews.length > 0 && (
                    <div className="grid grid-cols-2 gap-6 pb-6 border-b border-gray-200">
                      <div>
                        <div className="text-5xl font-bold text-gray-900 mb-2">
                          {avgRating.toFixed(1)}
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-5 w-5 ${star <= Math.round(avgRating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                                }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-gray-600">
                          Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {ratingBreakdown.map(({ stars, count, percentage }) => (
                          <button
                            key={stars}
                            onClick={() => setReviewFilter(reviewFilter === stars ? null : stars)}
                            className={cn(
                              "w-full flex items-center gap-2 text-sm hover:opacity-70 transition-opacity",
                              reviewFilter === stars && "opacity-50"
                            )}
                          >
                            <span className="w-8 text-gray-900 font-medium">{stars}</span>
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gray-900 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-8 text-right text-gray-600">{count}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Write Review Button */}
                  {isAuthenticated && (
                    <div>
                      {!showWriteReview ? (
                        <Button
                          variant="outline"
                          onClick={() => setShowWriteReview(true)}
                          className="w-full border-2 border-gray-300 hover:border-gray-900 h-12 text-base font-semibold rounded-none"
                        >
                          Write a Review
                        </Button>
                      ) : (
                        <div className="border border-gray-200 p-6 space-y-4">
                          <div>
                            <label className="text-sm font-semibold text-gray-900 mb-2 block">
                              Your Rating
                            </label>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setNewReviewRating(star)}
                                  className="p-1 hover:scale-110 transition-transform"
                                >
                                  <Star
                                    className={`h-6 w-6 ${star <= newReviewRating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300"
                                      }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-semibold text-gray-900 mb-2 block">
                              Your Review
                            </label>
                            <textarea
                              value={newReviewComment}
                              onChange={(e) => setNewReviewComment(e.target.value)}
                              placeholder="Share your thoughts about this product..."
                              rows={4}
                              className="w-full border border-gray-300 rounded-none p-3 text-sm focus:outline-none focus:border-gray-900 resize-none"
                            />
                          </div>

                          <div className="flex gap-3">
                            <Button
                              onClick={handleSubmitReview}
                              disabled={submittingReview || newReviewRating === 0 || !newReviewComment.trim()}
                              className="flex-1 bg-black text-white hover:bg-gray-900 h-12 text-base font-semibold rounded-none"
                            >
                              {submittingReview ? "Submitting..." : "Submit Review"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowWriteReview(false)
                                setNewReviewRating(0)
                                setNewReviewComment("")
                              }}
                              className="border-2 border-gray-300 hover:border-gray-900 h-12 text-base font-semibold rounded-none"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reviews List */}
                  <div className="space-y-6">
                    {filteredReviews.length > 0 ? (
                      filteredReviews.map((review) => (
                        <div key={review._id || review.id} className="border-b border-gray-200 pb-6 last:border-0">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-900">{review.userName}</p>
                              <p className="text-xs text-gray-600">{review.date}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${star <= review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                    }`}
                                />
                              ))}
                            </div>
                          </div>

                          {review.comment && (
                            <p className="text-sm text-gray-700 leading-relaxed mb-3">
                              {review.comment}
                            </p>
                          )}


                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-600">
                          {reviewFilter
                            ? `No ${reviewFilter}-star reviews yet.`
                            : "No reviews yet. Be the first to review this product!"
                          }
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      </Container>

      <Footer />
    </div>
  )
}

