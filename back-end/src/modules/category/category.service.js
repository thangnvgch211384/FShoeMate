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
  
  // Group child categories by name (Running, Football, Lifestyle) and sum counts
  const parentCategories = categoriesWithCount.filter(cat => !cat.parentId);
  const childCategories = categoriesWithCount.filter(cat => cat.parentId);
  
  // Group child categories by name
  const groupedMap = new Map();
  childCategories.forEach(cat => {
    const name = cat.name;
    if (!groupedMap.has(name)) {
      groupedMap.set(name, {
        name: name,
        count: 0,
        ids: [], // Store all category IDs with this name
        parentIds: new Set() // Store parent IDs
      });
    }
    const group = groupedMap.get(name);
    group.count += cat.count || 0;
    group.ids.push(cat.id);
    if (cat.parentId) {
      group.parentIds.add(cat.parentId);
    }
  });
  
  // Convert grouped map to array and add parent categories
  const groupedArray = Array.from(groupedMap.values()).map(group => ({
    ...group,
    parentIds: Array.from(group.parentIds),
    id: group.ids[0] // Use first ID as representative
  }));
  
  // Return both parent categories and grouped child categories
  return {
    parents: parentCategories,
    children: groupedArray,
    all: categoriesWithCount // Keep all for backward compatibility
  };
}

function getCategory(id) { return Category.findOne({ id }); }
function createCategory(data) { return Category.create(data); }
function updateCategory(id, data) { return Category.findOneAndUpdate({ id }, data, { new: true }); }
function deleteCategory(id) { return Category.deleteOne({ id }); }

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };