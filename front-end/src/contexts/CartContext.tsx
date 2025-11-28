import { createContext, useContext, useEffect, useReducer, ReactNode, useState } from "react"
import { toast } from "@/hooks/use-toast"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api"
const AUTH_TOKEN_KEY = "fshoemate_token"
const LOCAL_CART_KEY = "fshoemate_local_cart"

type CartMode = "local" | "server"

export interface CartItem {
  lineId: string
  productId?: string
  variantId?: string
  name: string
  brand?: string
  price: number
  image?: string
  size?: string
  color?: string
  quantity: number
  source: CartMode
}

interface CartState {
  items: CartItem[]
  total: number
  itemCount: number
}

interface AddToCartInput {
  productId: string
  name: string
  brand?: string
  price: number
  image?: string
  size?: string
  color?: string
  variantId?: string
  quantity?: number
}

type CartAction = { type: "SET_ITEMS"; payload: CartItem[] }

const CartContext = createContext<{
  state: CartState
  mode: CartMode
  loading: boolean
  addToCart: (item: AddToCartInput) => Promise<void> | void
  removeFromCart: (lineId: string) => Promise<void> | void
  updateQuantity: (lineId: string, quantity: number) => Promise<void> | void
  clearCart: () => Promise<void> | void
  refreshCart: () => Promise<void> | void
} | null>(null)

const createStateFromItems = (items: CartItem[]): CartState => {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  return { items, total, itemCount }
}

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case "SET_ITEMS":
      return createStateFromItems(action.payload)
    default:
      return state
  }
}

const getAuthToken = () => {
  if (typeof window === "undefined") return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

const getStoredLocalItems = (): CartItem[] => {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY)
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : []
    return parsed.map(item => ({ ...item, source: "local" as CartMode }))
  } catch {
    return []
  }
}

const persistLocalItems = (items: CartItem[]) => {
  if (typeof window === "undefined") return
  const payload = items
    .filter(item => item.source === "local")
    .map(({ source, ...rest }) => rest)
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(payload))
}

const mapServerCartItems = (cart: any): CartItem[] => {
  if (!cart?.items) return []
  return cart.items
    .filter((item: any) => {
      const variant = item.variantId
      // Filter out items with no variant or out of stock
      if (!variant || !variant._id) return false
      if (variant.stock <= 0) return false
      return true
    })
    .map((item: any) => {
      const variant = item.variantId
      const product = variant?.productId
      const price = variant?.price ?? 0  
      const image = (() => {
        if (variant?.images?.[0]) return variant.images[0]
        if (product?.colors && Array.isArray(product.colors) && product.colors.length > 0) {
          const firstColor = product.colors[0]
          if (typeof firstColor === 'object' && firstColor.images && firstColor.images.length > 0) {
            return firstColor.images[0]
          }
        }
        return "/api/placeholder/80/80"
      })()

      return {
        lineId: item._id?.toString() ?? `${variant?._id}-${variant?.size}-${variant?.color}`,
        productId: product?._id?.toString(),
        variantId: variant?._id?.toString(),
        name: product?.name ?? "Sản phẩm",
        brand: product?.brand ?? "",
        price,
        image,
        size: variant?.size,
        color: variant?.color,
        quantity: item.quantity,
        source: "server" as CartMode
      }
    })
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const token = getAuthToken()
  if (!token) return null

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    },
    body: options.body
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || "Cart API error")
  }

  return response.json()
}

const createLocalLineId = (item: AddToCartInput) => {
  return [item.productId, item.size ?? "na", item.color ?? "na"].join("_")
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, createStateFromItems(getStoredLocalItems()))
  const [mode, setMode] = useState<CartMode>("local")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAuthToken()
    if (token) {
      setMode("server")
      refreshCart()
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mode === "local") {
      persistLocalItems(state.items)
    }
  }, [state.items, mode])

  const refreshCart = async () => {
    const token = getAuthToken()
    if (!token) {
      setMode("local")
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await apiRequest("/cart")
      if (data?.cart) {
        dispatch({ type: "SET_ITEMS", payload: mapServerCartItems(data.cart) })
      }
      setMode("server")
    } catch (error) {
      console.error("Failed to load cart", error)
      setMode("local")
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async (item: AddToCartInput) => {
    const quantity = item.quantity ?? 1
    const token = getAuthToken()

    if (token && item.variantId) {
      try {
        setLoading(true)
        const data = await apiRequest("/cart/items", {
          method: "POST",
          body: JSON.stringify({ variantId: item.variantId, quantity })
        })
        if (data?.cart) {
          dispatch({ type: "SET_ITEMS", payload: mapServerCartItems(data.cart) })
          setMode("server")
          toast({
            title: "Added to cart",
            description: `${item.name} has been added to your cart`
          })
          return
        }
      } catch (error) {
        console.error("Server cart add failed", error)
        toast({
          title: "Cannot sync with server",
          description: "Cart will be saved locally temporarily.",
        })
        setMode("local")
      } finally {
        setLoading(false)
      }
    }

    const lineId = createLocalLineId(item)
    const existing = state.items.find((cartItem) => cartItem.lineId === lineId && cartItem.source === "local")
    let newItems: CartItem[]
    if (existing) {
      newItems = state.items.map((cartItem) =>
        cartItem.lineId === lineId && cartItem.source === "local"
          ? { ...cartItem, quantity: cartItem.quantity + quantity }
          : cartItem
      )
    } else {
      newItems = [
        ...state.items,
        {
          lineId,
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          brand: item.brand,
          price: item.price,
          image: item.image,
          size: item.size,
          color: item.color,
          quantity,
          source: "local"
        }
      ]
    }
    dispatch({ type: "SET_ITEMS", payload: newItems })
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart.`,
    })
  }

  const updateQuantity = async (lineId: string, quantity: number) => {
    if (quantity < 0) return
    const token = getAuthToken()

    if (mode === "server" && token) {
      try {
        setLoading(true)
        const data = await apiRequest(`/cart/items/${lineId}`, {
          method: "PUT",
          body: JSON.stringify({ quantity })
        })
        if (data?.cart) {
          dispatch({ type: "SET_ITEMS", payload: mapServerCartItems(data.cart) })
          return
        }
      } catch (error) {
        console.error("Server cart update failed", error)
        setMode("local")
      } finally {
        setLoading(false)
      }
    }

    const newItems = state.items
      .map((item) => item.lineId === lineId ? { ...item, quantity } : item)
      .filter((item) => item.quantity > 0)
    dispatch({ type: "SET_ITEMS", payload: newItems })
  }

  const removeFromCart = async (lineId: string) => {
    const token = getAuthToken()

    if (mode === "server" && token) {
      try {
        setLoading(true)
        const data = await apiRequest(`/cart/items/${lineId}`, {
          method: "DELETE"
        })
        if (data?.cart) {
          dispatch({ type: "SET_ITEMS", payload: mapServerCartItems(data.cart) })
          return
        }
      } catch (error) {
        console.error("Server cart remove failed", error)
        setMode("local")
      } finally {
        setLoading(false)
      }
    }

    const newItems = state.items.filter((item) => item.lineId !== lineId)
    dispatch({ type: "SET_ITEMS", payload: newItems })
  }

  const clearCart = async () => {
    const token = getAuthToken()

    if (mode === "server" && token) {
      try {
        setLoading(true)
        const data = await apiRequest("/cart", { method: "DELETE" })
        if (data?.cart) {
          dispatch({ type: "SET_ITEMS", payload: mapServerCartItems(data.cart) })
          return
        }
      } catch (error) {
        console.error("Server cart clear failed", error)
        setMode("local")
      } finally {
        setLoading(false)
      }
    }

    dispatch({ type: "SET_ITEMS", payload: [] })
    persistLocalItems([])
  }

  return (
    <CartContext.Provider value={{
      state,
      mode,
      loading,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      refreshCart
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}