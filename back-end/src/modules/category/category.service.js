const Category = require("./category.model");
const Product = require("../product/product.model");

async function listCategories() {
  const categories = await Category.find().sort({ name: 1 });
  
  // Count products for each category
  const categoriesWithCount = await Promise.all(
    categories.map(async (category) => {
        const count = await Product.countDocuments({ categoryId: category.id });
      return {
        ...category.toObject(),
        count
      };
    })
  );
  
  return categoriesWithCount;
}

function getCategory(id) { return Category.findOne({ id }); }
function createCategory(data) { return Category.create(data); }
function updateCategory(id, data) { return Category.findOneAndUpdate({ id }, data, { new: true }); }
function deleteCategory(id) { return Category.deleteOne({ id }); }

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };