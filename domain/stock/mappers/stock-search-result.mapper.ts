// stock-search-result.mapper.ts

import {StockSearchResultDto} from "@/domain/stock/types/stock-search-result.dto";
import {StockSearchResult} from "@/domain/stock/types/stock-search-result.model";

export function toStockSearchResult(data: StockSearchResultDto): StockSearchResult {
  return {
    symbol: data.symbol,
    name: data.name,
    market: data.market,
  }
}

export function toStockSearchResultList(dto: StockSearchResultDto[]): StockSearchResult[] {
  return dto.map(toStockSearchResult)
}
