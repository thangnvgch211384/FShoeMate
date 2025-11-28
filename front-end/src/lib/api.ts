import { getToken, removeToken } from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

interface ApiOptions extends RequestInit {
  auth?: boolean;
  json?: boolean;
}

async function apiRequest<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined)
  };

  // Always try to add token if available (for optional auth endpoints)
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (options.auth === true) {
    // Only throw error if auth is explicitly required (true) and no token
    throw new Error("AUTH_REQUIRED");
  }

  const res = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    ...options,
    headers
  });

  if (res.status === 401) {
    removeToken();
    // Tự động redirect về login khi token hết hạn
    // Chỉ redirect nếu đang ở trang admin hoặc trang cần auth
    const currentPath = window.location.pathname;
    if (currentPath.startsWith("/admin") || options.auth) {
      // Lưu redirect URL để quay lại sau khi login
      const redirectUrl = currentPath + window.location.search;
      window.location.href = "/login?redirect=" + encodeURIComponent(redirectUrl);
    }
    throw new Error("UNAUTHORIZED");
  }

  if (!res.ok) {
    let errorMessage = "REQUEST_FAILED";
    try {
      const text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          errorMessage = json.message || json.error || text;
        } catch {
          errorMessage = text;
        }
      }
    } catch {
      errorMessage = `Request failed with status ${res.status}`;
    }
    throw new Error(errorMessage);
  }

  if (options.json === false) {
    // Caller muốn raw response
    return res as unknown as T;
  }

  return res.json();
}

export async function fetchProductDetail(idOrSlug: string) {
  return apiRequest(`/products/${idOrSlug}`);
}

export async function fetchProductVariants(productId: string) {
  return apiRequest(`/products/${productId}/variants`);
}

export async function fetchAllVariants(params?: { search?: string; status?: string; minStock?: number; maxStock?: number }) {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.minStock !== undefined) queryParams.append("minStock", params.minStock.toString());
  if (params?.maxStock !== undefined) queryParams.append("maxStock", params.maxStock.toString());
  
  const query = queryParams.toString();
  return apiRequest(`/variants/all${query ? `?${query}` : ""}`, {
    method: "GET",
    auth: true
  });
}

export async function createVariant(productId: string, variantData: any) {
  return apiRequest(`/products/${productId}/variants`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(variantData)
  });
}

export async function updateVariant(variantId: string, variantData: any) {
  return apiRequest(`/variants/${variantId}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(variantData)
  });
}

export async function deleteVariant(variantId: string) {
  return apiRequest(`/variants/${variantId}`, {
    method: "DELETE",
    auth: true
  });
}

export async function adjustVariantStock(variantId: string, stockData: {
  type: "import" | "export";
  quantity: number;
  reason?: string;
  supplier?: string;
}) {
  return apiRequest(`/variants/${variantId}/stock`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(stockData)
  });
}

export async function getVariantDetail(variantId: string) {
  return apiRequest(`/variants/${variantId}`, {
    method: "GET",
    auth: true
  });
}

export async function register(name: string, email: string, password: string, phone?: string) {
  return apiRequest<{ token: string; user: any }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, phone: phone || undefined })
  });
}

export async function login(email: string, password: string) {
  return apiRequest<{ token: string; user: any }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function forgotPassword(email: string) {
  return apiRequest<{ success: boolean; message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export async function resetPassword(token: string, password: string) {
  return apiRequest<{ success: boolean; message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password })
  });
}

export async function getProfile() {
  return apiRequest("/users/me", { auth: true });
}

export async function updateProfile(body: any) {
  return apiRequest("/users/me", { method: "PUT", body: JSON.stringify(body), auth: true });
}

export async function getCart() {
  return apiRequest("/cart", { auth: true });
}

export async function addCartItem(payload: { variantId: string; quantity: number }) {
  return apiRequest("/cart/items", { method: "POST", body: JSON.stringify(payload), auth: true });
}

export async function updateCartItem(itemId: string, quantity: number) {
  return apiRequest(`/cart/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
    auth: true
  });
}

export async function removeCartItem(itemId: string) {
  return apiRequest(`/cart/items/${itemId}`, { method: "DELETE", auth: true });
}

export async function clearCart() {
  return apiRequest("/cart", { method: "DELETE", auth: true });
}

export async function validatePromotion(code: string, orderTotal: number, items: any[] = []) {
  return apiRequest("/promotions/validate", {
    method: "POST",
    auth: false, // Allow both guest and authenticated users
    body: JSON.stringify({ code, orderTotal, items })
  });
}

export async function createOrder(payload: any) {
  return apiRequest("/orders", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload)
  });
}

export async function createGuestOrder(payload: any) {
  return apiRequest("/orders/guest", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getOrders() {
  return apiRequest("/orders", { auth: true });
}

export async function getOrderDetail(id: string) {
  return apiRequest(`/orders/${id}`, { auth: true });
}

export async function getGuestOrderDetail(id: string) {
  return apiRequest(`/orders/guest/${id}`);
}

export async function findGuestOrder(email: string, orderId: string) {
  return apiRequest(`/orders/guest/find?email=${encodeURIComponent(email)}&orderId=${encodeURIComponent(orderId)}`);
}

export async function cancelOrder(id: string) {
  return apiRequest(`/orders/${id}/cancel`, {
    method: "PUT",
    auth: true
  });
}

export async function cancelGuestOrder(id: string) {
  return apiRequest(`/orders/guest/${id}/cancel`, {
    method: "PUT"
  });
}

// Admin Order APIs
export async function getAdminOrders() {
  return apiRequest("/orders/admin/all", { auth: true });
}

export async function updateOrderStatus(orderId: string, status: string) {
  return apiRequest(`/orders/${orderId}/status`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify({ status })
  });
}

export async function updateOrderPaymentStatus(orderId: string, paymentStatus: string) {
  return apiRequest(`/orders/${orderId}/payment-status`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify({ paymentStatus })
  });
}

export async function getAdminOrderDetail(id: string) {
  return apiRequest(`/orders/admin/${id}`, { auth: true });
}

// Admin Product APIs
export async function createProduct(productData: any) {
  return apiRequest("/products", {
    method: "POST",
    auth: true,
    body: JSON.stringify(productData)
  });
}

export async function updateProduct(productId: string, productData: any) {
  return apiRequest(`/products/${productId}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(productData)
  });
}

export async function deleteProduct(productId: string) {
  return apiRequest(`/products/${productId}`, {
    method: "DELETE",
    auth: true
  });
}

export async function fetchReviews(productId: string, params?: { page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());

  return apiRequest(`/products/${productId}/reviews${query.size ? `?${query}` : ""}`);
}
export async function fetchProducts(params?: Record<string, string | number>) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.append(key, String(value));
        }
      });
    }
    return apiRequest(`/products${query.toString() ? `?${query.toString()}` : ""}`);
  }
  
  export async function fetchCategories() {
    return apiRequest("/categories");
  }

export async function createReview(productId: string, payload: { rating: number; comment?: string }) {
  return apiRequest(`/products/${productId}/reviews`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload)
  });
}

export async function getLoyaltySummary() {
  return apiRequest("/loyalty/me", { auth: true });
}

// Wishlist APIs
export async function getWishlist() {
  return apiRequest("/wishlist", { auth: true });
}

export async function addToWishlist(productId: string) {
  return apiRequest("/wishlist", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ productId })
  });
}

export async function removeFromWishlist(productId: string) {
  return apiRequest(`/wishlist/${productId}`, {
    method: "DELETE",
    auth: true
  });
}

export async function clearWishlist() {
  return apiRequest("/wishlist", {
    method: "DELETE",
    auth: true
  });
}

export async function checkWishlist(productId: string) {
  return apiRequest(`/wishlist/check/${productId}`, { auth: true });
}


// Customers API
export async function fetchCustomers(params?: { search?: string; status?: string; membershipLevel?: string; page?: number; limit?: number }) {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.membershipLevel) queryParams.append("membershipLevel", params.membershipLevel);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  
  return apiRequest(`/users/customers?${queryParams.toString()}`, {
    method: "GET",
    auth: true
  });
}

export async function getCustomerDetail(customerId: string) {
  return apiRequest(`/users/customers/${customerId}`, {
    method: "GET",
    auth: true
  });
}

export async function updateCustomerStatus(customerId: string, isActive: boolean) {
  return apiRequest(`/users/customers/${customerId}/status`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify({ isActive })
  });
}

export async function getCustomerOrders(customerId: string) {
  return apiRequest(`/users/customers/${customerId}/orders`, {
    method: "GET",
    auth: true
  });
}

export async function fetchVouchers(params?: { isActive?: boolean; membershipLevel?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.isActive !== undefined) queryParams.append("isActive", params.isActive.toString());
  if (params?.membershipLevel) queryParams.append("membershipLevel", params.membershipLevel);
  
  return apiRequest(`/promotions?${queryParams.toString()}`, {
    method: "GET",
    auth: true
  });
}

export async function createVoucher(voucherData: any) {
  return apiRequest("/promotions", {
    method: "POST",
    auth: true,
    body: JSON.stringify(voucherData)
  });
}

export async function updateVoucher(voucherId: string, voucherData: any) {
  return apiRequest(`/promotions/${voucherId}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(voucherData)
  });
}

export async function deleteVoucher(voucherId: string) {
  return apiRequest(`/promotions/${voucherId}`, {
    method: "DELETE",
    auth: true
  });
}

export async function getVoucherUsageHistory(voucherId: string) {
  return apiRequest(`/promotions/${voucherId}/usage`, {
    method: "GET",
    auth: true
  });
}

export async function getAnalytics() {
  return apiRequest("/orders/admin/analytics", {
    method: "GET",
    auth: true
  });
}

export { apiRequest };