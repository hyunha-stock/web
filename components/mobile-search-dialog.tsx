import React from 'react';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Bell, Search} from "lucide-react";
import {cn} from "@/lib/utils";
import {Input} from "@/components/ui/input";
import Link from "next/link";
import {useSearch} from "@/lib/store";

const MobileSearchDialog = () => {
  const {query, setQuery, isOpen, setIsOpen, results} = useSearch()

  return (
    <Dialog open={isOpen && query.length === 0} onOpenChange={setIsOpen}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>종목 검색</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
          <Input
            placeholder="종목명 또는 코드 입력..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-secondary border-border"
            autoFocus
          />
        </div>
        {results.length > 0 && (
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {results.map((stock) => (
              <Link
                key={stock.ticker}
                href={`/stock/${stock.ticker}`}
                onClick={() => {
                  setIsOpen(false)
                  setQuery("")
                }}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <div>
                  <span className="font-medium text-foreground">{stock.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{stock.ticker}</span>
                </div>
                <span
                  className={cn("text-sm font-medium", stock.changePercent >= 0 ? "text-chart-1" : "text-chart-2")}
                >
                    {stock.changePercent >= 0 ? "+" : ""}
                  {stock.changePercent.toFixed(2)}%
                  </span>
              </Link>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
    ;
}

export default MobileSearchDialog;