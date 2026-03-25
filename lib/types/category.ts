export type GroupType = "income" | "expense" | "transfer" | "loan"

export type ParentCategory = {
  id: string
  name: string
  group_type: GroupType | null
  expense_subtype: "fixed" | "variable" | "shared" | null
}