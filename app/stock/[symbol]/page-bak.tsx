"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Bell, Star, TrendingUp, TrendingDown, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAnomalies, useMarketState } from "@/lib/store"
import type { TooltipProps } from "recharts"
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  ComposedChart,
  Customized,
  Cell,
  Line,
  Legend,
} from "recharts"

import { NewsAnalysis } from "@/components/stock/news-analysis"
import { InvestorTrends } from "@/components/stock/investor-trends"
import { useDomesticStockPeriodPrices } from "@/domain/stock/queries/useDomesticStockPeriodPrices"

// ✅ 국내 MTS 스타일
const UP_COLOR = "#E11D48"
const DOWN_COLOR = "#2563EB"

const MA5_COLOR = "#F59E0B"
const MA20_COLOR = "#22C55E"
const MA60_COLOR = "#A855F7"
const MA120_COLOR = "#06B6D4"


// ✅ X축 라벨 컬러 (월/연도 구분)
const X_MONTH_COLOR = "hsl(var(--muted-foreground))"
const X_YEAR_COLOR = "hsl(var(--foreground))"

// ✅ 연도 변경 세로 라인
const YEAR_LINE_STROKE = "hsl(var(--border))"
const YEAR_LINE_OPACITY = 0.95
const YEAR_LINE_WIDTH = 1.6

function formatNumber(n: number | null | undefined, digits = 0) {
  if (n == null || !Number.isFinite(n)) return "-"
  return n.toLocaleString("ko-KR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
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

type Period = "D" | "W" | "M" | "Y"

type CandlePoint = {
  date: string // "20251226"
  open: number
  high: number
  low: number
  close: number
  volume: number

  prevClose?: number
  prevVolume?: number
  isUp?: boolean
  isVolUp?: boolean

  // ✅ 이동평균선
  ma5?: number | null
  ma20?: number | null
  ma60?: number | null
  ma120?: number | null
}

// ✅ 축 폰트
const AXIS_TICK_STYLE = { fontSize: 10, fill: "hsl(var(--muted-foreground))" }
const AXIS_TICK_MARGIN = 6

// ------------------------------
// ✅ X축 라벨 규칙
// - D/W: 월만 + 연도 바뀌면 YYYY
// - M: 연도만(변경 지점 + 마지막 강제)
// - Y: 5년 단위만 (year % 5 === 0) + 마지막 강제
// ------------------------------
function getXAxisLabel(data: CandlePoint[], idx: number, period: Period) {
  const cur = data[idx]
  if (!cur?.date || cur.date.length < 8) return { text: "", kind: "none" as const }

  const yyyy = cur.date.slice(0, 4)
  const mm = cur.date.slice(4, 6)
  const prev = idx > 0 ? data[idx - 1] : undefined
  const isLast = idx === data.length - 1

  // ✅ Year period: 5년 단위만
  if (period === "Y") {
    const yearNum = Number(yyyy)
    if (!Number.isFinite(yearNum)) return { text: "", kind: "none" as const }
    if (yearNum % 5 !== 0 && !isLast) return { text: "", kind: "none" as const }
    if (!prev) return { text: yyyy, kind: "year" as const }

    const prevYear = prev.date.slice(0, 4)
    const changed = yyyy !== prevYear

    if (isLast) return { text: yyyy, kind: "year" as const }
    return { text: changed && yearNum % 5 === 0 ? yyyy : "", kind: "year" as const }
  }

  // ✅ Month: 연도만
  if (period === "M") {
    if (!prev) return { text: yyyy, kind: "year" as const }
    const prevYear = prev.date.slice(0, 4)
    const show = yyyy !== prevYear
    return { text: show || isLast ? yyyy : "", kind: "year" as const }
  }

  // ✅ Day/Week: 월만, 연도 바뀌면 YYYY
  if (!prev) return { text: `${Number(mm)}월`, kind: "month" as const }

  const prevYear = prev.date.slice(0, 4)
  const prevMonth = prev.date.slice(4, 6)

  if (yyyy !== prevYear) return { text: yyyy, kind: "year" as const }
  if (mm !== prevMonth) return { text: `${Number(mm)}월`, kind: "month" as const }
  if (isLast) return { text: `${Number(mm)}월`, kind: "month" as const }

  return { text: "", kind: "none" as const }
}

function XAxisTick({ x, y, index, data, period }: any & { data: CandlePoint[]; period: Period }) {
  const i = typeof index === "number" ? index : 0
  const { text, kind } = getXAxisLabel(data, i, period)
  if (!text) return null

  const isYear = kind === "year"
  const fill = isYear ? X_YEAR_COLOR : X_MONTH_COLOR
  const fontSize = isYear ? 12 : 10
  const fontWeight = isYear ? 700 : 500

  return (
    <text x={x} y={y + 10} textAnchor="middle" fill={fill} fontSize={fontSize} fontWeight={fontWeight}>
      {text}
    </text>
  )
}

const formatYYYYMMDD = (label: unknown) => {
  const d = String(label ?? "")
  if (d.length !== 8) return d
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`
}

// ------------------------------
// ✅ 연도 변경 지점 가이드 (세로 라인 + 상단 큰 연도 텍스트)
// - ❌ Y 모드에서는 완전 비활성(요청사항)
// - ✅ formattedGraphicalItems 의존 제거 (Line/Bar 순서에 영향 안 받음)
// ------------------------------
function CustomizedYearGuides(props: any) {
  const { xAxisMap, offset, chartPeriod, data } = props as {
    xAxisMap: any
    offset: { top: number; height: number }
    chartPeriod: Period
    data: CandlePoint[]
  }

  if (chartPeriod === "Y") return null
  if (!data?.length || data.length < 2) return null

  const xAxisKey = Object.keys(xAxisMap ?? {})[0]
  const xAxis = xAxisMap?.[xAxisKey]
  const xScale = xAxis?.scale
  if (!xScale || !offset) return null

  const yearChangeDates: { date: string; year: string }[] = []
  for (let i = 1; i < data.length; i++) {
    const prevY = data[i - 1].date.slice(0, 4)
    const curY = data[i].date.slice(0, 4)
    if (prevY !== curY) yearChangeDates.push({ date: data[i].date, year: curY })
  }

  // 첫 해도 상단 표시(HTS 느낌)
  const firstYear = data[0]?.date?.slice(0, 4)
  if (firstYear) yearChangeDates.unshift({ date: data[0].date, year: firstYear })

  const top = offset.top
  const bottom = offset.top + offset.height

  return (
    <g>
      {yearChangeDates.map(({ date, year }, idx) => {
        const x0 = xScale(date)
        if (x0 == null) return null
        const band = typeof xScale?.bandwidth === "function" ? xScale.bandwidth() : 0
        const x = x0 + band / 2

        return (
          <g key={`yearguide-${year}-${idx}`}>
            <line
              x1={x}
              x2={x}
              y1={top}
              y2={bottom}
              stroke={YEAR_LINE_STROKE}
              strokeWidth={YEAR_LINE_WIDTH}
              opacity={YEAR_LINE_OPACITY}
            />
            <text
              x={x + 6}
              y={top + 16}
              textAnchor="start"
              fill="hsl(var(--foreground))"
              opacity={0.18}
              fontSize={18}
              fontWeight={800}
            >
              {year}
            </text>
          </g>
        )
      })}
    </g>
  )
}

// ------------------------------
// ✅ 캔들 커스텀(OHLC)
// 🔥 호버 봉 강조(두껍게/밝게) + 비호버 흐림
// - ✅ formattedGraphicalItems 의존 제거 (Line/Bar 순서에 영향 안 받음)
// ------------------------------
function CustomizedCandles(props: any) {
  const { xAxisMap, yAxisMap, bodyW = 12, hoverIndex, data } = props as {
    xAxisMap: any
    yAxisMap: any
    bodyW?: number
    hoverIndex?: number | null
    data: CandlePoint[]
  }

  if (!data?.length) return null

  const xAxisKey = Object.keys(xAxisMap ?? {})[0]
  const yAxisKey = Object.keys(yAxisMap ?? {})[0]
  const xAxis = xAxisMap?.[xAxisKey]
  const yAxis = yAxisMap?.[yAxisKey]
  if (!xAxis || !yAxis) return null

  const xScale = xAxis.scale
  const yScale = yAxis.scale
  const band = typeof xScale?.bandwidth === "function" ? xScale.bandwidth() : 0

  const step =
    band ||
    (data.length >= 2 ? Math.abs((xScale(data[1].date) ?? 0) - (xScale(data[0].date) ?? 0)) : 12)

  const w = Math.max(3, Math.min(bodyW, step * 0.9))

  return (
    <g style={{ pointerEvents: "none" }}>
      {data.map((d, idx) => {
        const x0 = xScale(d.date)
        if (x0 == null) return null

        const x = x0 + band / 2

        const up = d.close >= d.open
        const stroke = up ? UP_COLOR : DOWN_COLOR
        const fill = stroke

        const yOpen = yScale(d.open)
        const yClose = yScale(d.close)
        const yHigh = yScale(d.high)
        const yLow = yScale(d.low)
        if ([yOpen, yClose, yHigh, yLow].some((v) => v == null || Number.isNaN(v))) return null

        const top = Math.min(yOpen, yClose)
        const bottom = Math.max(yOpen, yClose)
        const bodyH = Math.max(2, bottom - top)

        const isHover = hoverIndex != null && hoverIndex === idx
        const dim = hoverIndex != null && !isHover

        const wickW = isHover ? 2 : 1
        const bodyStrokeW = isHover ? 2 : 1
        const opacity = dim ? 0.28 : 1

        return (
          <g key={d.date} opacity={opacity}>
            <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={stroke} strokeWidth={wickW} />
            <rect
              x={x - w / 2}
              y={top}
              width={w}
              height={bodyH}
              fill={fill}
              stroke={stroke}
              strokeWidth={bodyStrokeW}
              rx={2}
            />
          </g>
        )
      })}
    </g>
  )
}

// ------------------------------
// ✅ 범례(이평선) 커스텀
// ------------------------------
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

function StockCandleTooltip({ active, payload, label }: TooltipProps<any, any>) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload as CandlePoint | undefined
  if (!p) return null

  const up = p.close >= p.open
  const color = up ? UP_COLOR : DOWN_COLOR

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-medium text-foreground">{String(label ?? "")}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <span className="text-muted-foreground">시가</span>
        <span className="text-foreground">{p.open.toLocaleString()}</span>
        <span className="text-muted-foreground">고가</span>
        <span className="text-foreground">{p.high.toLocaleString()}</span>
        <span className="text-muted-foreground">저가</span>
        <span className="text-foreground">{p.low.toLocaleString()}</span>
        <span className="text-muted-foreground">종가</span>
        <span className="font-semibold" style={{ color }}>
          {p.close.toLocaleString()}
        </span>
        <span className="text-muted-foreground">거래량</span>
        <span className="text-foreground">{p.volume.toLocaleString()}</span>

        <span className="text-muted-foreground">MA5</span>
        <span className="text-foreground">{p.ma5 == null ? "-" : Math.round(p.ma5).toLocaleString()}</span>
        <span className="text-muted-foreground">MA20</span>
        <span className="text-foreground">{p.ma20 == null ? "-" : Math.round(p.ma20).toLocaleString()}</span>
        <span className="text-muted-foreground">MA60</span>
        <span className="text-foreground">{p.ma60 == null ? "-" : Math.round(p.ma60).toLocaleString()}</span>
        <span className="text-muted-foreground">MA120</span>
        <span className="text-foreground">{p.ma120 == null ? "-" : Math.round(p.ma120).toLocaleString()}</span>
      </div>
    </div>
  )
}

function VolumeTooltip({ active, payload, label }: TooltipProps<any, any>) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload as CandlePoint | undefined
  if (!p) return null

  const vol = p.volume ?? 0
  const prev = p.prevVolume
  const diff = prev == null ? null : vol - prev
  const diffPct = prev != null && prev > 0 ? (diff! / prev) * 100 : null

  const up = p.isUp ?? true
  const color = up ? UP_COLOR : DOWN_COLOR

  return (
    <div className="min-w-[210px] rounded-xl border border-border bg-card/95 backdrop-blur px-3 py-2 text-xs shadow-lg">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-foreground">{String(label ?? "")}</div>
        <span className="rounded-md bg-secondary/60 px-2 py-0.5 text-[11px] text-muted-foreground">거래량</span>
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">봉 거래량</span>
          <span className="font-semibold" style={{ color }}>
            {vol.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">전봉 대비</span>
          <span style={{ color }}>
            {diff == null
              ? "-"
              : `${diff >= 0 ? "+" : ""}${diff.toLocaleString()}${
                diffPct == null ? "" : ` (${diffPct.toFixed(2)}%)`
              }`}
          </span>
        </div>

        <div className="mt-2 h-px w-full bg-border" />

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">종가</span>
          <span className="text-foreground font-medium">{p.close?.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
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

export default function StockDetailPage() {
  const params = useParams()
  const symbol = params.symbol as string

  const { market } = useMarketState()
  const { anomalies } = useAnomalies(market)

  const [isFavorite, setIsFavorite] = useState(false)
  const [chartPeriod, setChartPeriod] = useState<Period>("D")

  // 🔥 호버 index(캔들+거래량 동시 강조)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

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
      market: "KRX",
      sector: "-",
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

    // 누적 거래량 -> 봉별 거래량
    for (let i = 1; i < mapped.length; i++) {
      const prev = mapped[i - 1].volume
      const cur = mapped[i].volume
      const diff = cur - prev
      mapped[i].volume = diff >= 0 ? diff : cur
    }

    // 전봉 대비 계산
    for (let i = 0; i < mapped.length; i++) {
      const prevClose = i > 0 ? mapped[i - 1].close : undefined
      const prevVolume = i > 0 ? mapped[i - 1].volume : undefined
      mapped[i].prevClose = prevClose
      mapped[i].prevVolume = prevVolume
      mapped[i].isUp = prevClose == null ? true : mapped[i].close >= prevClose
      mapped[i].isVolUp = prevVolume == null ? true : mapped[i].volume >= prevVolume
    }

    // ✅ date 중복 제거(월/년 집계에서 안전장치)
    const m = new Map<string, CandlePoint>()
    for (const row of mapped) m.set(row.date, row)
    const unique = Array.from(m.values()).sort((a, b) => a.date.localeCompare(b.date))

    // 🔥 이동평균선 계산
    const closes = unique.map((d) => d.close)
    const ma5 = rollingMA(closes, 5)
    const ma20 = rollingMA(closes, 20)
    const ma60 = rollingMA(closes, 60)
    const ma120 = rollingMA(closes, 120)

    return unique.map((d, i) => ({
      ...d,
      ma5: ma5[i],
      ma20: ma20[i],
      ma60: ma60[i],
      ma120: ma120[i],
    }))
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

  // ✅ 데이터 개수에 맞춰 barSize 자동
  const candleBarSize = useMemo(() => {
    const n = priceHistory.length || 1
    return Math.max(4, Math.min(18, Math.floor(520 / n)))
  }, [priceHistory.length])

  // ✅ M/Y 모드에서 “미래 여백” 느낌 (오른쪽 padding)
  const rightPad = chartPeriod === "M" || chartPeriod === "Y" ? 56 : 0
  const CHART_MARGIN = { top: 26, right: chartPeriod === "M" || chartPeriod === "Y" ? 26 : 10, left: 14, bottom: 0 }

  const YAXIS_W = 72
  const SYNC_ID = `stock-${symbol}`
  const CHART_KEY = `${symbol}-${chartPeriod}`

  const onMove = (st: any) => {
    const i = st?.activeTooltipIndex
    setHoverIndex(typeof i === "number" ? i : null)
  }
  const onLeave = () => setHoverIndex(null)

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{stock.name}</h1>
                  <Badge variant="secondary">{stock.ticker}</Badge>

                  {isLoading ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      불러오는 중
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      업데이트 {dataUpdatedAt ? new Date(dataUpdatedAt).toTimeString().slice(0, 8) : "-"}
                    </Badge>
                  )}

                  <Badge variant="outline">{stock.market}</Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  {stock.sector}
                  {" · "}거래대금 {formatKoreanMoney(snapshot.accumulatedTradeAmount)}
                  {" · "}회전율 {formatNumber(snapshot.turnoverRate, 2)}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsFavorite(!isFavorite)}>
                <Star className={cn("h-5 w-5", isFavorite && "fill-chart-4 text-chart-4")} />
              </Button>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <span className="text-4xl font-bold text-foreground">{formatNumber(stock.price, 0)}원</span>
                    <div className={cn("flex items-center gap-2 mt-2 text-lg font-medium", isPositive ? "text-chart-1" : "text-chart-2")}>
                      {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                      {isPositive ? "+" : ""}
                      {formatNumber(stock.change, 0)} ({isPositive ? "+" : ""}
                      {formatNumber(stock.changePercent, 2)}%)
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-md bg-secondary/60 px-2 py-1">
                        오늘 위치{" "}
                        <span className="text-foreground font-medium">{todayPos == null ? "-" : `${Math.round(todayPos)}%`}</span>
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

                <div className="flex gap-1 mb-4">
                  {(["D", "W", "M", "Y"] as const).map((period) => (
                    <Button key={period} variant={chartPeriod === period ? "default" : "ghost"} size="sm" onClick={() => setChartPeriod(period)}>
                      {period === "D" ? "1일" : period === "W" ? "1주" : period === "M" ? "1개월" : "1년"}
                    </Button>
                  ))}
                </div>

                <div className="h-[350px] overflow-hidden">
                  <ResponsiveContainer width="100%" height="75%" key={`candle-${CHART_KEY}`}>
                    <ComposedChart
                      key={`candle-chart-${CHART_KEY}`}
                      data={priceHistory}
                      syncId={SYNC_ID}
                      syncMethod="index"
                      margin={CHART_MARGIN}
                      barCategoryGap={0}
                      barGap={0}
                      onMouseMove={onMove}
                      onMouseLeave={onLeave}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

                      <Customized component={(p: any) => <CustomizedYearGuides {...p} chartPeriod={chartPeriod} data={priceHistory} />} />


                      <XAxis
                        dataKey="date"
                        type="category"
                        allowDuplicatedCategory={false}
                        tickLine={false}
                        padding={{ left: 0, right: rightPad }}
                        interval={0}
                        minTickGap={0}
                        tickMargin={AXIS_TICK_MARGIN}
                        tick={(p: any) => <XAxisTick {...p} data={priceHistory} period={chartPeriod} />}
                      />

                      <YAxis
                        width={YAXIS_W}
                        tickMargin={AXIS_TICK_MARGIN}
                        tick={AXIS_TICK_STYLE}
                        padding={{ top: 18, bottom: 10 }}
                        domain={[(dataMin: number) => dataMin * 0.995, (dataMax: number) => dataMax * 1.02]}
                        tickFormatter={(v) => Number(v).toLocaleString("ko-KR")}
                      />

                      <Tooltip
                        content={<StockCandleTooltip />}
                        labelFormatter={formatYYYYMMDD}
                        cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, opacity: 0.55 }}
                      />

                      {/* ✅ 더미 Bar: 캔들 폭/정렬 기준 (라인/캔들 위에 안 보여도 됨) */}
                      <Bar
                        dataKey="close"
                        fill="rgba(0,0,0,0.001)"
                        stroke="rgba(0,0,0,0.001)"
                        isAnimationActive={false}
                        barSize={candleBarSize}
                      />

                      {/* ✅ 캔들 먼저 그리기 */}
                      <Customized component={(p: any) => <CustomizedCandles {...p} data={priceHistory} bodyW={candleBarSize} hoverIndex={hoverIndex} />} />

                      {/* ✅ MA 라인을 "캔들 위"로 올리기 */}
                      <Line
                        dataKey="ma5"
                        type="monotone"
                        dot={false}
                        stroke={MA5_COLOR}
                        strokeWidth={1.4}
                        isAnimationActive={false}
                        connectNulls
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Line
                        dataKey="ma20"
                        type="monotone"
                        dot={false}
                        stroke={MA20_COLOR}
                        strokeWidth={1.4}
                        isAnimationActive={false}
                        connectNulls
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Line
                        dataKey="ma60"
                        type="monotone"
                        dot={false}
                        stroke={MA60_COLOR}
                        strokeWidth={1.4}
                        isAnimationActive={false}
                        connectNulls
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Line
                        dataKey="ma120"
                        type="monotone"
                        dot={false}
                        stroke={MA120_COLOR}
                        strokeWidth={1.4}
                        isAnimationActive={false}
                        connectNulls
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </ComposedChart>

                  </ResponsiveContainer>

                  <ResponsiveContainer width="100%" height="25%" key={`vol-${CHART_KEY}`}>
                    <BarChart
                      key={`vol-chart-${CHART_KEY}`}
                      data={priceHistory}
                      syncId={SYNC_ID}
                      syncMethod="index"
                      margin={CHART_MARGIN}
                      barCategoryGap={0}
                      barGap={0}
                      onMouseMove={onMove}
                      onMouseLeave={onLeave}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

                      <Customized component={(p: any) => <CustomizedYearGuides {...p} chartPeriod={chartPeriod} data={priceHistory} />} />

                      <XAxis dataKey="date" type="category" hide allowDuplicatedCategory={false} padding={{ left: 0, right: rightPad }} />

                      <YAxis width={YAXIS_W} tickMargin={AXIS_TICK_MARGIN} tick={AXIS_TICK_STYLE} tickFormatter={(v) => formatCompact(Number(v))} />

                      <Tooltip
                        content={<VolumeTooltip />}
                        labelFormatter={formatYYYYMMDD}
                        cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, opacity: 0.55 }}
                      />

                      <Bar dataKey="volume" radius={[2, 2, 0, 0]} isAnimationActive={false} barSize={candleBarSize}>
                        {priceHistory.map((d, idx) => {
                          const up = d.isUp ?? true
                          const isHover = hoverIndex != null && hoverIndex === idx
                          const dim = hoverIndex != null && !isHover

                          return (
                            <Cell key={d.date ?? idx} fill={up ? UP_COLOR : DOWN_COLOR} opacity={dim ? 0.25 : isHover ? 0.95 : 0.55} />
                          )
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* ✅ MA 범례를 차트 아래로 */}
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
                    <span className="text-foreground font-medium">{dataUpdatedAt ? new Date(dataUpdatedAt).toTimeString().slice(0, 8) : "-"}</span>
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
