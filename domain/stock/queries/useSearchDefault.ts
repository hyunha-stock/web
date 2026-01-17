import {useQuery} from "@tanstack/react-query";
import {fetchSearchDefault} from "@/domain/stock/api/fetch-search-default";

export function useSearchDefault() {
  return useQuery({
    queryKey: ["search-default"],
    queryFn: () => fetchSearchDefault(),
    retry: 1,
  })
}