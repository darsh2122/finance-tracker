export type AccountNature = 'asset' | 'liability'

export type AccountType =
  | 'cash'
  | 'bank'
  | 'investment'
  | 'digital_wallet'
  | 'credit_card'
  | 'mortgage'
  | 'receivable'
  | 'loan_payable'
  | 'internal'

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  nature: AccountNature
  currency: string
  is_default: boolean
  is_archived: boolean
  created_at: string
}
