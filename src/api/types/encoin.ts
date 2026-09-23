export type MonetizationRequest = {
  id: number
  coins: number
  rublesPerCoin: number
  amountRubles: number
  createdAt: string
  processedAt: string | null
  isProcessed: boolean
}

export type AdminMonetizationRequest = MonetizationRequest & {
  user: {id: string, name: string, phone: string, balance: number, reserved: number}
}

export type EnCoinBalance = {
  balance: number
  reserved: number
  available: number
  rublesPerCoin: number
  withdrawalThreshold: number
  hasCompletedDailyThisWeek: boolean
  totalEarnedCoins: number
  totalEarnedRubles: number
  requests: MonetizationRequest[]
}

export type MonetizationStatus = 'all' | 'pending' | 'processed'
export type MonetizationPage = {items: AdminMonetizationRequest[], page: number, lastPage: number, total: number}
