import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, FolderTree, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { fetchCategories, createCategory, updateCategory, deleteCategory } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface Category {
  _id?: string
  id: string
  name: string
  description?: string
  parentId?: string | null
  count?: number
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    parentId: "" as string | null
  })
  const [parentCategories, setParentCategories] = useState<Category[]>([])
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetchCategories()
      const allCategories = res.all || res.categories || []
      const parents = (res.parents || []).filter((cat: any) => !cat.parentId)
      
      setCategories(allCategories)
      setParentCategories(parents)
    } catch (error: any) {
      console.error("Failed to load categories:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load categories",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!categoryId) return
    
    setDeleting(true)
    try {
      await deleteCategory(categoryId)
      toast({
        title: "Success",
        description: "Category deleted successfully"
      })
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive"
      })
    } finally {
      setDeleting(false)
      setCategoryToDelete(null)
    }
  }

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        id: category.id,
        name: category.name,
        description: category.description || "",
        parentId: category.parentId || null
      })
    } else {
      setEditingCategory(null)
      setFormData({
        id: "",
        name: "",
        description: "",
        parentId: null
      })
    }
    // Ensure parent categories are loaded before opening dialog
    if (parentCategories.length === 0) {
      loadData().then(() => {
        setShowDialog(true)
      })
    } else {
      setShowDialog(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive"
      })
      return
    }

    try {
      if (editingCategory) {
        // Update
        const updateData: any = {
          name: formData.name,
          description: formData.description
        }
        if (formData.parentId !== editingCategory.parentId) {
          updateData.parentId = formData.parentId || null
        }
        await updateCategory(editingCategory.id, updateData)
        toast({
          title: "Success",
          description: "Category updated successfully"
        })
      } else {
        // Create
        if (!formData.id.trim()) {
          toast({
            title: "Error",
            description: "Category ID is required",
            variant: "destructive"
          })
          return
        }
        await createCategory({
          id: formData.id,
          name: formData.name,
          description: formData.description,
          parentId: formData.parentId || null
        })
        toast({
          title: "Success",
          description: "Category created successfully"
        })
      }
      setShowDialog(false)
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingCategory ? 'update' : 'create'} category`,
        variant: "destructive"
      })
    }
  }

  const filteredCategories = categories.filter(cat => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      cat.name.toLowerCase().includes(searchLower) ||
      cat.id.toLowerCase().includes(searchLower) ||
      (cat.description && cat.description.toLowerCase().includes(searchLower))
    )
  })

  const getCategoryDisplayName = (category: Category) => {
    if (!category.parentId) return category.name
    const parent = parentCategories.find(p => p.id === category.parentId)
    return parent ? `${parent.name} > ${category.name}` : category.name
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Categories</h1>
            <p className="text-muted-foreground mt-1">Manage product categories</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Categories</CardTitle>
                <CardDescription>
                  {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'}
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading categories...</div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No categories found" : "No categories yet"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-mono text-sm">{category.id}</TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        {category.parentId ? (
                          <span className="text-sm text-muted-foreground">Child</span>
                        ) : (
                          <span className="text-sm font-medium">Parent</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {category.description || "-"}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{category.count || 0}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCategoryToDelete(category.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Edit Category" : "Create Category"}
                </DialogTitle>
                <DialogDescription>
                  {editingCategory 
                    ? "Update category information" 
                    : "Add a new category to organize products"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                {!editingCategory && (
                  <div className="space-y-2">
                    <Label htmlFor="id">Category ID *</Label>
                    <Input
                      id="id"
                      value={formData.id}
                      onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                      placeholder="e.g., men-running, women-lifestyle"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Unique identifier (lowercase, use hyphens)
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Running, Lifestyle, Football"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentId">Parent Category</Label>
                  <Select
                    value={formData.parentId || "none"}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, parentId: value === "none" ? null : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Parent Category)</SelectItem>
                      {parentCategories.length > 0 ? (
                        parentCategories.map((parent) => (
                          <SelectItem key={parent.id} value={parent.id}>
                            {parent.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No parent categories available</div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to create a parent category (Men, Women, Kids)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Category description..."
                    rows={3}
                  />
                </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCategory ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the category. Products using this category may be affected.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => categoryToDelete && handleDelete(categoryToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  )
}

