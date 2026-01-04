"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Star, TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAnomalies, useMarketState } from "@/lib/store"

import { NewsAnalysis } from "@/components/stock/news-analysis"
import { InvestorTrends } from "@/components/stock/investor-trends"
import { useDomesticStockPeriodPrices } from "@/domain/stock/queries/useDomesticStockPeriodPrices"
import LightweightStockChart from "@/components/stock/light-weight-stock-chart"

type Period = "D" | "W" | "M" | "Y"

type CandlePoint = {
  date: string // "20251226"
  open: number
  high: number
  low: number
  close: number
  volume: number
  ma5?: number | null
  ma20?: number | null
  ma60?: number | null
  ma120?: number | null
}

const MA5_COLOR = "#F59E0B"
const MA20_COLOR = "#22C55E"
const MA60_COLOR = "#A855F7"
const MA120_COLOR = "#06B6D4"

function formatNumber(n: number | null | undefined, digits = 0) {
  if (n == null || !Number.isFinite(n)) return "-"
  return n.toLocaleString("ko-KR", { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function formatCompact(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "-"
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString("ko-KR")
}

function formatKoreanMoney(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "-"
  const abs = Math.abs(n)
  const JO = 1_000_000_000_000
  const EOK = 100_000_000
  const MAN = 10_000
  if (abs >= JO) return `${(n / JO).toFixed(2)}조`
  if (abs >= EOK) return `${(n / EOK).toFixed(1)}억`
  if (abs >= MAN) return `${(n / MAN).toFixed(1)}만`
  return n.toLocaleString("ko-KR")
}

function calcTodayPosition(current: number | null, low: number | null, high: number | null) {
  if (current == null || low == null || high == null) return null
  if (!Number.isFinite(current) || !Number.isFinite(low) || !Number.isFinite(high)) return null
  if (high <= low) return null
  const p = ((current - low) / (high - low)) * 100
  return Math.max(0, Math.min(100, p))
}

const toNum = (v: unknown) => {
  if (v == null) return 0
  if (typeof v === "number") return Number.isFinite(v) ? v : 0
  const n = Number(String(v).replaceAll(",", "").trim())
  return Number.isFinite(n) ? n : 0
}

function rollingMA(values: number[], window: number) {
  const out: (number | null)[] = Array(values.length).fill(null)
  if (window <= 1) return values.map((v) => v)
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= window) sum -= values[i - window]
    if (i >= window - 1) out[i] = sum / window
  }
  return out
}

function MovingAverageLegend() {
  const items = [
    { key: "ma5", label: "MA5", color: MA5_COLOR },
    { key: "ma20", label: "MA20", color: MA20_COLOR },
    { key: "ma60", label: "MA60", color: MA60_COLOR },
    { key: "ma120", label: "MA120", color: MA120_COLOR },
  ]
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
      {items.map((it) => (
        <div key={it.key} className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: it.color }} />
          <span className="font-medium">{it.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function StockDetailPage() {
  const params = useParams()
  const symbol = params.symbol as string

  const { market } = useMarketState()
  const { anomalies } = useAnomalies(market)

  const [isFavorite, setIsFavorite] = useState(false)
  const [chartPeriod, setChartPeriod] = useState<Period>("D")

  const { data, isLoading, isError, error, dataUpdatedAt, refetch } = useDomesticStockPeriodPrices({
    symbol,
    periodType: chartPeriod,
  })

  const snapshot = (data as any)?.snapshot ?? null
  const prices = (data as any)?.prices ?? []

  const stock = useMemo(() => {
    const s = snapshot
    return {
      name: s?.stockName ?? "종목",
      ticker: s?.shortStockCode ?? symbol,
      market: s?.marketName ?? "KRX",
      sector: s?.sectorName ?? "-",
      price: s?.currentPrice ?? 0,
      change: s?.changeFromPrevDay ?? 0,
      changePercent: s?.changeRate ?? 0,
      open: s?.openPrice ?? 0,
      high: s?.highPrice ?? 0,
      low: s?.lowPrice ?? 0,
      prevClose: s?.prevClosePrice ?? 0,
      marketCap: s?.marketCap != null ? formatKoreanMoney(s.marketCap) : "-",
      volume: s?.accumulatedVolume ?? 0,
    }
  }, [snapshot, symbol])

  const priceHistory = useMemo<CandlePoint[]>(() => {
    if (!prices.length) return []

    const asc = [...prices].reverse()
    const mapped: CandlePoint[] = asc
      .map((p: any) => {
        const d = String(p.businessDate ?? p.stck_bsop_date ?? "")
        if (!d || d.length !== 8) return null
        return {
          date: d,
          open: toNum(p.openPrice ?? p.stck_oprc),
          high: toNum(p.highPrice ?? p.stck_hgpr),
          low: toNum(p.lowPrice ?? p.stck_lwpr),
          close: toNum(p.closePrice ?? p.stck_clpr),
          volume: toNum(p.accumulatedVolume ?? p.acml_vol),
        } as CandlePoint
      })
      .filter(Boolean) as CandlePoint[]

    // 누적 거래량 -> 봉별 거래량(안전)
    for (let i = 1; i < mapped.length; i++) {
      const prev = mapped[i - 1].volume
      const cur = mapped[i].volume
      const diff = cur - prev
      mapped[i].volume = diff >= 0 ? diff : cur
    }

    // date 중복 제거
    const m = new Map<string, CandlePoint>()
    for (const row of mapped) m.set(row.date, row)
    const unique = Array.from(m.values()).sort((a, b) => a.date.localeCompare(b.date))

    // MA 계산
    const closes = unique.map((d) => d.close)
    const ma5 = rollingMA(closes, 5)
    const ma20 = rollingMA(closes, 20)
    const ma60 = rollingMA(closes, 60)
    const ma120 = rollingMA(closes, 120)

    return unique.map((d, i) => ({ ...d, ma5: ma5[i], ma20: ma20[i], ma60: ma60[i], ma120: ma120[i] }))
  }, [prices])

  const stockAnomalies = useMemo(
    () => (anomalies ?? []).filter((a) => a.ticker === symbol).slice(0, 5),
    [anomalies, symbol],
  )

  const isPositive = (snapshot?.changeRate ?? 0) >= 0
  const todayPos = calcTodayPosition(snapshot?.currentPrice ?? null, snapshot?.lowPrice ?? null, snapshot?.highPrice ?? null)

  const spread = snapshot?.askPrice != null && snapshot?.bidPrice != null ? snapshot.askPrice - snapshot.bidPrice : null
  const spreadPct =
    spread != null && snapshot?.currentPrice != null && snapshot.currentPrice > 0 ? (spread / snapshot.currentPrice) * 100 : null

  const financialMetrics = useMemo(
    () => [
      { label: "PER", value: snapshot?.per != null ? `${Number(snapshot.per).toFixed(2)}배` : "-" },
      { label: "PBR", value: snapshot?.pbr != null ? `${Number(snapshot.pbr).toFixed(2)}배` : "-" },
      { label: "EPS", value: snapshot?.eps != null ? `${Number(snapshot.eps).toLocaleString()}원` : "-" },
      { label: "상장주식수", value: snapshot?.listedShares != null ? formatCompact(snapshot.listedShares) : "-" },
      { label: "액면가", value: snapshot?.faceValue != null ? `${formatNumber(snapshot.faceValue, 0)}원` : "-" },
      { label: "자본금", value: snapshot?.capitalAmount != null ? formatKoreanMoney(snapshot.capitalAmount) : "-" },
      { label: "융자잔고비율", value: snapshot?.marginLoanRate != null ? `${formatNumber(snapshot.marginLoanRate, 2)}%` : "-" },
      { label: "회전율", value: snapshot?.turnoverRate != null ? `${formatNumber(snapshot.turnoverRate, 2)}%` : "-" },
    ],
    [snapshot],
  )

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 overflow-x-hidden">
        <Card className="w-full max-w-lg bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-destructive">시세 데이터를 불러오지 못했어요.</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground break-words">{String((error as any)?.message ?? "")}</p>
            <div className="flex gap-2">
              <Button onClick={() => refetch()}>다시 시도</Button>
              <Link href="/">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  홈으로
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data || !snapshot) return null

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ✅ 헤더 2줄: 1) 종목/코드  2) 시장/업데이트 */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>

              <div className="min-w-0">
                {/* 1줄: 종목명 + 종목코드 */}
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="truncate text-lg sm:text-xl font-bold text-foreground">{stock.name}</h1>
                  <Badge variant="secondary" className="shrink-0">
                    {stock.ticker}
                  </Badge>
                </div>

                {/* 2줄: 시장 + 업데이트 */}
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="h-5 px-2 text-[11px]">
                    {stock.market}
                  </Badge>

                  {isLoading ? (
                    <span className="truncate">불러오는 중</span>
                  ) : (
                    <span className="truncate">
                      업데이트 {dataUpdatedAt ? new Date(dataUpdatedAt).toTimeString().slice(0, 8) : "-"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={() => setIsFavorite(!isFavorite)}>
              <Star className={cn("h-5 w-5", isFavorite && "fill-chart-4 text-chart-4")} />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <span className="text-4xl font-bold text-foreground">{formatNumber(stock.price, 0)}원</span>
                    <div
                      className={cn(
                        "flex items-center gap-2 mt-2 text-lg font-medium",
                        isPositive ? "text-chart-1" : "text-chart-2",
                      )}
                    >
                      {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                      {isPositive ? "+" : ""}
                      {formatNumber(stock.change, 0)} ({isPositive ? "+" : ""}
                      {formatNumber(stock.changePercent, 2)}%)
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-md bg-secondary/60 px-2 py-1">
                        오늘 위치 <span className="text-foreground font-medium">{todayPos == null ? "-" : `${Math.round(todayPos)}%`}</span>
                      </span>
                      <span className="rounded-md bg-secondary/60 px-2 py-1">
                        매수/매도 {formatNumber(snapshot.bidPrice, 0)} / {formatNumber(snapshot.askPrice, 0)}
                      </span>
                      <span className="rounded-md bg-secondary/60 px-2 py-1">
                        스프레드{" "}
                        <span className="text-foreground font-medium">
                          {spread == null ? "-" : `${formatNumber(spread, 0)}원`}
                          {spreadPct == null ? "" : ` (${formatNumber(spreadPct, 2)}%)`}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-sm text-muted-foreground">
                    <p>시가총액 {stock.marketCap}</p>
                    <p>거래량 {formatCompact(stock.volume)}</p>
                    <p className="mt-1">
                      전일대비 거래량 <span className="text-foreground font-medium">{formatCompact(snapshot.changeVolumeFromPrevDay)}</span>
                    </p>
                  </div>
                </div>

                {/* ✅ 헤더에서 내려온 정보는 카드로 */}
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Card className="bg-secondary/40 border-border">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">섹터</p>
                      <p className="text-base font-bold text-foreground truncate">{stock.sector}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/40 border-border">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">거래대금</p>
                      <p className="text-base font-bold text-foreground">{formatKoreanMoney(snapshot.accumulatedTradeAmount)}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/40 border-border">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">회전율</p>
                      <p className="text-base font-bold text-foreground">{formatNumber(snapshot.turnoverRate, 2)}%</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-1 mb-4">
                  {(["D", "W", "M", "Y"] as const).map((p) => (
                    <Button key={p} variant={chartPeriod === p ? "default" : "ghost"} size="sm" onClick={() => setChartPeriod(p)}>
                      {p === "D" ? "1일" : p === "W" ? "1주" : p === "M" ? "1개월" : "1년"}
                    </Button>
                  ))}
                </div>

                <div className="h-[350px] overflow-hidden">
                  <LightweightStockChart
                    data={priceHistory}
                    period={chartPeriod}
                    height={350}
                    refLines={{
                      prevClose: snapshot?.prevClosePrice ?? null,
                      dayHigh: snapshot?.highPrice ?? null,
                      dayLow: snapshot?.lowPrice ?? null,
                    }}
                  />
                </div>

                <div className="mt-2 flex justify-end">
                  <MovingAverageLegend />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">시가</p>
                  <p className="text-xl font-bold text-foreground">{formatNumber(stock.open, 0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">고가</p>
                  <p className="text-xl font-bold text-foreground">{formatNumber(stock.high, 0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">저가</p>
                  <p className="text-xl font-bold text-foreground">{formatNumber(stock.low, 0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">전일 종가</p>
                  <p className="text-xl font-bold text-foreground">{formatNumber(stock.prevClose, 0)}</p>
                </CardContent>
              </Card>
            </div>

            <InvestorTrends />

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">재무정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {financialMetrics.map((metric) => (
                    <div key={metric.label} className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                      <p className="text-lg font-bold text-foreground">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6 max-h-[calc(100vh-6rem)] overflow-y-auto pb-6">
              <NewsAnalysis stockName={stock.name} />

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">최근 이상징후</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stockAnomalies.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">최근 감지된 이상징후가 없습니다</p>
                  ) : (
                    stockAnomalies.map((anomaly) => (
                      <div key={anomaly.id} className="p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex items-center justify-between mb-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              anomaly.severity === "high"
                                ? "border-chart-2/30 text-chart-2"
                                : anomaly.severity === "medium"
                                  ? "border-chart-4/30 text-chart-4"
                                  : "border-chart-1/30 text-chart-1",
                            )}
                          >
                            {anomaly.type === "surge"
                              ? "급등"
                              : anomaly.type === "plunge"
                                ? "급락"
                                : anomaly.type === "volume"
                                  ? "거래량"
                                  : "변동성"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{anomaly.time}</span>
                        </div>
                        <p className="text-sm text-foreground">{anomaly.description}</p>
                        <p
                          className={cn(
                            "text-sm font-bold mt-1",
                            anomaly.type === "surge" || anomaly.type === "volume" ? "text-chart-1" : "text-chart-2",
                          )}
                        >
                          {anomaly.value}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">데이터 상태</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">조회 주기</span>
                    <span className="text-foreground font-medium">페이지 진입/기간 변경 시</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">마지막 업데이트</span>
                    <span className="text-foreground font-medium">
                      {dataUpdatedAt ? new Date(dataUpdatedAt).toTimeString().slice(0, 8) : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">응답 코드</span>
                    <span className="text-foreground font-medium">{(data as any).resultCode ?? "-"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">메시지</span>
                    <span className="text-foreground font-medium truncate max-w-[180px]">{(data as any).message ?? "-"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
