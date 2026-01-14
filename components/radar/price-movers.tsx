"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Market } from "@/lib/types"
import { useTopGainers } from "@/domain/stock/queries/useTopGainers"
import { useTopLosers } from "@/domain/stock/queries/useTopLosers"
import type { Fluctuation } from "@/domain/stock/types/fluctuation.model"
import { TooltipProvider } from "@/components/ui/tooltip"

interface PriceMoversProps {
  market: Market
}

function formatNumber(n: number) {
  return n.toLocaleString("ko-KR")
}

function TableHeadCell({
                         children,
                         className,
                       }: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        "px-3 py-2 text-left text-xs font-medium text-muted-foreground bg-white",
        className,
      )}
    >
      {children}
    </th>
  )
}

function TableCell({
                     children,
                     className,
                   }: {
  children: React.ReactNode
  className?: string
}) {
  return <td className={cn("px-3 py-2 text-sm bg-white", className)}>{children}</td>
}

/** ✅ 모바일 카드 리스트 */
function MobileCardList({
                          title,
                          icon,
                          tone,
                          items,
                          isLoading,
                          isError,
                        }: {
  title: string
  icon: React.ReactNode
  tone: "up" | "down"
  items: Fluctuation[]
  isLoading: boolean
  isError: boolean
}) {
  const up = tone === "up"

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">TOP 10</span>
        </div>
      </div>

      {isLoading && <div className="px-3 py-8 text-center text-sm text-muted-foreground">불러오는 중…</div>}
      {!isLoading && isError && (
        <div className="px-3 py-8 text-center text-sm text-destructive">데이터를 불러오지 못했어요.</div>
      )}
      {!isLoading && !isError && items.length === 0 && (
        <div className="px-3 py-8 text-center text-sm text-muted-foreground">표시할 데이터가 없어요.</div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="divide-y divide-border">
          {items.map((s, idx) => {
            const href = `/stock/${s.shortStockCode}`
            const rate = s.changeRateFromPrevDay

            return (
              <Link
                key={`m:${tone}:${s.shortStockCode}`}
                href={href}
                className="block px-3 py-3 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold shrink-0",
                          up ? "bg-chart-1/20 text-chart-1" : "bg-chart-2/20 text-chart-2",
                        )}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-foreground truncate">{s.stockName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{s.shortStockCode}</span>
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatNumber(s.currentPrice)}원{" "}
                      <span className="opacity-80">
                        ({s.changeFromPrevDay >= 0 ? "▲" : "▼"}
                        {formatNumber(Math.abs(s.changeFromPrevDay))})
                      </span>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1 text-sm font-semibold tabular-nums",
                      up ? "text-chart-1" : "text-chart-2",
                    )}
                  >
                    {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    <span>
                      {up ? "+" : ""}
                      {rate.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * ✅ 데스크톱: 선 전부 제거 + 흰 배경
 * ✅ hover 시 "행 전체" 배경이 들어가도록:
 *   - <tr>에 hover 주는 건 table 레이아웃에서 셀 배경 때문에 티가 덜 날 수 있어
 *   - 그래서 row를 <Link>로 감싼 "block row"를 만들어서 hover 배경을 확실하게 줌
 */
function MoversTable({
                       title,
                       icon,
                       tone,
                       items,
                       isLoading,
                       isError,
                       kind,
                     }: {
  title: string
  icon: React.ReactNode
  tone: "up" | "down"
  items: Fluctuation[]
  isLoading: boolean
  isError: boolean
  kind: "gainers" | "losers"
}) {
  const up = tone === "up"

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">TOP 10</span>
      </div>

      <div className="w-full overflow-x-auto bg-white">
        <table className="w-full min-w-[420px] border-collapse bg-white">
          <thead>
          <tr>
            <TableHeadCell className="w-[56px]">#</TableHeadCell>
            <TableHeadCell>종목</TableHeadCell>
            <TableHeadCell className="text-right">현재가</TableHeadCell>
            <TableHeadCell className="text-right">등락률</TableHeadCell>
          </tr>
          </thead>

          <tbody>
          {isLoading && (
            <tr>
              <td colSpan={4} className="px-3 py-10 text-center text-sm text-muted-foreground bg-white">
                불러오는 중…
              </td>
            </tr>
          )}

          {!isLoading && isError && (
            <tr>
              <td colSpan={4} className="px-3 py-10 text-center text-sm text-destructive bg-white">
                데이터를 불러오지 못했어요.
              </td>
            </tr>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-10 text-center text-sm text-muted-foreground bg-white">
                표시할 데이터가 없어요.
              </td>
            </tr>
          )}

          {!isLoading &&
            !isError &&
            items.map((s, idx) => {
              const href = `/stock/${s.shortStockCode}`
              const rate = s.changeRateFromPrevDay

              // ✅ 행 전체 hover 배경: Link를 block row로 사용
              // table 안에서 Link로 tr 자체를 감쌀 수는 없어서,
              // "tr -> td(colSpan=4) -> Link" 구조로 만들고, 내부는 grid로 열 맞춤
              return (
                <tr key={`${kind}:${s.shortStockCode}`} className="bg-white">
                  <td colSpan={4} className="p-0 bg-white">
                    <Link
                      href={href}
                      className={cn(
                        "block w-full bg-white transition-colors",
                        "hover:bg-muted/40",
                        "focus:bg-muted/40 focus:outline-none",
                      )}
                    >
                      <div
                        className={cn(
                          "grid items-center",
                          // 4컬럼 폭 (thead와 맞춰야 함)
                          "grid-cols-[56px_1fr_auto_auto]",
                        )}
                      >
                        {/* # */}
                        <div className="px-3 py-2 text-sm text-muted-foreground tabular-nums">{idx + 1}</div>

                        {/* 종목 */}
                        <div className="px-3 py-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-foreground truncate hover:underline">{s.stockName}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{s.shortStockCode}</span>
                          </div>
                        </div>

                        {/* 현재가 */}
                        <div className="px-3 py-2 text-sm tabular-nums whitespace-nowrap text-right">
                          {formatNumber(s.currentPrice)}원
                          <span className="ml-2 hidden lg:inline text-xs text-muted-foreground">
                              ({s.changeFromPrevDay >= 0 ? "▲" : "▼"}
                            {formatNumber(Math.abs(s.changeFromPrevDay))})
                            </span>
                        </div>

                        {/* 등락률 */}
                        <div
                          className={cn(
                            "px-3 py-2 text-sm tabular-nums whitespace-nowrap text-right font-medium",
                            up ? "text-chart-1" : "text-chart-2",
                          )}
                        >
                            <span className="inline-flex items-center justify-end gap-1 w-full">
                              {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                              <span>
                                {up ? "+" : ""}
                                {rate.toFixed(2)}%
                              </span>
                            </span>
                        </div>
                      </div>
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function PriceMovers({ market }: PriceMoversProps) {
  const { data: topGainers, isLoading: isLoadingG, isError: isErrorG } = useTopGainers()
  const { data: topLosers, isLoading: isLoadingL, isError: isErrorL } = useTopLosers()

  const gainers = useMemo(() => ((topGainers ?? []) as Fluctuation[]).slice(0, 10), [topGainers])
  const losers = useMemo(() => ((topLosers ?? []) as Fluctuation[]).slice(0, 10), [topLosers])

  return (
    <TooltipProvider delayDuration={150}>
      <div className="w-full">
        {/* Mobile: 카드 */}
        <div className="md:hidden space-y-3">
          <MobileCardList
            title="상승"
            icon={<TrendingUp className="h-4 w-4 text-chart-1" />}
            tone="up"
            items={gainers}
            isLoading={isLoadingG}
            isError={isErrorG}
          />
          <MobileCardList
            title="하락"
            icon={<TrendingDown className="h-4 w-4 text-chart-2" />}
            tone="down"
            items={losers}
            isLoading={isLoadingL}
            isError={isErrorL}
          />
        </div>

        {/* Desktop: 선 전부 제거 + 흰 배경 + 행 전체 hover */}
        <div className="hidden md:flex flex-row gap-8 bg-white">
          <MoversTable
            title="상승"
            icon={<TrendingUp className="h-4 w-4 text-chart-1" />}
            tone="up"
            items={gainers}
            isLoading={isLoadingG}
            isError={isErrorG}
            kind="gainers"
          />
          <MoversTable
            title="하락"
            icon={<TrendingDown className="h-4 w-4 text-chart-2" />}
            tone="down"
            items={losers}
            isLoading={isLoadingL}
            isError={isErrorL}
            kind="losers"
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
