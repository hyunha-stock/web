"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Sparkles,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRealtimeNews } from "@/domain/stock/queries/useRealtimeNews"

// =========================
// Server DTO (백엔드에서 오는 데이터)
// =========================
export type RealtimeNewsDto = {
  newsId: string
  title: string
  description: string
  source: string
  url: string
  crawledAt: Date | string // 서버가 string으로 줄 수도 있으니 허용
}

// =========================
// UI Model (렌더링용)
// =========================
type Sentiment = "positive" | "negative" | "neutral"

type RealtimeNewsUi = {
  id: string
  title: string
  source: string
  timestamp: number
  sentiment: Sentiment
  relatedStocks: { ticker: string; name: string }[]
  aiSummary: string
  category: string
  isBreaking: boolean
  url: string
}

// -------------------------
// 유틸
// -------------------------
const toEpochMs = (d: Date | string): number => {
  if (d instanceof Date) return d.getTime()
  const t = Date.parse(d)
  return Number.isFinite(t) ? t : Date.now()
}

const guessSentiment = (title: string, desc?: string): Sentiment => {
  const text = `${title} ${desc ?? ""}`
  const pos = ["급등", "호재", "상승", "개선", "확대", "수혜", "돌파", "성장", "양산", "투자"]
  const neg = ["급락", "악재", "하락", "리콜", "불확실", "규제", "적자", "감소", "중단", "사고", "위험"]

  const hasPos = pos.some((k) => text.includes(k))
  const hasNeg = neg.some((k) => text.includes(k))
  if (hasPos && !hasNeg) return "positive"
  if (hasNeg && !hasPos) return "negative"
  return "neutral"
}

const guessCategory = (title: string, desc?: string) => {
  const text = `${title} ${desc ?? ""}`
  if (text.includes("금리") || text.includes("환율") || text.includes("물가")) return "경제"
  if (text.includes("규제") || text.includes("정책") || text.includes("IRA")) return "정책"
  if (text.includes("미국") || text.includes("中") || text.includes("중국") || text.includes("글로벌")) return "글로벌"
  return "기업"
}

const isBreakingByText = (title: string) => {
  return title.includes("속보") || title.includes("긴급") || title.includes("리콜") || title.includes("사고")
}

// UI 배지/아이콘
const getTimeDiff = (timestamp: number) => {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)

  if (minutes < 1) return "방금 전"
  if (minutes < 60) return `${minutes}분 전`
  return `${Math.floor(minutes / 60)}시간 전`
}

const getSentimentIcon = (sentiment: Sentiment) => {
  switch (sentiment) {
    case "positive":
      return <TrendingUp className="h-4 w-4 text-red-500" />
    case "negative":
      return <TrendingDown className="h-4 w-4 text-blue-500" />
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />
  }
}

const getSentimentBadge = (sentiment: Sentiment) => {
  switch (sentiment) {
    case "positive":
      return (
        <Badge variant="outline" className="border-red-500/50 text-red-500 text-xs">
          호재
        </Badge>
      )
    case "negative":
      return (
        <Badge variant="outline" className="border-blue-500/50 text-blue-500 text-xs">
          악재
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground text-xs">
          중립
        </Badge>
      )
  }
}

// -------------------------
// 핵심: 서버 data -> UI 모델로 변환
// (relatedStocks / aiSummary 가 아직 없으면 최소값으로 채움)
// -------------------------
const mapDtoToUi = (dto: RealtimeNewsDto): RealtimeNewsUi => {
  const sentiment = guessSentiment(dto.title, dto.description)
  const category = guessCategory(dto.title, dto.description)
  return {
    id: dto.newsId,
    title: dto.title,
    source: dto.source,
    timestamp: toEpochMs(dto.crawledAt),
    sentiment,
    relatedStocks: [], // TODO: 서버에서 ticker 목록 주면 여기 매핑
    aiSummary: dto.description || "요약 준비 중",
    category,
    isBreaking: isBreakingByText(dto.title),
    url: dto.url,
  }
}

export function RealtimeNews() {
  const [isPaused, setIsPaused] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 서버 SSE/폴링 등으로 들어오는 데이터라고 가정
  const { data } = useRealtimeNews()
  const safeData: RealtimeNewsDto[] = Array.isArray(data) ? (data as any) : []

  // 서버 뉴스 -> UI 변환
  const serverNews: RealtimeNewsUi[] = useMemo(() => {
    return safeData
      .map(mapDtoToUi)
  }, [safeData])


  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-chart-4" />
            실시간 뉴스
            <Badge variant="secondary" className="ml-2 animate-pulse bg-red-500/20 text-red-500">
              LIVE
            </Badge>
          </CardTitle>

        </div>
      </CardHeader>

      <CardContent>
        <div ref={scrollRef} className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {serverNews.map((news, index) => (
            <div
              key={news.id}
              className={cn(
                "p-3 rounded-lg border transition-all",
                index === 0 && "animate-in slide-in-from-top-2 duration-300",
                news.isBreaking && "border-chart-4/50 bg-chart-4/5",
                news.sentiment === "positive" && !news.isBreaking && "border-red-500/20",
                news.sentiment === "negative" && !news.isBreaking && "border-blue-500/20",
                news.sentiment === "neutral" && !news.isBreaking && "border-border",
              )}
            >
              <div className="flex items-start gap-2">
                {getSentimentIcon(news.sentiment)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {news.isBreaking && <Badge className="bg-chart-4 text-white text-xs animate-pulse">속보</Badge>}

                    <Badge variant="secondary" className="text-xs shrink-0">
                      {news.category}
                    </Badge>

                    {getSentimentBadge(news.sentiment)}

                    <span className="text-xs text-muted-foreground">{news.source}</span>

                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getTimeDiff(news.timestamp)}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-foreground line-clamp-2">{news.title}</p>

                  {/* AI 요약 */}
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-chart-4 shrink-0" />
                    <span className="line-clamp-1">{news.aiSummary}</span>
                  </div>

                  {/* 관련 종목 + 원문 보기 */}
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                      {news.relatedStocks.length > 0 ? (
                        news.relatedStocks.slice(0, 3).map((stock) => (
                          <Link key={stock.ticker} href={`/stock/${stock.ticker}`}>
                            <Badge variant="outline" className="text-xs hover:bg-primary/10 cursor-pointer">
                              {stock.name}
                            </Badge>
                          </Link>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">관련 종목 없음</span>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-primary hover:text-primary shrink-0"
                      asChild
                    >
                      <a href={news.url} target="_blank" rel="noopener noreferrer">
                        원문
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {serverNews.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">뉴스를 불러오는 중...</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
