import {useQuery} from "@tanstack/react-query";
import {fetchRealtimeNews} from "@/domain/stock/api/fetch-realtime-news";

export function useRealtimeNews() {
  return useQuery({
    queryKey: ["realtime-news"],
    queryFn: () => fetchRealtimeNews(),
    retry: 1,
    refetchInterval: 15000,
  });
}
