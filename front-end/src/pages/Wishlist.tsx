import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2, Share, Grid, List, X } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { getWishlist, removeFromWishlist as removeFromWishlistAPI, fetchProductDetail, fetchProductVariants } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";


interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  images?: string[];
  addedDate: string | Date;
  inStock: boolean;
  slug?: string;
  rating?: number;
  reviewCount?: number;
  categoryName?: string;
}

export default function Wishlist() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Load wishlist
    const loadWishlist = async () => {
      try {
        setLoading(true);
        const response = await getWishlist();
        const items = response.wishlist || response.items || [];
        setWishlistItems(items.map((item: any) => ({
          ...item,
          image: item.image || item.images?.[0] || "",
          addedDate: item.addedDate || new Date()
        })));
      } catch (error: any) {
        console.error("Failed to load wishlist:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load wishlist",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadWishlist();
  }, [isAuthenticated, authLoading, navigate, toast]);

  const removeFromWishlist = async (productId: string) => {
    try {
      await removeFromWishlistAPI(productId);
      setWishlistItems(items => items.filter(item => item.productId !== productId));
      toast({
        title: "Removed from wishlist",
        description: "Product has been removed from your wishlist.",
      });
      // Trigger wishlist count update in Navbar
      window.dispatchEvent(new CustomEvent('wishlistUpdated'));
    } catch (error: any) {
      console.error("Failed to remove from wishlist:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove product",
        variant: "destructive",
      });
    }
  };

  const handleAddToCart = async (item: WishlistItem) => {
    if (!item.inStock) {
      toast({
        title: "Out of stock",
        description: "This product is currently unavailable.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch product detail and variants
      const productDetail = await fetchProductDetail(item.productId);
      const product = productDetail.product;

      // Try to fetch variants
      let variants: any[] = [];
      let firstAvailableVariant: any = null;

      try {
        const variantRes = await fetchProductVariants(item.productId);
        variants = variantRes.variants || [];

        // Find first variant with stock > 0
        firstAvailableVariant = variants.find((v: any) => v.stock > 0) || variants[0];
      } catch (variantError) {
    }

      // If product has variants and we found one, add it directly
      if (firstAvailableVariant) {
        addToCart({
          productId: product._id,
          variantId: firstAvailableVariant._id,
          name: product.name,
          brand: product.brand || item.brand,
          price: firstAvailableVariant?.price || item.price,
          image: firstAvailableVariant.images?.[0] || (() => {
            if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
              const firstColor = product.colors[0]
              if (typeof firstColor === 'object' && firstColor.images && firstColor.images.length > 0) {
                return firstColor.images[0]
              }
            }
            return item.image
          })(),
          size: firstAvailableVariant.size || "Free",
          color: firstAvailableVariant.color || "Default",
          quantity: 1
        });

        toast({
          title: "Added to cart",
          description: `${product.name} has been added to your cart.`,
        });
        return;
      }

      // If product has sizes but no variants, check if we can add directly
      if (product.sizes && product.sizes.length > 0) {
        // Product requires size selection, navigate to detail page
        const productPath = item.slug || item.productId;
        navigate(`/products/${productPath}`);
        return;
      }

      // If no variants and no sizes required, add directly
      addToCart({
        productId: product._id,
        name: product.name,
        brand: product.brand || item.brand,
        price: item.price,
        image: (() => {
          if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
            const firstColor = product.colors[0]
            if (typeof firstColor === 'object' && firstColor.images && firstColor.images.length > 0) {
              return firstColor.images[0]
            }
          }
          return item.image
        })(),
        size: "Free",
        color: "Default",
        quantity: 1
      });

      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      });
    } catch (error: any) {
      console.error("Failed to add to cart:", error);
      // If error, navigate to product detail page as fallback
      const productPath = item.slug || item.productId;
      navigate(`/products/${productPath}`);
    }
  };

  const shareWishlist = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Copied wishlist link",
      description: "Wishlist link has been copied.",
    });
  };

  const WishlistItemCard = ({ item }: { item: WishlistItem }) => {
    const discountPercentage = item.originalPrice && item.originalPrice > item.price
      ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
      : 0

    return (
      <div className="group relative bg-white transition-all duration-200 flex flex-col">
        {/* Remove Button - Top Right */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-sm"
          onClick={(e) => {
            e.preventDefault()
            removeFromWishlist(item.productId)
          }}
        >
          <X className="h-4 w-4 text-gray-900" />
        </Button>

        {/* Product Image - Nike style */}
        <Link
          to={`/products/${item.slug || item.productId}`}
          className="block"
        >
          <div className="relative aspect-square bg-gray-50 overflow-hidden">
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No Image
              </div>
            )}
            {!item.inStock && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="bg-white text-black px-3 py-1 text-xs font-semibold uppercase">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Product Info - Nike style */}
          <div className="pt-3 pb-4 flex flex-col">
            {/* Category */}
            {item.categoryName && (
              <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">
                {item.categoryName}
              </p>
            )}

            {/* Product Name */}
            <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 group-hover:underline">
              {item.name}
            </h3>

            {/* Price Section - Fixed height to prevent layout shift */}
            <div className="min-h-[44px] flex flex-col justify-start">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {item.price.toLocaleString('vi-VN')}₫
                </span>
                {item.originalPrice && item.originalPrice > item.price && (
                  <span className="text-xs text-gray-500 line-through">
                    {item.originalPrice.toLocaleString('vi-VN')}₫
                  </span>
                )}
              </div>

              {/* Sale Badge - Always reserve space */}
              <div className="mt-1 h-5">
                {discountPercentage > 0 ? (
                  <span className="text-xs font-semibold text-red-600">
                    {discountPercentage}% Off
                  </span>
                ) : (
                  <span className="invisible text-xs">Placeholder</span>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Action Button */}
        <Button
          onClick={() => handleAddToCart(item)}
          disabled={!item.inStock}
          className="w-full bg-black text-white hover:bg-gray-900 h-10 text-sm font-semibold rounded-none mt-auto"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {item.inStock ? 'Add to Bag' : 'Out of Stock'}
        </Button>
      </div>
    )
  }

  const WishlistItemList = ({ item }: { item: WishlistItem }) => {
    const discountPercentage = item.originalPrice && item.originalPrice > item.price
      ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
      : 0

    return (
      <div className="group bg-white border-b border-gray-200 py-6">
        <div className="flex gap-6">
          {/* Product Image */}
          <Link
            to={`/products/${item.slug || item.productId}`}
            className="relative flex-shrink-0"
          >
            <div className="w-32 h-32 bg-gray-50 overflow-hidden">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No Image
                </div>
              )}
              {!item.inStock && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="bg-white text-black px-2 py-1 text-xs font-semibold uppercase">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>
          </Link>

          {/* Product Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                {item.categoryName && (
                  <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">
                    {item.categoryName}
                  </p>
                )}
                <Link
                  to={`/products/${item.slug || item.productId}`}
                  className="text-base font-medium text-gray-900 hover:underline"
                >
                  {item.name}
                </Link>
                <p className="text-sm text-gray-600">{item.brand}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeFromWishlist(item.productId)}
              >
                <X className="h-4 w-4 text-gray-600" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-gray-900">
                {item.price.toLocaleString('vi-VN')}₫
              </span>
              {item.originalPrice && item.originalPrice > item.price && (
                <>
                  <span className="text-sm text-gray-500 line-through">
                    {item.originalPrice.toLocaleString('vi-VN')}₫
                  </span>
                  {discountPercentage > 0 && (
                    <span className="text-xs font-semibold text-red-600">
                      {discountPercentage}% Off
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Button
                onClick={() => handleAddToCart(item)}
                disabled={!item.inStock}
                className="bg-black text-white hover:bg-gray-900 h-10 px-6 text-sm font-semibold rounded-none"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {item.inStock ? 'Add to Bag' : 'Out of Stock'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <Container className="py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Wishlist</h1>
              <p className="text-muted-foreground">
                {wishlistItems.length} {wishlistItems.length === 1 ? 'product' : 'products'} in your wishlist
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={shareWishlist}>
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>

              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Wishlist Items */}
          {authLoading || loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
              <p className="text-muted-foreground">
                {authLoading ? "Checking authentication..." : "Loading wishlist..."}
              </p>
            </div>
          ) : wishlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Heart className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
              <p className="text-muted-foreground mb-6">
                You don't have any products in your wishlist yet
              </p>
              <Button
                onClick={() => navigate('/products')}
                className="bg-black text-white hover:bg-gray-900"
              >
                Explore Products
              </Button>
            </div>
          ) : (
            <div className={
              viewMode === 'grid'
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-0"
            }>
              {wishlistItems.map((item) =>
                viewMode === 'grid'
                  ? <WishlistItemCard key={item.productId} item={item} />
                  : <WishlistItemList key={item.productId} item={item} />
              )}
            </div>
          )}

        </div>
      </Container>

      <Footer />
    </div>
  );
}