"use client"

import {useState} from "react"
import {Activity, Bell, Settings, Search, List} from "lucide-react"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Badge} from "@/components/ui/badge"
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog"
import {useSearch, useAnomalies} from "@/lib/store"
import type {Market} from "@/lib/types"
import Link from "next/link"
import {cn} from "@/lib/utils"
import {ThemeToggle} from "@/components/theme-toggle"
import {SearchCommand} from "@/components/search-command";
import MobileSearchDialog from "@/components/mobile-search-dialog";

interface HeaderProps {
  selectedMarket: Market
  onMarketChange: (market: Market) => void
}

export function Header({selectedMarket, onMarketChange}: HeaderProps) {
  const {anomalies} = useAnomalies(selectedMarket)
  const [showNotifications, setShowNotifications] = useState(false)

  const highSeverityCount = anomalies.filter((a) => a.severity === "high").length

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo & Title */}
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Activity className="h-5 w-5 text-primary-foreground"/>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-foreground">시장 레이더</h1>
                <p className="text-xs text-muted-foreground">실시간 이상징후 감지</p>
              </div>
            </Link>

            {/* Search & Actions */}
            <div className="flex items-center gap-2">
              <SearchCommand/>
              <ThemeToggle/>
              <Button variant="ghost" size="icon" className="relative" onClick={() => setShowNotifications(true)}>
                <Bell className="h-5 w-5"/>
                {highSeverityCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-destructive text-destructive-foreground">
                    {highSeverityCount}
                  </Badge>
                )}
              </Button>

              <Link href="/settings">
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5"/>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>


      {/* Mobile Search Dialog*/}
      <MobileSearchDialog />
      {/* Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5"/>
              최근 알림
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {anomalies.slice(0, 10).map((anomaly) => (
              <div
                key={anomaly.id}
                className={cn(
                  "p-3 rounded-lg border",
                  anomaly.severity === "high"
                    ? "border-chart-2/30 bg-chart-2/10"
                    : anomaly.severity === "medium"
                      ? "border-chart-4/30 bg-chart-4/10"
                      : "border-border bg-secondary/50",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{anomaly.name}</span>
                  <span className="text-xs text-muted-foreground">{anomaly.time}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{anomaly.description}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
