export type ParentCategory = {
  id: string
  name: string
  group_type: "income" | "expense" | "transfer" | "loan" | null
  expense_subtype: "fixed" | "variable" | "shared" | null
}

/**
 * Keep only valid parent categories
 */
export function getValidParentCategories(parents: ParentCategory[]) {
  return parents.filter(
    (p) => p.group_type !== null
  ) as Required<ParentCategory>[]
}

/**
 * Sort parents:
 * - income/expense first
 * - transfer/loan last
 * - alphabetical inside groups
 */
export function sortParentCategories(parents: Required<ParentCategory>[]) {
  return [...parents].sort((a, b) => {
    const aIsLast = a.group_type === "transfer" || a.group_type === "loan"
    const bIsLast = b.group_type === "transfer" || b.group_type === "loan"

    if (aIsLast !== bIsLast) return aIsLast ? 1 : -1

    return a.name.localeCompare(b.name)
  })
}

/**
 * Clean label for dropdown
 */
export function formatParentLabel(p: Required<ParentCategory>) {
  if (p.group_type === "expense" && p.expense_subtype) {
    return `${p.name}`
  }

  return p.name
}

/**
 * Full pipeline (use this most of the time)
 */
export function prepareParentCategories(parents: ParentCategory[]) {
  return sortParentCategories(getValidParentCategories(parents))
}