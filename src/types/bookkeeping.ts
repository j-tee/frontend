import type { UUID } from './common'

export interface AccountType {
  id: UUID
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Account {
  id: UUID
  name: string
  code: string
  account_type: UUID
  description?: string
  is_active: boolean
}

export interface JournalEntryLine {
  id?: UUID
  account: UUID
  description?: string
  debit: number
  credit: number
}

export interface JournalEntry {
  id: UUID
  reference: string
  memo?: string
  entry_date: string
  lines: JournalEntryLine[]
  created_at: string
  updated_at: string
}

export interface LedgerEntry {
  id: UUID
  account: UUID
  journal_entry: UUID
  description?: string
  debit: number
  credit: number
  balance: number
  created_at: string
}

export interface TrialBalance {
  id: UUID
  start_date: string
  end_date: string
  totals: TrialBalanceTotals
}

export interface TrialBalanceTotals {
  total_debits: number
  total_credits: number
  net_balance: number
}

export interface FinancialPeriod {
  id: UUID
  name: string
  start_date: string
  end_date: string
  is_closed: boolean
}

export interface Budget {
  id: UUID
  account: UUID
  financial_period: UUID
  amount: number
  spent: number
}
