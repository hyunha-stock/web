// search-default.mapper.ts

import {SearchDefaultDto, SearchDefaultStockDto} from "@/domain/stock/types/search-default.dto";
import {SearchDefault, SearchDefaultStock} from "@/domain/stock/types/search-default.model";

export function toSearchDefaultStock(data: SearchDefaultStockDto): SearchDefaultStock {
  return {
    symbol: data.symbol,
    name: data.name,
    sector: data.sector,
    market: data.market,
    changeRateFromPrevDay: data.changeRateFromPrevDay,
  }
}

export function toSearchDefault(dto: SearchDefaultDto): SearchDefault {
  return {
    marketCapDesc: dto.marketCapDesc.map(toSearchDefaultStock),
    gainersDesc: dto.gainersDesc.map(toSearchDefaultStock),
    losersAsc: dto.losersAsc.map(toSearchDefaultStock),
  }
}

export function toSearchDefaultStockList(dto: SearchDefaultStockDto[]): SearchDefaultStock[] {
  return dto.map(toSearchDefaultStock)
}
