const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/database");
const errorHandler = require("./middlewares/error.middleware");
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/user/user.routes");
const productRoutes = require("./modules/product/product.routes");
const categoryRoutes = require("./modules/category/category.routes");
const variantRoutes = require("./modules/product-variant/variant.routes");
const cartRoutes = require("./modules/cart/cart.routes");
const orderRoutes = require("./modules/order/order.routes");
const promotionRoutes = require("./modules/promotion/promotion.routes");
const loyaltyRoutes = require("./modules/loyalty/loyalty.routes");
const reviewRoutes = require("./modules/review/review.routes");
const wishlistRoutes = require("./modules/wishlist/wishlist.routes");


dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api", variantRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api", reviewRoutes);
app.use("/api/wishlist", wishlistRoutes);


app.use(errorHandler);

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

async function startServer() {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
}

startServer();

module.exports = app;