"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, TrendingUp, TrendingDown } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { useSearchDefault } from "@/domain/stock/queries/useSearchDefault"
import { useSearchStock } from "@/domain/stock/queries/useSearchStock"
import type { SearchDefaultStock } from "@/domain/stock/types/search-default.model"
import type { StockSearchResult } from "@/domain/stock/types/stock-search-result.model"

function toPct(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return 0
  return v
}

export function SearchCommand() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()

  const trimmedQuery = useMemo(() => query.trim(), [query])
  const isSearchMode = trimmedQuery.length > 0

  const { data: defaultData, isLoading: isDefaultLoading, isError: isDefaultError } = useSearchDefault()

  // ✅ 검색 모드일 때만 "검색 결과"를 사용
  const {
    data: searchData,
    isLoading: isSearchLoading,
    isError: isSearchError,
  } = useSearchStock(trimmedQuery)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSelect = useCallback(
    (symbol: string) => {
      setOpen(false)
      setQuery("")
      router.push(`/stock/${symbol}`)
    },
    [router],
  )

  // -------------------------
  // Default(검색어 없음) 데이터
  // -------------------------
  const marketCapDesc = (defaultData?.marketCapDesc ?? []) as SearchDefaultStock[]
  const gainersDesc = (defaultData?.gainersDesc ?? []) as SearchDefaultStock[]
  const losersAsc = (defaultData?.losersAsc ?? []) as SearchDefaultStock[]

  const hasDefaultAny = marketCapDesc.length + gainersDesc.length + losersAsc.length > 0

  const uniqueMarketCap = useMemo(() => {
    const seen = new Set<string>()
    return marketCapDesc.filter((s) => {
      if (!s?.symbol) return false
      if (seen.has(s.symbol)) return false
      seen.add(s.symbol)
      return true
    })
  }, [marketCapDesc])

  const uniqueGainers = useMemo(() => {
    const seen = new Set<string>()
    return gainersDesc.filter((s) => {
      if (!s?.symbol) return false
      if (seen.has(s.symbol)) return false
      seen.add(s.symbol)
      return true
    })
  }, [gainersDesc])

  const uniqueLosers = useMemo(() => {
    const seen = new Set<string>()
    return losersAsc.filter((s) => {
      if (!s?.symbol) return false
      if (seen.has(s.symbol)) return false
      seen.add(s.symbol)
      return true
    })
  }, [losersAsc])

  // -------------------------
  // Search(검색어 있음) 데이터
  // -------------------------
  const searchResults = useMemo(() => {
    const arr = (searchData ?? []) as StockSearchResult[]
    return arr.slice(0, 7)
  }, [searchData])

  // ✅ default는 query 입력 시 "필터링"되지 않게: 검색 모드에서는 default를 아예 숨김
  // ✅ 검색 결과는 서버가 필터링한 결과만 보여줌

  const renderDefaultItem = (stock: SearchDefaultStock, kind?: "UP" | "DOWN") => {
    const pct = toPct(stock.changeRateFromPrevDay)
    const up = kind ? kind === "UP" : pct >= 0

    const itemBg = up
      ? "aria-selected:bg-chart-1/15 data-[selected=true]:bg-chart-1/15"
      : "aria-selected:bg-chart-2/15 data-[selected=true]:bg-chart-2/15"

    return (
      <CommandItem
        key={`${kind ?? "ALL"}-${stock.symbol}`}
        value={`${stock.name} ${stock.symbol} ${stock.sector ?? ""} ${stock.market ?? ""}`}
        onSelect={() => handleSelect(stock.symbol)}
        className={cn(
          "group flex items-center justify-between cursor-pointer",
          "aria-selected:text-foreground data-[selected=true]:text-foreground",
          itemBg,
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md shrink-0 transition-colors",
              up ? "bg-chart-1/20" : "bg-chart-2/20",
              up
                ? "group-aria-selected:bg-chart-1/20 group-data-[selected=true]:bg-chart-1/20"
                : "group-aria-selected:bg-chart-2/20 group-data-[selected=true]:bg-chart-2/20",
            )}
          >
            {up ? <TrendingUp className="h-4 w-4 text-chart-1" /> : <TrendingDown className="h-4 w-4 text-chart-2" />}
          </div>

          <div className="min-w-0">
            <p className="font-medium truncate group-aria-selected:text-foreground group-data-[selected=true]:text-foreground">
              {stock.name}
            </p>
            <p className="text-xs text-muted-foreground truncate group-aria-selected:text-foreground/70 group-data-[selected=true]:text-foreground/70">
              {stock.symbol} · {stock.sector || "-"} · {stock.market || "-"}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className={cn("text-xs font-medium", up ? "text-chart-1" : "text-chart-2")}>
            {pct >= 0 ? "+" : ""}
            {pct.toFixed(2)}%
          </p>
        </div>
      </CommandItem>
    )
  }

  const renderSearchItem = (stock: StockSearchResult) => {
    // ✅ cmdk 내부 필터링 우회: value에 현재 query를 포함시켜 서버검색 결과가 숨겨지지 않게
    const safeValue = `${trimmedQuery} ${stock.name} ${stock.symbol} ${stock.market}`

    return (
      <CommandItem
        key={`SEARCH-${stock.symbol}`}
        value={safeValue}
        onSelect={() => handleSelect(stock.symbol)}
        className={cn(
          "group flex items-center justify-between cursor-pointer",
          "aria-selected:bg-accent data-[selected=true]:bg-accent",
          "aria-selected:text-accent-foreground data-[selected=true]:text-accent-foreground",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md shrink-0 transition-colors",
              "bg-muted",
              "group-aria-selected:bg-accent/60 group-data-[selected=true]:bg-accent/60",
            )}
          >
            <Search className="h-4 w-4 text-muted-foreground group-aria-selected:text-accent-foreground group-data-[selected=true]:text-accent-foreground" />
          </div>

          <div className="min-w-0">
            <p className="font-medium truncate">{stock.name}</p>
            <p className="text-xs text-muted-foreground truncate group-aria-selected:text-accent-foreground/80 group-data-[selected=true]:text-accent-foreground/80">
              {stock.symbol} · {stock.market || "-"}
            </p>
          </div>
        </div>
      </CommandItem>
    )
  }

  const emptyText = isSearchMode
    ? isSearchLoading
      ? "검색 중..."
      : isSearchError
        ? "검색에 실패했어요."
        : "검색 결과가 없습니다."
    : isDefaultLoading
      ? "불러오는 중..."
      : isDefaultError
        ? "데이터를 불러오지 못했어요."
        : "검색 결과가 없습니다."

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 h-9 w-[260px] rounded-md border border-input bg-secondary px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">종목 검색...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <button
        onClick={() => setOpen(true)}
        className="lg:hidden flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
        aria-label="search"
      >
        <Search className="h-5 w-5" />
      </button>

      <CommandDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          // ✅ 닫힐 때는 검색어 초기화해서 다음 오픈은 default 화면부터
          if (!v) setQuery("")
        }}
      >
        <CommandInput
          placeholder="종목명 또는 종목코드로 검색..."
          value={query}
          onValueChange={setQuery}
        />

        <CommandList>
          <CommandEmpty>{emptyText}</CommandEmpty>

          {/* ✅ 검색 모드: default 결과는 아예 보여주지 않고, 서버 검색 결과만 보여줌 */}
          {isSearchMode && !isSearchLoading && !isSearchError && searchResults.length > 0 && (
            <CommandGroup heading={`검색 결과 (최대 7개)`}>
              {searchResults.map(renderSearchItem)}
            </CommandGroup>
          )}

          {/* ✅ 기본 모드: default 데이터만 보여줌 */}
          {!isSearchMode && !isDefaultLoading && !isDefaultError && hasDefaultAny && (
            <>
              <CommandGroup heading="전체 (시총 상위)">
                {uniqueMarketCap.map((s) => renderDefaultItem(s))}
              </CommandGroup>

              <CommandGroup heading="상승 TOP">
                {uniqueGainers.slice(0, 5).map((s) => renderDefaultItem(s, "UP"))}
              </CommandGroup>

              <CommandGroup heading="하락 TOP">
                {uniqueLosers.slice(0, 5).map((s) => renderDefaultItem(s, "DOWN"))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
