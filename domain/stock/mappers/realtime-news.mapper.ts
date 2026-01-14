import {RealtimeNewsDto} from "@/domain/stock/types/realtime-news.dto";
import {RealtimeNews} from "@/domain/stock/types/realtime-news.model";

export function toRealtimeNews(data: RealtimeNewsDto) {
  return {
    newsId: data.newsId,
    title: data.title,
    description: data.description,
    source: data.source,
    url: data.url,
    crawledAt: new Date(data.crawledAt),
  };
}

export function toRealtimeNewsList(dto: RealtimeNewsDto[]): RealtimeNews[] {
  return dto.map(toRealtimeNews);
}
