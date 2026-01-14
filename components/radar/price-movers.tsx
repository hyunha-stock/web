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
        // ✅ 다크모드 대응: bg-white 제거, muted 배경 사용
        "px-3 py-2 text-left text-xs font-medium text-muted-foreground bg-muted/40",
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
  return (
    <td
      className={cn(
        // ✅ bg-white 제거: row hover 배경이 셀에 막히지 않게
        "px-3 py-2 text-sm text-foreground",
        className,
      )}
    >
      {children}
    </td>
  )
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
    // ✅ 이미 shadcn 카드 토큰 쓰고 있어서 그대로 OK
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
                className="block px-3 py-3 hover:bg-muted/40 transition-colors"
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

      {/* ✅ 다크모드 대응: bg-white → bg-background */}
      <div className="w-full overflow-x-auto bg-background">
        <table className="w-full min-w-[420px] border-collapse bg-background">
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
              <td colSpan={4} className="px-3 py-10 text-center text-sm text-muted-foreground">
                불러오는 중…
              </td>
            </tr>
          )}

          {!isLoading && isError && (
            <tr>
              <td colSpan={4} className="px-3 py-10 text-center text-sm text-destructive">
                데이터를 불러오지 못했어요.
              </td>
            </tr>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-10 text-center text-sm text-muted-foreground">
                표시할 데이터가 없어요.
              </td>
            </tr>
          )}

          {!isLoading &&
            !isError &&
            items.map((s, idx) => {
              const href = `/stock/${s.shortStockCode}`
              const rate = s.changeRateFromPrevDay

              return (
                <tr key={`${kind}:${s.shortStockCode}`}>
                  <td colSpan={4} className="p-0">
                    <Link
                      href={href}
                      className={cn(
                        "block w-full transition-colors",
                        // ✅ 다크/라이트 둘 다 자연스러운 hover
                        "hover:bg-muted/40 focus:bg-muted/40 focus:outline-none",
                      )}
                    >
                      <div className="grid items-center grid-cols-[56px_1fr_auto_auto]">
                        <div className="px-3 py-2 text-sm text-muted-foreground tabular-nums">{idx + 1}</div>

                        <div className="px-3 py-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-foreground truncate hover:underline">{s.stockName}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{s.shortStockCode}</span>
                          </div>
                        </div>

                        <div className="px-3 py-2 text-sm tabular-nums whitespace-nowrap text-right text-foreground">
                          {formatNumber(s.currentPrice)}원
                          <span className="ml-2 hidden lg:inline text-xs text-muted-foreground">
                              ({s.changeFromPrevDay >= 0 ? "▲" : "▼"}
                            {formatNumber(Math.abs(s.changeFromPrevDay))})
                            </span>
                        </div>

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

        {/* ✅ 다크모드 대응: bg-white 제거 */}
        <div className="hidden md:flex flex-row gap-8">
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
