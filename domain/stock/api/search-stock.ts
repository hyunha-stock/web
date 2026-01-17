import {StockSearchResult} from "@/domain/stock/types/stock-search-result.model";
import {apiFetchClient} from "@/lib/http/client";
import {StockSearchResultDto} from "@/domain/stock/types/stock-search-result.dto";
import {toStockSearchResultList} from "@/domain/stock/mappers/stock-search-result.mapper";

export async function searchStock(query: string): Promise<StockSearchResultDto[]> {
  const data = await apiFetchClient<StockSearchResult[]>(
    `/stocks/v1/search?query=${encodeURIComponent(query)}`,
    {
      method: "GET",
      headers: {Accept: "application/json"},
      cache: "no-store",
    }
  );
  return toStockSearchResultList(data);
}