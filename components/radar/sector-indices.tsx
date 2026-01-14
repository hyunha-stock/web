"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, ArrowDownUp, Coins, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIndustryIndexItem } from "@/domain/stock/queries/useIndustryIndexItem"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"

type SortKey = "changeRate" | "tradeAmountRatio" | "accumulatedTradeAmount"

function formatNumber(n: number) {
  return n.toLocaleString("ko-KR")
}

function formatCompact(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return formatNumber(n)
}

function formatKoreanMoney(n: number) {
  const abs = Math.abs(n)
  const JO = 1_0000_0000_0000
  const EOK = 100_000_000
  if (abs >= JO) return `${(n / JO).toFixed(1)}조`
  if (abs >= EOK) return `${(n / EOK).toFixed(1)}억`
  return formatNumber(n)
}

export function SectorIndices() {
  const { data, isLoading, isError } = useIndustryIndexItem()
  const [sortKey, setSortKey] = useState<SortKey>("changeRate")

  const [api, setApi] = useState<CarouselApi | null>(null)
  const [paused, setPaused] = useState(false)

  const sorted = useMemo(() => {
    const arr = [...(data ?? [])]
    if (sortKey === "changeRate") return arr.sort((a, b) => b.changeRate - a.changeRate)
    if (sortKey === "tradeAmountRatio") return arr.sort((a, b) => b.tradeAmountRatio - a.tradeAmountRatio)
    return arr.sort((a, b) => b.accumulatedTradeAmount - a.accumulatedTradeAmount)
  }, [data, sortKey])

  const maxTradeAmountRatio = useMemo(() => {
    return Math.max(1, ...sorted.map((x) => x.tradeAmountRatio))
  }, [sorted])

  // ✅ 정렬 바뀌면 첫 카드로
  useEffect(() => {
    if (!api) return
    api.reInit()
    api.scrollTo(0)
  }, [api, sortKey])

  // ✅ 데이터 갱신되어도 첫 카드로
  useEffect(() => {
    if (!api) return
    api.reInit()
    api.scrollTo(0)
  }, [api, sorted.length])

  // ✅ 자동 슬라이드 (이동 단위 강제 없음)
  useEffect(() => {
    if (!api) return
    if (paused) return
    const id = window.setInterval(() => api.scrollNext(), 4000)
    return () => window.clearInterval(id)
  }, [api, paused])

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="w-full max-w-full overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex gap-3 flex-row items-center justify-between min-w-0">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2 min-w-0">
              <TrendingUp className="h-5 w-5 text-primary shrink-0" />
              <span className="truncate">업종별 지수</span>
            </CardTitle>

            <div className="flex items-center gap-1 rounded-lg bg-secondary p-1 sm:w-auto min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
              <button
                onClick={() => setSortKey("changeRate")}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                  sortKey === "changeRate"
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={sortKey === "changeRate"}
              >
                <ArrowDownUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">등락률</span>
              </button>

              <button
                onClick={() => setSortKey("tradeAmountRatio")}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                  sortKey === "tradeAmountRatio"
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={sortKey === "tradeAmountRatio"}
              >
                <Coins className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">자금쏠림</span>
              </button>

              <button
                onClick={() => setSortKey("accumulatedTradeAmount")}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                  sortKey === "accumulatedTradeAmount"
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={sortKey === "accumulatedTradeAmount"}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">거래대금</span>
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="max-w-full overflow-hidden">
          {isLoading && <div className="text-sm text-muted-foreground">불러오는 중…</div>}
          {isError && <div className="text-sm text-destructive">업종 지수를 불러오지 못했어요.</div>}
          {!isLoading && !isError && sorted.length === 0 && (
            <div className="text-sm text-muted-foreground">표시할 데이터가 없어요.</div>
          )}

          {!isLoading && !isError && sorted.length > 0 && (
            <div
              className="relative max-w-full min-w-0 overflow-hidden"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <Carousel
                setApi={setApi}
                // ✅ n장 보이게 강제하는 옵션 제거 (slidesToScroll 없음)
                opts={{ align: "start", loop: true, skipSnaps: false }}
                className="w-full max-w-full min-w-0 overflow-hidden"
              >
                <CarouselContent className="-ml-2 sm:-ml-3 min-w-0 max-w-full">
                  {sorted.map((item) => {
                    const isPositive = item.changeRate > 0
                    const isNeutral = item.changeRate === 0

                    const shareWidth = Math.max(
                      0,
                      Math.min(100, (item.tradeAmountRatio / maxTradeAmountRatio) * 100),
                    )

                    const toneBorder = isPositive
                      ? "border-red-500/25 bg-red-500/5"
                      : !isNeutral
                        ? "border-blue-500/25 bg-blue-500/5"
                        : "border-border bg-muted/25"

                    const toneText = isPositive
                      ? "text-red-500"
                      : !isNeutral
                        ? "text-blue-500"
                        : "text-muted-foreground"

                    return (
                      <CarouselItem
                        key={item.industryCode}
                        // ✅ 핵심: basis 고정 삭제 → 화면에 따라 “자연스럽게” 몇 장이든 보임
                        className="pl-2 sm:pl-3 basis-auto min-w-0"
                      >
                        {/* ✅ 카드 폭만 px로 주고, flex 0 0 auto로 자연 스크롤 */}
                        <div
                          className={cn(
                            "rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 overflow-hidden",
                            // ✅ mobile 유지(220px), ✅ sm 이상 대폭 축소
                            "w-[220px] max-w-[78vw] sm:w-[180px] md:w-[190px] lg:w-[200px] xl:w-[220px]",
                            toneBorder,
                          )}
                          title={`${item.industryName} (${item.industryCode})`}
                        >

                        {/* 모바일 초컴팩트 */}
                          <div className="block sm:hidden p-2">
                            <div className="flex items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-foreground truncate">
                                  {item.industryName}
                                </div>
                                <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
                                  {item.industryCode}
                                </div>
                              </div>

                              <div
                                className={cn(
                                  "shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold tabular-nums whitespace-nowrap",
                                  isPositive && "bg-red-500/10 text-red-500",
                                  !isPositive && !isNeutral && "bg-blue-500/10 text-blue-500",
                                  isNeutral && "bg-muted text-muted-foreground",
                                )}
                              >
                                {isPositive ? "+" : ""}
                                {item.changeRate.toFixed(2)}%
                              </div>
                            </div>

                            <div className="mt-1.5 flex items-end justify-between gap-2 min-w-0">
                              <div className="text-base font-bold text-foreground tabular-nums whitespace-nowrap">
                                {Math.round(item.currentIndexPrice).toLocaleString()}
                              </div>

                              <div className={cn("text-[11px] font-medium tabular-nums whitespace-nowrap", toneText)}>
                                {item.changeFromPreviousDay >= 0 ? "▲" : "▼"}
                                {Math.abs(item.changeFromPreviousDay).toFixed(2)}
                              </div>
                            </div>

                            <div className="mt-1.5">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>자금</span>
                                <span className="tabular-nums whitespace-nowrap">
                                  {item.tradeAmountRatio.toFixed(1)}%
                                </span>
                              </div>
                              <div className="mt-1 h-1 w-full rounded bg-secondary overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full",
                                    isPositive ? "bg-red-500" : !isNeutral ? "bg-blue-500" : "bg-muted-foreground",
                                  )}
                                  style={{ width: `${shareWidth}%` }}
                                />
                              </div>
                            </div>

                            <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground min-w-0">
                              <span className="truncate min-w-0">
                                대금{" "}
                                <span className="text-foreground font-semibold tabular-nums whitespace-nowrap">
                                  {formatKoreanMoney(item.accumulatedTradeAmount)}
                                </span>
                              </span>
                              <span className="shrink-0 whitespace-nowrap">
                                량{" "}
                                <span className="text-foreground font-semibold tabular-nums">
                                  {formatCompact(item.accumulatedVolume)}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* 데스크탑/태블릿 */}
                          <div className="hidden sm:block p-3">
                            <div className="text-sm font-medium text-foreground truncate">{item.industryName}</div>

                            <div className="mt-1 text-lg font-bold text-foreground tabular-nums">
                              {Math.round(item.currentIndexPrice).toLocaleString()}
                            </div>

                            <div className={cn("mt-1 flex items-center gap-1 text-sm font-medium tabular-nums", toneText)}>
                              {isPositive ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : isNeutral ? (
                                <Minus className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}

                              <span>
                                {isPositive ? "+" : ""}
                                {item.changeRate.toFixed(2)}%
                              </span>

                              <span className="text-xs opacity-80">
                                ({item.changeFromPreviousDay >= 0 ? "▲" : "▼"}
                                {Math.abs(item.changeFromPreviousDay).toFixed(2)})
                              </span>
                            </div>

                            <div className="mt-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center justify-between text-xs text-muted-foreground cursor-help">
                                    <span className="underline decoration-dotted underline-offset-4">자금쏠림</span>
                                    <span className="tabular-nums">{item.tradeAmountRatio.toFixed(1)}%</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[240px]">
                                  <div className="space-y-1">
                                    <p className="font-medium">자금쏠림(거래대금 비중)</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                      오늘 전체 거래대금 중 이 업종이 차지하는 비율이에요.
                                      <br />
                                      높을수록 돈이 몰린(관심 높은) 업종입니다.
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>

                              <div className="mt-1 h-1.5 w-full rounded bg-secondary overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full",
                                    isPositive ? "bg-red-500" : !isNeutral ? "bg-blue-500" : "bg-muted-foreground",
                                  )}
                                  style={{ width: `${shareWidth}%` }}
                                />
                              </div>
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="rounded bg-secondary/40 px-2 py-1 cursor-help">
                                    <div className="opacity-80 underline decoration-dotted underline-offset-4">거래대금</div>
                                    <div className="text-foreground font-medium tabular-nums">
                                      {formatKoreanMoney(item.accumulatedTradeAmount)}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[240px]">
                                  <div className="space-y-1">
                                    <p className="font-medium">거래대금</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                      오늘 이 업종에 거래된 총 금액이에요.
                                      <br />
                                      클수록 자금이 많이 들어온 상태입니다.
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="rounded bg-secondary/40 px-2 py-1 cursor-help">
                                    <div className="opacity-80 underline decoration-dotted underline-offset-4">거래량</div>
                                    <div className="text-foreground font-medium tabular-nums">
                                      {formatCompact(item.accumulatedVolume)}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[240px]">
                                  <div className="space-y-1">
                                    <p className="font-medium">거래량</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                      오늘 누적 거래된 수량이에요.
                                      <br />
                                      클수록 거래가 활발(관심 ↑)하다는 뜻입니다.
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>

                            <div className="mt-2 text-[11px] text-muted-foreground">관심도 {item.volumeRatio.toFixed(1)}%</div>
                          </div>
                        </div>
                      </CarouselItem>
                    )
                  })}
                </CarouselContent>
              </Carousel>

              <div className="mt-2 text-[11px] text-muted-foreground">자동 이동: 카드에 마우스를 올리면 일시정지</div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
