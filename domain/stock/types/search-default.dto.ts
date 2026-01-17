// SearchDefaultDto.ts
export interface SearchDefaultDto {
  marketCapDesc: SearchDefaultStockDto[]
  gainersDesc: SearchDefaultStockDto[]
  losersAsc: SearchDefaultStockDto[]
}

export interface SearchDefaultStockDto {
  symbol: string
  name: string
  sector: string
  market: string
  changeRateFromPrevDay: number
}
