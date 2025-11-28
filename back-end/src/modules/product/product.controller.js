const { validationResult } = require("express-validator");
const {
  listProducts,
  getProductByIdOrSlug,
  createProduct,
  updateProduct,
  deleteProduct
} = require("./product.service");

async function handleList(req, res, next) {
  try {
    const filters = {
      category: req.query.category,
      brand: req.query.brand,
      q: req.query.q,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      isFeatured: req.query.isFeatured === "true" ? true : req.query.isFeatured === "false" ? false : undefined,
      targetAudience: req.query.targetAudience
    };
    const pagination = {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 12
    };
    // Map frontend sort values to MongoDB sort format
    let sort = req.query.sort || "-createdAt";
    if (sort === "price-low") {
      sort = "price"; // Sort ascending (low to high)
    } else if (sort === "price-high") {
      sort = "-price"; // Sort descending (high to low)
    } else if (sort === "newest") {
      sort = "-createdAt"; // Sort by newest first
    }
    
    const includeInactive = req.query.includeInactive === "true";

    const result = await listProducts({ filters, pagination, sort, includeInactive });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

async function handleGetDetail(req, res, next) {
  try {
    const product = await getProductByIdOrSlug(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
}

async function handleCreate(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const product = await createProduct(req.body);
    res.status(201).json({ success: true, product });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
      return res.status(409).json({ 
        success: false,
        message: `Product with slug "${error.keyValue.slug}" already exists. Please use a different slug.`,
        error: "DUPLICATE_SLUG"
      });
    }
    next(error);
  }
}

async function handleUpdate(req, res, next) {
  try {
    const product = await updateProduct(req.params.id, req.body);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ success: true, product });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
      return res.status(409).json({ 
        success: false,
        message: `Product with slug "${error.keyValue.slug}" already exists. Please use a different slug.`,
        error: "DUPLICATE_SLUG"
      });
    }
    next(error);
  }
}

async function handleDelete(req, res, next) {
  try {
    await deleteProduct(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleList,
  handleGetDetail,
  handleCreate,
  handleUpdate,
  handleDelete
};