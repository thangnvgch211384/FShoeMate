const { validationResult } = require("express-validator");
const {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} = require("./category.service");

async function handleList(_req, res, next) {
  try {
    const result = await listCategories();
    // If result is an object with parents/children, return grouped structure
    // Otherwise return as array for backward compatibility
    if (result.parents && result.children) {
      res.json({ 
        success: true, 
        categories: result.all, // All categories for backward compatibility
        grouped: result.children, // Grouped child categories
        parents: result.parents // Parent categories
      });
    } else {
      res.json({ success: true, categories: result });
    }
  } catch (error) {
    next(error);
  }
}

async function handleDetail(req, res, next) {
  try {
    const category = await getCategory(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json({ success: true, category });
  } catch (error) {
    next(error);
  }
}

async function handleCreate(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const category = await createCategory(req.body);
    res.status(201).json({ success: true, category });
  } catch (error) {
    next(error);
  }
}

async function handleUpdate(req, res, next) {
  try {
    const category = await updateCategory(req.params.id, req.body);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json({ success: true, category });
  } catch (error) {
    next(error);
  }
}

async function handleDelete(req, res, next) {
  try {
    await deleteCategory(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleList,
  handleDetail,
  handleCreate,
  handleUpdate,
  handleDelete
};