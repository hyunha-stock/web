"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Zap, TrendingUp, TrendingDown, Minus, ExternalLink, Sparkles, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRealtimeNews } from "@/domain/stock/queries/useRealtimeNews"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// =========================
// Server DTO
// =========================
export type RealtimeNewsDto = {
  newsId: string
  title: string
  description: string
  source: string
  url: string
  crawledAt: Date | string
}

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

const toEpochMs = (d: Date | string): number => {
  if (d instanceof Date) return d.getTime()
  const t = Date.parse(d)
  return Number.isFinite(t) ? t : Date.now()
}

const truncate70 = (s: string, max = 70) => {
  const text = (s ?? "").trim()
  if (!text) return ""
  return text.length > max ? `${text.slice(0, max)}…` : text
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

const getTimeDiff = (nowMs: number, timestamp: number) => {
  const diff = nowMs - timestamp
  const minutes = Math.floor(diff / 1000 / 60)
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
        <Badge variant="outline" className="border-red-500/50 text-red-500 text-[11px] px-1.5 py-0">
          호재
        </Badge>
      )
    case "negative":
      return (
        <Badge variant="outline" className="border-blue-500/50 text-blue-500 text-[11px] px-1.5 py-0">
          악재
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground text-[11px] px-1.5 py-0">
          중립
        </Badge>
      )
  }
}

const mapDtoToUi = (dto: RealtimeNewsDto): RealtimeNewsUi => {
  const sentiment = guessSentiment(dto.title, dto.description)
  const category = guessCategory(dto.title, dto.description)
  return {
    id: dto.newsId,
    title: dto.title,
    source: dto.source,
    timestamp: toEpochMs(dto.crawledAt),
    sentiment,
    relatedStocks: [],
    aiSummary: dto.description || "요약 준비 중",
    category,
    isBreaking: isBreakingByText(dto.title),
    url: dto.url,
  }
}

export function RealtimeNews() {
  const { data } = useRealtimeNews()
  const safeData: RealtimeNewsDto[] = Array.isArray(data) ? (data as any) : []

  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const serverNews: RealtimeNewsUi[] = useMemo(() => {
    return safeData.map(mapDtoToUi).sort((a, b) => b.timestamp - a.timestamp)
  }, [safeData])

  return (
    <div className="min-w-0">
      {/* 헤더 */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="h-4 w-4 text-chart-4 shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">실시간 뉴스</h3>
          <Badge variant="secondary" className="animate-pulse bg-red-500/20 text-red-500 text-[11px]">
            LIVE
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground shrink-0">
          {serverNews.length.toLocaleString("ko-KR")}건
        </div>
      </div>

      {/* ✅ border 제거 */}
      <div className="bg-background">
        <div className="max-h-[520px] overflow-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-10 bg-background w-[44px] px-2 py-2" />
                <TableHead className="sticky top-0 z-10 bg-background w-[88px] px-2 py-2">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    시간
                  </span>
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-background w-[210px] px-2 py-2">
                  분류
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-background px-2 py-2">
                  제목 / 요약
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-background w-[220px] px-2 py-2 hidden md:table-cell">
                  관련 종목
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-background w-[70px] px-2 py-2 text-right">
                  원문
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {serverNews.map((news) => (
                <TableRow
                  key={news.id}
                  className={cn("hover:bg-muted/40", news.isBreaking && "bg-chart-4/5")}
                >
                  <TableCell className="px-2 py-2 align-top">{getSentimentIcon(news.sentiment)}</TableCell>

                  <TableCell className="px-2 py-2 align-top text-muted-foreground whitespace-nowrap">
                    {getTimeDiff(nowMs, news.timestamp)}
                  </TableCell>

                  <TableCell className="px-2 py-2 align-top">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {news.isBreaking && (
                        <Badge className="bg-chart-4 text-white text-[11px] px-1.5 py-0 animate-pulse">
                          속보
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                        {news.category}
                      </Badge>
                      {getSentimentBadge(news.sentiment)}
                      <span className="text-[11px] text-muted-foreground ml-1 truncate max-w-[120px]">
                        {news.source}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="px-2 py-2 align-top">
                    <div className="min-w-0">
                      {/* ✅ 제목 70자 컷 */}
                      <div
                        className="text-sm font-medium leading-snug line-clamp-1"
                        title={news.title}
                      >
                        {truncate70(news.title, 70)}
                      </div>

                      {/* ✅ 요약 70자 컷 */}
                      <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                        <Sparkles className="h-3 w-3 text-chart-4 shrink-0" />
                        <span
                          className="line-clamp-1"
                          title={news.aiSummary}
                        >
                          {truncate70(news.aiSummary, 70)}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="px-2 py-2 align-top hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {news.relatedStocks.length > 0 ? (
                        news.relatedStocks.slice(0, 4).map((stock) => (
                          <Link key={stock.ticker} href={`/stock/${stock.ticker}`}>
                            <Badge
                              variant="outline"
                              className="text-[11px] px-1.5 py-0 hover:bg-primary/10 cursor-pointer"
                            >
                              {stock.name}
                            </Badge>
                          </Link>
                        ))
                      ) : (
                        <span className="text-[11px] text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="px-2 py-2 align-top text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
                      asChild
                    >
                      <a href={news.url} target="_blank" rel="noopener noreferrer">
                        <span className="hidden sm:inline">원문</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {serverNews.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    뉴스 불러오는 중...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
