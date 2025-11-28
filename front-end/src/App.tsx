import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";
import Profile from "./pages/Profile";
import Checkout from "./pages/Checkout";
import Reviews from "./pages/Reviews";
import Men from "./pages/Men";
import Women from "./pages/Women";
import Kids from "./pages/Kids";
import Collections from "./pages/Collections";
import AdminDashboard from "@/pages/Admin/Dashboard"
import AdminProducts from "@/pages/Admin/Products"
import ProductForm from "@/pages/Admin/ProductForm"
import AdminProfile from "@/pages/Admin/AdminProfile"
import Wishlist from "./pages/Wishlist"
import OrderHistory from "./pages/OrderHistory"
import OrderDetail from "./pages/OrderDetail"
import TrackOrder from "./pages/TrackOrder"
import Search from "./pages/Search"
import { lazy, Suspense } from "react"
const AdminOrders = lazy(() => import("@/pages/Admin/Orders"))
const AdminCustomers = lazy(() => import("@/pages/Admin/Customers"))
const AdminVouchers = lazy(() => import("@/pages/Admin/Vouchers"))
const AdminInventory = lazy(() => import("@/pages/Admin/Inventory"))
const AdminProductVariants = lazy(() => import("@/pages/Admin/ProductVariants"))
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <CartProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/products/:id/reviews" element={<Reviews />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/orders" element={<OrderHistory />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/track-order" element={<TrackOrder />} />
              <Route path="/search" element={<Search />} />
              <Route path="/men" element={<Men />} />
              <Route path="/women" element={<Women />} />
              <Route path="/kids" element={<Kids />} />
              <Route path="/collections/:slug" element={<Collections />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/products/new" element={<ProductForm />} />
              <Route path="/admin/products/:id/edit" element={<ProductForm />} />
              <Route path="/admin/products/:productId/variants" element={<AdminProductVariants />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/customers" element={<AdminCustomers />} />
              <Route path="/admin/vouchers" element={<AdminVouchers />} />
              <Route path="/admin/inventory" element={<AdminInventory />} />
              <Route path="/admin/profile" element={<AdminProfile />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
