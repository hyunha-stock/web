import {keepPreviousData, useQuery} from "@tanstack/react-query";
import {searchStock} from "@/domain/stock/api/search-stock";

export function useSearchStock(query: string) {
  return useQuery({
    queryKey: ["stock-search", query],
    queryFn: () => searchStock(query),
    enabled: query.length > 0,
    retry: 1,
    placeholderData: keepPreviousData,
  })
}