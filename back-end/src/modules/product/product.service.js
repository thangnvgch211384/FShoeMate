const mongoose = require("mongoose");
const Product = require("./product.model");
const Variant = require("../product-variant/variant.model");

async function listProducts({ filters, pagination, sort, includeInactive = false }) {
  const query = {};

  if (!includeInactive) {
    query.status = "active";
  }

  const andConditions = [];

  if (filters.category) {
    andConditions.push({
      $or: [
        { categoryId: filters.category },
        { categoryName: filters.category }
      ]
    });
  }
  
  if (filters.brand) query.brand = filters.brand;
  if (filters.q) query.name = { $regex: filters.q, $options: "i" };
  if (filters.minPrice !== undefined) query.price = { ...query.price, $gte: filters.minPrice };
  if (filters.maxPrice !== undefined) query.price = { ...query.price, $lte: filters.maxPrice };
  if (filters.isFeatured !== undefined) query.isFeatured = filters.isFeatured;
  
  if (filters.targetAudience) {
    query.targetAudience = { $in: [filters.targetAudience] };
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  const limit = pagination.limit || 12;
  const page = pagination.page || 1;
  const skip = (page - 1) * limit;

  const sortOption = sort || "-createdAt";

  const [items, total] = await Promise.all([
    Product.find(query).sort(sortOption).skip(skip).limit(limit),
    Product.countDocuments(query)
  ]);

  return { items, total, page, limit };
}

async function getProductByIdOrSlug(identifier) {
    const orConditions = [{ slug: identifier }];
  
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      orConditions.unshift({ _id: identifier });
    }
  
    return Product.findOne({ $or: orConditions });
  }

async function createProduct(data) {
  if (data.originalPrice === null || data.originalPrice === undefined) {
    delete data.originalPrice;
    data.isOnSale = false;
  } else if (data.originalPrice && data.price && data.originalPrice > data.price) {
    data.isOnSale = true;
  } else if (data.originalPrice && data.price && data.originalPrice <= data.price) {
    delete data.originalPrice;
    data.isOnSale = false;
  } else {
    data.isOnSale = false;
  }
  
  const defaultStock = data.defaultStock !== undefined ? Number(data.defaultStock) : 0;
  delete data.defaultStock; 
  
  delete data.images;
  
  // Check if slug already exists and generate unique slug if needed
  let slug = data.slug;
  let counter = 1;
  while (true) {
    const existingProduct = await Product.findOne({ slug: slug });
    if (!existingProduct) {
      break; // Slug is unique, use it
    }
    // Slug exists, append counter to make it unique
    slug = `${data.slug}-${counter}`;
    counter++;
    // Prevent infinite loop (max 100 attempts)
    if (counter > 100) {
      // Fallback: use timestamp
      slug = `${data.slug}-${Date.now()}`;
      break;
    }
  }
  data.slug = slug;
  
  const product = await Product.create(data);
  
  if (product.sizes && product.sizes.length > 0 && product.colors && product.colors.length > 0) {
    await createVariantsForProduct(product, defaultStock);
  }
  
  return product;
}

async function createVariantsForProduct(product, defaultStock = 0) {
  const variantsToCreate = [];
  
  for (const size of product.sizes) {
    for (const colorObj of product.colors) {
      const colorName = typeof colorObj === 'string' ? colorObj : colorObj.name;
      
      // Skip nếu colorName rỗng hoặc undefined
      if (!colorName || typeof colorName !== 'string' || colorName.trim() === '') {
        continue;
      }
      
      const existing = await Variant.findOne({
        productId: product._id,
        size: size,
        color: colorName.trim()
      });
      
      if (existing) {
        continue;
      }
      
      
      const colorImages = typeof colorObj === 'object' && colorObj.images && colorObj.images.length > 0
        ? colorObj.images
        : [];
      
      
      let variantPrice;
      let variantDiscountPrice;

      const hasOriginalPrice = product.originalPrice !== undefined && product.originalPrice !== null;
      
      if (hasOriginalPrice && product.originalPrice > product.price) {
        variantPrice = product.price; 
        variantDiscountPrice = product.originalPrice; 
      } else {
        variantPrice = product.price; 
        variantDiscountPrice = undefined; 
      }
      
      // Sử dụng defaultStock, nếu undefined/null thì dùng 0
      const stockValue = (defaultStock !== undefined && defaultStock !== null) ? Number(defaultStock) : 0;
      
      const variantData = {
        productId: product._id,
        size: size,
        color: colorName.trim(),
        price: variantPrice,
        stock: stockValue, 
        images: colorImages.length > 0 ? colorImages : []
      };
      
      if (variantDiscountPrice !== undefined) {
        variantData.discountPrice = variantDiscountPrice;
      }
      
      variantsToCreate.push(variantData);
    }
  }
  
  if (variantsToCreate.length > 0) {
    const createdVariants = await Variant.insertMany(variantsToCreate);
  }
}

async function updateVariantsForProduct(product, defaultStock = 0) {
  const allVariants = await Variant.find({ productId: product._id });
  
  let variantPrice;
  let updateData = {};
  const unsetFields = {};
  
  const hasOriginalPrice = product.originalPrice !== undefined && product.originalPrice !== null;
  
  if (hasOriginalPrice && product.originalPrice > product.price) {
    variantPrice = product.price;
    updateData.discountPrice = product.originalPrice;
  } else {
    variantPrice = product.price;
    unsetFields.discountPrice = "";
  }
  
  updateData.price = variantPrice;
  
  if (Object.keys(unsetFields).length > 0) {
    await Variant.updateMany(
      { productId: product._id },
      {
        $set: updateData,
        $unset: unsetFields
      }
    );
  } else {
    await Variant.updateMany(
      { productId: product._id },
      { $set: updateData }
    );
  }
  
  await createVariantsForProduct(product, defaultStock || 0);
}

async function updateProduct(id, data) {
  const updateData = { ...data };
  const unsetFields = {};
  
  const defaultStock = data.defaultStock !== undefined ? Number(data.defaultStock) : 0;
  delete updateData.defaultStock;
  delete updateData.images; 
  
  const hasOriginalPrice = 'originalPrice' in data;
  const originalPriceValue = data.originalPrice;
  
  if (hasOriginalPrice && originalPriceValue && updateData.price && originalPriceValue > updateData.price) {
    updateData.isOnSale = true;
  } else if (hasOriginalPrice && originalPriceValue && updateData.price && originalPriceValue <= updateData.price) {
    delete updateData.originalPrice;
    unsetFields.originalPrice = "";
    updateData.isOnSale = false;
  } else if (hasOriginalPrice && (originalPriceValue === undefined || originalPriceValue === null)) {
    delete updateData.originalPrice;
    unsetFields.originalPrice = "";
    updateData.isOnSale = false;
  } else {
    updateData.isOnSale = false;
  }
  
  // Check if slug is being updated and if it already exists (excluding current product)
  if (updateData.slug) {
    const existingProduct = await Product.findOne({ 
      slug: updateData.slug,
      _id: { $ne: id } // Exclude current product
    });
    
    if (existingProduct) {
      // Slug already exists for another product, generate unique slug
      let slug = updateData.slug;
      let counter = 1;
      while (true) {
        const checkProduct = await Product.findOne({ 
          slug: slug,
          _id: { $ne: id }
        });
        if (!checkProduct) {
          break; // Slug is unique
        }
        slug = `${updateData.slug}-${counter}`;
        counter++;
        if (counter > 100) {
          slug = `${updateData.slug}-${Date.now()}`;
          break;
        }
      }
      updateData.slug = slug;
    }
  }
  
  let product;
  if (Object.keys(unsetFields).length > 0) {
    product = await Product.findByIdAndUpdate(
      id,
      { $set: updateData, $unset: unsetFields },
      { new: true }
    );
  } else {
    product = await Product.findByIdAndUpdate(id, updateData, { new: true });
  }
  
  if (!product) {
    return null;
  }
        
  if (product.sizes && product.sizes.length > 0 && product.colors && product.colors.length > 0) {
    await updateVariantsForProduct(product, defaultStock);
    
    
    const validCombinations = new Set();
    for (const size of product.sizes) {
      for (const colorObj of product.colors) {
        const colorName = typeof colorObj === 'string' ? colorObj : colorObj.name;
        // Chỉ thêm vào validCombinations nếu colorName hợp lệ
        if (colorName && typeof colorName === 'string' && colorName.trim() !== '') {
          validCombinations.add(`${size}-${colorName.trim()}`);
        }
      }
    }
    
    const allVariants = await Variant.find({ productId: product._id });
    
    for (const variant of allVariants) {
      const combination = `${variant.size}-${variant.color}`;
      if (!validCombinations.has(combination)) {
        await Variant.findByIdAndDelete(variant._id);
      }
    }
  }
  
  return product;
}

async function deleteProduct(id) {
  await Product.findByIdAndDelete(id);
}

module.exports = {
  listProducts,
  getProductByIdOrSlug,
  createProduct,
  updateProduct,
  deleteProduct
};