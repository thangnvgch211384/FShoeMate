import { useState } from "react"
import { useCart } from "@/contexts/CartContext"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

interface ProductCardProps {
  id: string
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
  targetAudience?: string[]
  className?: string
}

export function ProductCard({
  id,
  slug,
  name,
  brand,
  price,
  originalPrice,
  image,
  hoverImage,
  rating,
  reviewCount,
  isNew = false,
  isOnSale = false,
  categoryName,
  targetAudience = [],
  className
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { addToCart } = useCart()

  const discountPercentage = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0

  return (
    <div
      className={cn(
        "group relative bg-white transition-all duration-200",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Just In Badge - Nike style */}
      {isNew && (
        <div className="absolute top-3 left-3 z-10">
          <span className="bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
            Just In
          </span>
        </div>
      )}

      {/* Target Audience Badge */}
      {targetAudience && targetAudience.length > 0 && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          {targetAudience.map((audience) => {
            const badgeColors: Record<string, string> = {
              male: "bg-blue-500",
              female: "bg-pink-500",
              kids: "bg-yellow-500",
              unisex: "bg-purple-500"
            }
            const labels: Record<string, string> = {
              male: "Men",
              female: "Women",
              kids: "Kids",
              unisex: "Unisex"
            }
            return (
              <span
                key={audience}
                className={`${badgeColors[audience] || "bg-gray-500"} text-white text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded`}
              >
                {labels[audience] || audience}
              </span>
            )
          })}
        </div>
      )}


      {/* Product Image - Nike style */}
      <Link to={`/products/${slug || id}`} className="block">
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          <img
            src={image}
            alt={name}
            className={cn(
              "w-full h-full object-contain transition-transform duration-300",
              isHovered && hoverImage ? "opacity-0 absolute inset-0" : "opacity-100"
            )}
          />
          {hoverImage && (
            <img
              src={hoverImage}
              alt={name}
              className={cn(
                "w-full h-full object-contain transition-opacity duration-300 absolute inset-0",
                isHovered ? "opacity-100" : "opacity-0"
              )}
            />
          )}
        </div>

        {/* Product Info - Nike style */}
        <div className="pt-3 pb-4">
          {/* Category */}
          {categoryName && (
            <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">
              {categoryName}
            </p>
          )}
          
          {/* Product Name */}
          <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 group-hover:underline">
            {name}
          </h3>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-gray-900">
              {price.toLocaleString('vi-VN')}₫
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-xs text-gray-500 line-through">
                {originalPrice.toLocaleString('vi-VN')}₫
              </span>
            )}
          </div>

          {/* Sale Badge */}
          {isOnSale && discountPercentage > 0 && (
            <div className="mt-1">
              <span className="text-xs font-semibold text-red-600">
                {discountPercentage}% Off
              </span>
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}