// lib/services/transaction.service.ts
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export async function createIncome(params: {
  to_account_id: string
  category_id: string
  amount: number
  description?: string
  occurred_at: string // yyyy-mm-dd
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_from_id: null,
    account_to_id: params.to_account_id,
    category_id: params.category_id,
    direction: "income",
    amount: params.amount,
    description: params.description ?? null,
    occurred_at: params.occurred_at,
    shared_group_id: null,
  })

  if (error) throw error
}

export async function createExpense(params: {
  from_account_id: string
  category_id: string
  amount: number
  description?: string
  occurred_at: string
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_from_id: params.from_account_id,
    account_to_id: null,
    category_id: params.category_id,
    direction: "expense",
    amount: params.amount,
    description: params.description ?? null,
    occurred_at: params.occurred_at,
    shared_group_id: null,
  })

  if (error) throw error
}

export async function createTransfer(params: {
  from_account: string
  to_account: string
  category_id: string
  amount: number
  description?: string
  occurred_at: string
}) {
  const { error } = await supabase.rpc("create_transfer", {
    p_from_account: params.from_account,
    p_to_account: params.to_account,
    p_amount: params.amount,
    p_category_id: params.category_id,
    p_description: params.description ?? null,
    p_date: params.occurred_at,
  })
  if (error) throw error
}

export async function createLoan(params: {
  from_account: string
  to_account: string
  category_id: string
  amount: number
  description?: string
  occurred_at: string
}) {
  const { error } = await supabase.rpc("create_loan", {
    p_from_account: params.from_account,
    p_to_account: params.to_account,
    p_amount: params.amount,
    p_category_id: params.category_id,
    p_description: params.description ?? null,
    p_date: params.occurred_at,
  })
  if (error) throw error
}

export async function createSharedExpense(params: {
  from_account_id: string
  category_id: string
  amount: number
  description?: string
  occurred_at: string
  shared_group_id: string
  splits: { user_id: string; amount: number }[]
}) {
  const { error } = await supabase.rpc("create_shared_expense", {
    p_account_from: params.from_account_id,
    p_category_id: params.category_id,
    p_amount: params.amount,
    p_description: params.description ?? null,
    p_date: params.occurred_at,
    p_shared_group_id: params.shared_group_id,
    p_split: params.splits,
  })
  if (error) throw error
}
