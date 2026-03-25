import { createClient } from "@/lib/supabase/server"
import CustomCategoriesManager from "@/components/categories/CustomCategoriesManager"

export default async function CategoriesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Load all parent/root categories (the groups)
  const { data: parents } = await supabase
    .from("categories")
    .select("id, name, group_type, expense_subtype")
    .is("parent_id", null)
    .order("name")

  // Load all subcategories (children) — both global and user's own custom ones
  const { data: allCategories } = await supabase
    .from("categories")
    .select("id, name, parent_id, is_global, created_by, expense_subtype")
    .not("parent_id", "is", null)
    .order("name")

  // Count how many transactions use each category
  // This tells us which categories are "in use" and cannot be deleted
  const { data: txnCounts } = await supabase
    .from("transactions")
    .select("category_id")

  // Build a Set of category IDs that have at least one transaction
  const usedCategoryIds = new Set<string>(
    (txnCounts || [])
      .map((t: { category_id: string | null }) => t.category_id)
      .filter(Boolean) as string[]
  )

  return (
    <div className="p-4">
      <CustomCategoriesManager
        parents={parents || []}
        allCategories={allCategories || []}
        currentUserId={user?.id ?? ""}
        usedCategoryIds={usedCategoryIds}
      />
    </div>
  )
}
