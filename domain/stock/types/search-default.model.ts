export type SearchDefault = {
  marketCapDesc: SearchDefaultStock[]
  gainersDesc: SearchDefaultStock[]
  losersAsc: SearchDefaultStock[]
}

export type SearchDefaultStock = {
  symbol: string
  name: string
  sector: string
  market: string
  changeRateFromPrevDay: number
}
