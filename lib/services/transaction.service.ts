// lib/services/transaction.service.ts
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export async function createIncome(params: {
  to_account_id: string
  category_id: string
  amount: number
  description?: string
  occurred_at: string // yyyy-mm-dd
  currency: string
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
    currency: params.currency,
  })

  if (error) throw error

  // Fire and forget — won't delay the UI
  notifyUser(user.id, '💰 Income logged', `Income added to your account`, '/transactions')
}

export async function createExpense(params: {
  from_account_id: string
  category_id: string
  amount: number
  description?: string
  occurred_at: string
  currency: string
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
    currency: params.currency,
  })

  if (error) throw error

  // Fire and forget — won't delay the UI
  notifyUser(user.id, '📤 Expense logged', `Expense added from your account`, '/transactions')
}

export async function createTransfer(params: {
  from_account: string
  to_account: string
  category_id: string
  amount: number
  description?: string
  occurred_at: string
  currency: string
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase.rpc("create_transfer", {
    p_user_id: user.id,
    p_from_account: params.from_account,
    p_to_account: params.to_account,
    p_amount: params.amount,
    p_category_id: params.category_id,
    p_description: params.description ?? null,
    p_date: params.occurred_at,
  })
  if (error) throw error

  // Fire and forget — won't delay the UI
  notifyUser(user.id, '📤 Expense logged', `Expense added from your account`, '/transactions')
}

export async function createLoan(params: {
  from_account: string
  to_account: string
  category_id: string
  amount: number
  description?: string
  occurred_at: string
  currency: string
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { error } = await supabase.rpc("create_loan", {
    p_from_account: params.from_account,
    p_to_account: params.to_account,
    p_amount: params.amount,
    p_category_id: params.category_id,
    p_description: params.description ?? null,
    p_date: params.occurred_at,
  })
  if (error) throw error

  // Fire and forget — won't delay the UI
  notifyUser(user.id, '📤 Expense logged', `Expense added from your account`, '/transactions')
}

export async function createSharedExpense(params: {
  from_account_id: string
  category_id: string
  amount: number
  description?: string
  occurred_at: string
  shared_group_id: string
  splits: { user_id: string; amount: number }[]
  currency: string
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { error } = await supabase.rpc("create_shared_expense", {
    p_user_id: user.id,
    p_account_from: params.from_account_id,
    p_category_id: params.category_id,
    p_amount: params.amount,
    p_description: params.description ?? null,
    p_date: params.occurred_at,
    p_shared_group_id: params.shared_group_id,
    p_split: params.splits,
  })
  if (error) throw error

  // Fire and forget — won't delay the UI
  notifyUser(user.id, '📤 Expense logged', `Expense added from your account`, '/transactions')
}

async function notifyUser(userId: string, title: string, body: string, url: string) {
  try {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, message: body, url }),
    })
  } catch {
    // Notifications are best-effort — never block the main action
  }
}