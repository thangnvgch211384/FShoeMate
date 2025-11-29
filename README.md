# TÀI LIỆU KỸ THUẬT: HỆ THỐNG FSHOEMATE

## 1. CÁC CÔNG CỤ PHÁT TRIỂN

### Back-end
- **Runtime**: Node.js
- **Framework**: Express.js 4.21.2
- **Database**: MongoDB (Mongoose 8.20.1)
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Password Hashing**: bcryptjs 3.0.3
- **Validation**: express-validator 7.3.1
- **Email**: nodemailer 7.0.11
- **Payment**: @payos/node 2.0.3
- **Environment**: dotenv 16.6.1
- **CORS**: cors 2.8.5
- **Dev Tools**: nodemon 3.1.11

### Front-end
- **Framework**: React 18.3.1 + TypeScript 5.8.3
- **Build Tool**: Vite 5.4.20
- **Routing**: react-router-dom 6.30.1
- **State Management**: React Context API + @tanstack/react-query 5.83.0
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Forms**: react-hook-form 7.61.1 + zod 3.25.76
- **Icons**: lucide-react 0.462.0
- **Notifications**: sonner 1.7.4

---

## 2. CẤU TRÚC MÃ & CẤU TRÚC LỚP

### 2.1. Kiến trúc Back-end (Layered Architecture)

```
back-end/
├── src/
│   ├── server.js              # Entry point, route registration
│   ├── config/
│   │   └── database.js        # MongoDB connection
│   ├── middlewares/
│   │   ├── auth.middleware.js # JWT authentication
│   │   └── error.middleware.js # Global error handler
│   ├── modules/              # Feature modules (Domain-driven)
│   │   ├── auth/
│   │   │   ├── auth.model.js  # (No model, uses User)
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.routes.js
│   │   ├── user/
│   │   │   ├── user.model.js
│   │   │   ├── user.controller.js
│   │   │   ├── user.service.js
│   │   │   └── user.routes.js
│   │   └── [other modules...]
│   └── utils/
│       ├── token.js           # JWT generation
│       ├── email.service.js   # Email sending
│       └── payos.service.js  # Payment integration
```

#### Pattern: Controller → Service → Model

```javascript
// Controller Layer (HTTP handling)
async function handleCreate(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    
    const product = await createProduct(req.body); // Service call
    res.status(201).json({ success: true, product });
  } catch (error) {
    next(error); // Error middleware
  }
}

// Service Layer (Business logic)
async function createProduct(data) {
  // Business logic: validate, transform, create variants
  const product = await Product.create(data);
  await createVariantsForProduct(product, defaultStock);
  return product;
}

// Model Layer (Data access)
const productSchema = new mongoose.Schema({...});
module.exports = mongoose.model("Product", productSchema);
```

### 2.2. Kiến trúc Front-end (Component-based)

```
front-end/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Route configuration
│   ├── pages/                # Page components
│   ├── components/
│   │   ├── layout/           # Layout components
│   │   ├── ui/              # shadcn/ui primitives
│   │   ├── product/         # Product-specific
│   │   └── sections/        # Page sections
│   ├── contexts/            # React Context providers
│   │   ├── AuthContext.tsx
│   │   └── CartContext.tsx
│   ├── hooks/               # Custom hooks
│   ├── lib/
│   │   ├── api.ts           # API client
│   │   ├── auth.ts          # Auth utilities
│   │   └── utils.ts         # Helpers
│   └── assets/              # Static assets
```

#### Pattern: Page → Component → API

```typescript
// Page Component
function Products() {
  const { data } = useQuery(['products'], () => fetchProducts());
  return <ProductList products={data?.items} />;
}

// Component
function ProductList({ products }) {
  return products.map(p => <ProductCard key={p.id} product={p} />);
}

// API Client
export async function fetchProducts(params) {
  return apiRequest(`/products?${queryParams}`, { auth: false });
}
```

---

## 3. CÁC LỚP/THUẬT TOÁN QUAN TRỌNG

### 3.1. Authentication & Authorization

#### JWT Token Generation
```javascript
// utils/token.js
function generateAccessToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}
```

#### Middleware Chain
```javascript
// middlewares/auth.middleware.js
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  req.user = payload; // Attach user to request
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}
```

### 3.2. Product Variant Generation Algorithm

```javascript
// product.service.js - createVariantsForProduct()
async function createVariantsForProduct(product, defaultStock = 0) {
  const variantsToCreate = [];
  
  // Cartesian product: sizes × colors
  for (const size of product.sizes) {
    for (const colorObj of product.colors) {
      const colorName = typeof colorObj === 'string' ? colorObj : colorObj.name;
      
      // Skip invalid colors
      if (!colorName || colorName.trim() === '') continue;
      
      // Check for duplicates
      const existing = await Variant.findOne({
        productId: product._id,
        size: size,
        color: colorName.trim()
      });
      if (existing) continue;
      
      // Create variant with price logic
      let variantPrice = product.price;
      let variantDiscountPrice = undefined;
      
      if (product.originalPrice > product.price) {
        variantPrice = product.price;
        variantDiscountPrice = product.originalPrice;
      }
      
      variantsToCreate.push({
        productId: product._id,
        size: size,
        color: colorName.trim(),
        price: variantPrice,
        stock: defaultStock,
        images: colorObj.images || []
      });
    }
  }
  
  if (variantsToCreate.length > 0) {
    await Variant.insertMany(variantsToCreate);
  }
}
```

### 3.3. Promotion Validation Algorithm

```javascript
// promotion.service.js - validatePromotion()
async function validatePromotion({ code, userId, orderTotal, items = [] }) {
  const promotion = await getPromotionByCode(code);
  
  // 1. Existence check
  if (!promotion) return { success: false, message: "Code not found" };
  
  // 2. Active status
  if (!promotion.isActive) return { success: false, message: "Promotion is not active" };
  
  // 3. Date validation
  if (promotion.startDate && promotion.startDate > new Date()) 
    return { success: false, message: "Promotion is not started yet" };
  if (promotion.endDate && promotion.endDate < new Date()) 
    return { success: false, message: "Promotion has expired" };
  
  // 4. Usage limit
  if (promotion.maxUses > 0 && promotion.usedCount >= promotion.maxUses) 
    return { success: false, message: "Promotion has reached the maximum usage limit" };
  
  // 5. Minimum order value
  if (orderTotal < promotion.minOrderValue) 
    return { success: false, message: `Minimum order value is ${promotion.minOrderValue}đ` };
  
  // 6. Applicable products check
  if (promotion.applicableProducts?.length > 0) {
    const productIds = await extractProductIdsFromItems(items);
    const hasApplicableProduct = productIds.some(id => 
      promotion.applicableProducts.includes(id)
    );
    if (!hasApplicableProduct) 
      return { success: false, message: "Promotion not applicable to cart items" };
  }
  
  // 7. Membership level check
  if (promotion.membershipLevel && userId) {
    const user = await User.findById(userId);
    if (user.membershipLevel !== promotion.membershipLevel) 
      return { success: false, message: "Promotion requires different membership level" };
  }
  
  // 8. Calculate discount
  let discountAmount = 0;
  if (promotion.discountType === "percentage") {
    discountAmount = orderTotal * (promotion.discountValue / 100);
    if (promotion.maxDiscount && discountAmount > promotion.maxDiscount) {
      discountAmount = promotion.maxDiscount;
    }
  } else if (promotion.discountType === "fixed") {
    discountAmount = promotion.discountValue;
  }
  
  return { success: true, data: { discountAmount, ... } };
}
```

### 3.4. Loyalty Points Calculation

```javascript
// loyalty.service.js
function calculateMembershipLevel(points) {
  if (points >= 5000) return "diamond";
  if (points >= 2500) return "gold";
  if (points >= 1000) return "silver";
  return null;
}

async function earnPoints({ userId, orderId, revenue, multiplier = 0.01 }) {
  const pointsEarned = Math.floor(revenue * multiplier);
  
  // Create transaction record
  const transaction = await LoyaltyTransaction.create({
    userId, orderId, pointsEarned, revenue
  });
  
  // Update user points and membership
  const user = await User.findById(userId);
  user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsEarned;
  user.membershipLevel = calculateMembershipLevel(user.loyaltyPoints);
  await user.save();
  
  return transaction;
}
```

### 3.5. Cart Synchronization (Local ↔ Server)

```typescript
// CartContext.tsx
export function CartProvider({ children }) {
  const [mode, setMode] = useState<CartMode>("local");
  
  // Auto-detect mode on mount
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setMode("server");
      refreshCart(); // Load from server
    } else {
      setMode("local");
      // Load from localStorage
      dispatch({ type: "SET_ITEMS", payload: getStoredLocalItems() });
    }
  }, []);
  
  const addToCart = async (item: AddToCartInput) => {
    const token = getAuthToken();
    
    // Try server first if authenticated
    if (token && item.variantId) {
      try {
        await apiRequest("/cart/items", {
          method: "POST",
          body: JSON.stringify({ variantId: item.variantId, quantity })
        });
        setMode("server");
        return;
      } catch (error) {
        // Fallback to local on error
        setMode("local");
      }
    }
    
    // Local storage fallback
    const lineId = createLocalLineId(item);
    const existing = state.items.find(item => item.lineId === lineId);
    // ... update local state
  };
}
```

### 3.6. Order Creation Flow

```javascript
// order.service.js - createOrderFromCart()
async function createOrderFromCart(userId, payload) {
  // 1. Validate cart
  const cart = await Cart.findOne({ userId });
  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty");
  }
  
  // 2. Build order items from cart
  const items = await buildItemsFromCart(cart);
  
  // 3. Calculate totals
  const totals = calcTotals(items, payload.totals);
  
  // 4. Create order
  const order = await Order.create({
    userId, items, totals, paymentMethod: payload.paymentMethod
  });
  
  // 5. Decrement stock
  await Promise.all(
    items.map(item => 
      Variant.findByIdAndUpdate(item.variantId, { $inc: { stock: -item.quantity } })
    )
  );
  
  // 6. Clear cart
  cart.items = [];
  await cart.save();
  
  // 7. Create payment link (if PayOS)
  if (payload.paymentMethod === "payos") {
    const paymentLink = await createPaymentLink({ orderId: order._id, amount: totals.total });
    order.metadata.payosPaymentLink = paymentLink.checkoutUrl;
    await order.save();
  }
  
  // 8. Award loyalty points (if COD)
  if (userId && payload.paymentMethod === "cod") {
    await Loyalty.earnPoints({ userId, orderId: order._id, revenue: totals.subtotal });
  }
  
  // 9. Send email
  await sendOrderConfirmationEmail(order, email, name);
  
  return order;
}
```

---

## 4. API/THƯ VIỆN QUAN TRỌNG (CÁCH THỨC)

### 4.1. Express.js Routing

```javascript
// server.js - Centralized route registration
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
// ... other routes

// Module route definition
// product.routes.js
const router = express.Router();
router.get("/", handleList);                    // Public
router.get("/:id", handleGetDetail);            // Public
router.post("/", requireAuth, requireAdmin, handleCreate);  // Protected
router.put("/:id", requireAuth, requireAdmin, handleUpdate);
router.delete("/:id", requireAuth, requireAdmin, handleDelete);
```

### 4.2. Mongoose Models & Relationships

```javascript
// Product Model
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  categoryId: { type: String, required: true },
  // ...
});

// Variant Model (References Product)
const variantSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  size: { type: String, required: true },
  color: { type: String, required: true },
  stock: { type: Number, default: 0 }
});
variantSchema.index({ productId: 1, size: 1, color: 1 }, { unique: true });

// Populate relationships
const cart = await Cart.findOne({ userId }).populate({
  path: "items.variantId",
  populate: { path: "productId", select: "name brand images" }
});
```

### 4.3. Express Validator

```javascript
// auth.routes.js
const { body } = require("express-validator");

const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

router.post("/register", registerValidation, handleRegister);

// In controller
const errors = validationResult(req);
if (!errors.isEmpty()) {
  return res.status(422).json({ errors: errors.array() });
}
```

### 4.4. PayOS Integration

```javascript
// payos.service.js
const { PayOS } = require("@payos/node");

function getPayOSClient() {
  return new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY
  });
}

async function createPaymentLink(orderData) {
  const timestamp = Date.now();
  const orderCode = parseInt(timestamp.toString().slice(-10), 10);
  
  const paymentData = {
    orderCode: orderCode,
    amount: Math.round(orderData.amount),
    description: orderData.description,
    items: orderData.items,
    returnUrl: orderData.returnUrl,
    cancelUrl: orderData.cancelUrl,
    buyerName: orderData.customerInfo?.name,
    buyerEmail: orderData.customerInfo?.email,
  };
  
  const payOS = getPayOSClient();
  const paymentLinkData = await payOS.paymentRequests.create(paymentData);
  return paymentLinkData;
}

// Webhook handler
async function handlePayOSWebhook(webhookData) {
  const { code, desc, data } = webhookData;
  const order = await Order.findOne({ "metadata.payosOrderCode": data.orderCode });
  
  if (code === "00" && desc === "success") {
    order.paymentStatus = "paid";
    order.status = "processing";
    // Award loyalty points
    await Loyalty.earnPoints({ userId: order.userId, ... });
    // Send confirmation email
    await sendOrderConfirmationEmail(order, email, name);
  }
  
  await order.save();
}
```

### 4.5. Nodemailer Email Service

```javascript
// email.service.js
const nodemailer = require("nodemailer");

function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

async function sendOrderConfirmationEmail(order, userEmail, userName) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: `Order Confirmation #${orderNumber} - ShoeFam`,
    html: `<!-- HTML email template -->`
  };
  
  const transporter = getTransporter();
  await transporter.sendMail(mailOptions);
}
```

### 4.6. React Query (Data Fetching)

```typescript
// lib/api.ts
export async function fetchProducts(params?: Record<string, string | number>) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });
  return apiRequest(`/products${query.toString() ? `?${query.toString()}` : ""}`);
}

// In component
const { data, isLoading } = useQuery(
  ['products', filters],
  () => fetchProducts(filters),
  { staleTime: 5 * 60 * 1000 } // Cache 5 minutes
);
```

---

## 5. MỐI QUAN HỆ/KẾT NỐI GIỮA CÁC THÀNH PHẦN

### 5.1. Database Relationships

```
User (1) ──< (N) Order
User (1) ──< (1) Cart
User (1) ──< (N) Wishlist
User (1) ──< (N) Review
User (1) ──< (N) LoyaltyTransaction

Product (1) ──< (N) ProductVariant
Product (1) ──< (N) Review
Product (1) ──< (N) Wishlist

ProductVariant (N) ──< (N) CartItem
ProductVariant (N) ──< (N) OrderItem

Order (1) ──< (N) OrderItem
Order (0..1) ──> (1) Promotion (via discountCode)
```

### 5.2. Request Flow

```
Client Request
    ↓
Express Router
    ↓
Auth Middleware (if protected)
    ↓
Validation Middleware (express-validator)
    ↓
Controller (handleRequest)
    ↓
Service (business logic)
    ↓
Model (Mongoose)
    ↓
MongoDB
```

### 5.3. Front-end Data Flow

```
Component
    ↓
React Query Hook / Context
    ↓
API Client (lib/api.ts)
    ↓
HTTP Request (fetch)
    ↓
Back-end API
    ↓
Response → Component State
```

### 5.4. Order Creation Dependencies

```
createOrderFromCart()
    ├── Cart.findOne() ──────────────> Cart Model
    ├── buildItemsFromCart() ────────> Variant Model (populate)
    ├── calcTotals() ────────────────> Promotion Service (if discountCode)
    ├── Order.create() ──────────────> Order Model
    ├── Variant.updateMany() ────────> Variant Model (stock decrement)
    ├── Cart.save() ─────────────────> Cart Model (clear)
    ├── createPaymentLink() ─────────> PayOS Service (if PayOS)
    ├── Loyalty.earnPoints() ─────────> Loyalty Service (if COD)
    └── sendOrderConfirmationEmail() ─> Email Service
```

---

## 6. MÔI TRƯỜNG PHÁT TRIỂN

### 6.1. Environment Variables

```bash
# Back-end (.env)
MONGO_URI=mongodb://localhost:27017/fshoemate
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PORT=4000
FRONTEND_URL=http://localhost:8080

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# PayOS
PAYOS_CLIENT_ID=your-client-id
PAYOS_API_KEY=your-api-key
PAYOS_CHECKSUM_KEY=your-checksum-key
```

```bash
# Front-end (.env)
VITE_API_BASE_URL=http://localhost:4000/api
```

### 6.2. Development Scripts

```json
// back-end/package.json
{
  "scripts": {
    "dev": "nodemon src/server.js",  // Auto-reload
    "start": "node src/server.js"    // Production
  }
}

// front-end/package.json
{
  "scripts": {
    "dev": "vite",                    // Dev server (port 8080)
    "build": "vite build",            // Production build
    "preview": "vite preview"         // Preview production build
  }
}
```

### 6.3. Development Workflow

1. **Start MongoDB**: `mongod` hoặc MongoDB Atlas
2. **Start Back-end**: `cd back-end && npm run dev` (port 4000)
3. **Start Front-end**: `cd front-end && npm run dev` (port 8080)
4. **Access**: `http://localhost:8080`

---

## 7. VẤN ĐỀ KỸ THUẬT & GIẢI PHÁP

### 7.1. Vấn đề: Cart Synchronization (Guest ↔ Authenticated)

**Vấn đề**: Guest thêm vào local storage, sau khi đăng nhập cần merge với server cart.

**Giải pháp**:
```typescript
// CartContext.tsx - Dual mode system
- Mode "local": Store in localStorage
- Mode "server": Store in MongoDB
- Auto-detect on auth state change
- Merge logic: Server cart takes priority, local items added if not conflict
```

### 7.2. Vấn đề: Stock Race Condition

**Vấn đề**: Nhiều user cùng mua sản phẩm cuối cùng → overselling.

**Giải pháp**:
```javascript
// order.service.js
// 1. Check stock before order creation
if (variant.stock < quantity) {
  throw new Error("Insufficient stock");
}

// 2. Atomic decrement
await Variant.findByIdAndUpdate(item.variantId, { 
  $inc: { stock: -item.quantity } 
});

// 3. Cart validation removes out-of-stock items
const validItems = cart.items.filter(item => {
  return variant.stock > 0;
});
```

### 7.3. Vấn đề: Slug Duplication

**Vấn đề**: Product slug phải unique, nhưng user có thể nhập trùng.

**Giải pháp**:
```javascript
// product.service.js - Auto-generate unique slug
let slug = data.slug;
let counter = 1;
while (true) {
  const existingProduct = await Product.findOne({ slug: slug });
  if (!existingProduct) break;
  slug = `${data.slug}-${counter}`;
  counter++;
  if (counter > 100) {
    slug = `${data.slug}-${Date.now()}`;
    break;
  }
}
data.slug = slug;
```

### 7.4. Vấn đề: PayOS Payment Link Expiry

**Vấn đề**: Payment link có thể expire, cần recreate.

**Giải pháp**:
```javascript
// order.service.js
// Store orderCode in order.metadata
order.metadata = {
  payosPaymentLink: paymentLinkData.checkoutUrl,
  payosOrderCode: paymentLinkData.orderCode
};

// On cancellation, cancel payment link
if (order.metadata?.payosOrderCode) {
  await cancelPaymentLink(order.metadata.payosOrderCode);
}
```

### 7.5. Vấn đề: Email Sending Failure

**Vấn đề**: Email service fail không được làm fail order creation.

**Giải pháp**:
```javascript
// order.service.js - Non-blocking email
try {
  await sendOrderConfirmationEmail(order, email, name);
} catch (error) {
  console.error("Failed to send order email:", error);
  // Don't throw - order should still be created
}
```

### 7.6. Vấn đề: Variant Cleanup on Product Update

**Vấn đề**: Khi update product (sizes/colors), variants cũ cần được xóa.

**Giải pháp**:
```javascript
// product.service.js - updateProduct()
// 1. Create new variants for new combinations
await updateVariantsForProduct(product, defaultStock);

// 2. Delete variants that no longer match
const validCombinations = new Set();
for (const size of product.sizes) {
  for (const colorObj of product.colors) {
    validCombinations.add(`${size}-${colorName}`);
  }
}

const allVariants = await Variant.find({ productId: product._id });
for (const variant of allVariants) {
  const combination = `${variant.size}-${variant.color}`;
  if (!validCombinations.has(combination)) {
    await Variant.findByIdAndDelete(variant._id);
  }
}
```

---

## 8. GHI CHÚ XÂY DỰNG/TRIỂN KHAI

### 8.1. Database Indexes

```javascript
// Variant model - Composite unique index
variantSchema.index({ productId: 1, size: 1, color: 1 }, { unique: true });

// User model - Email unique index (automatic)
userSchema.index({ email: 1 }, { unique: true });

// Product model - Slug unique index (automatic)
productSchema.index({ slug: 1 }, { unique: true });
```

### 8.2. Error Handling Strategy

```javascript
// Global error handler
function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error"
  });
}

// Service layer throws errors with status
const err = new Error("Cart is empty");
err.status = 400;
throw err;
```

### 8.3. Security Best Practices

1. **Password hashing**: bcrypt với salt rounds = 10
2. **JWT secret**: Strong random string, không commit vào git
3. **CORS**: Chỉ allow front-end domain
4. **Input validation**: express-validator cho tất cả user input
5. **SQL Injection**: Mongoose tự động escape
6. **XSS**: React tự động escape HTML

### 8.4. Performance Optimizations

1. **Database queries**:
   - Sử dụng `select()` để chỉ lấy fields cần
   - Sử dụng `populate()` thay vì multiple queries
   - Index trên các fields thường query

2. **Front-end**:
   - React Query caching (staleTime: 5 minutes)
   - Lazy loading cho admin pages
   - Image optimization

3. **API**:
   - Pagination cho list endpoints
   - Filtering/sorting ở database level

### 8.5. Deployment Checklist

**Back-end**:
- [ ] Set environment variables
- [ ] MongoDB connection string
- [ ] JWT_SECRET
- [ ] Email credentials
- [ ] PayOS credentials
- [ ] CORS allowed origins
- [ ] PM2 hoặc process manager

**Front-end**:
- [ ] Set VITE_API_BASE_URL
- [ ] Build production: `npm run build`
- [ ] Deploy to static hosting (Vercel, Netlify, etc.)

### 8.6. Monitoring & Logging

```javascript
// Error logging
console.error("Failed to send order email:", error);

// Request logging (có thể thêm morgan middleware)
app.use(morgan('combined'));
```

---

## TÓM TẮT

Hệ thống FShoeMate được xây dựng với:

- **Kiến trúc**: Layered (Back-end) + Component-based (Front-end)
- **Pattern**: Controller-Service-Model, Repository pattern (Mongoose)
- **Security**: JWT, bcrypt, input validation
- **Integration**: PayOS, Nodemailer
- **State management**: React Context + React Query
- **Database**: MongoDB với relationships và indexes
- **Error handling**: Global error middleware
- **Performance**: Caching, pagination, lazy loading

Hệ thống có thể mở rộng và bảo trì tốt nhờ cấu trúc module rõ ràng và tách biệt concerns.

