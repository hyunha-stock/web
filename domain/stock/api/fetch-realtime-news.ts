import {apiFetchClient} from "@/lib/http/client";
import {RealtimeNews} from "@/domain/stock/types/realtime-news.model";
import {RealtimeNewsDto} from "@/domain/stock/types/realtime-news.dto";
import { toRealtimeNewsList} from "@/domain/stock/mappers/realtime-news.mapper";

export async function fetchRealtimeNews(): Promise<RealtimeNews[]> {
  const data = await apiFetchClient<RealtimeNewsDto[]>(
    `/stocks/v1/news`,
    {
      method: "GET",
      credentials: "include",
      headers: {Accept: "application/json"},
      cache: "no-store",
    }
  );
  return toRealtimeNewsList(data);
}