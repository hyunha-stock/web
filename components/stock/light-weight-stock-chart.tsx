"use client"

import { useEffect, useMemo, useRef } from "react"
import {
  createChart,
  CrosshairMode,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type Time,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type MouseEventParams,
} from "lightweight-charts"

type Period = "D" | "W" | "M" | "Y"

export type CandlePoint = {
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

type Props = {
  data: CandlePoint[]
  period: Period
  height?: number
  refLines?: {
    prevClose?: number | null
    dayHigh?: number | null
    dayLow?: number | null
  }
}

// ====== HEX ONLY UI COLORS ======
const UI_FG = "#111827"
const UI_MUTED = "#6B7280"
const UI_BORDER = "#E5E7EB"
const UI_PANEL_BG = "#FFFFFFF2" // white 95% (RRGGBBAA)
const UI_PANEL_SHADOW = "0 8px 24px rgba(0,0,0,0.12)"

// ====== SERIES COLORS ======
const UP_COLOR = "#E11D48"
const DOWN_COLOR = "#2563EB"

const MA5_COLOR = "#F59E0B"
const MA20_COLOR = "#22C55E"
const MA60_COLOR = "#A855F7"
const MA120_COLOR = "#06B6D4"

function yyyymmddToUTCSeconds(date: string): UTCTimestamp {
  const y = Number(date.slice(0, 4))
  const m = Number(date.slice(4, 6))
  const d = Number(date.slice(6, 8))
  return (Date.UTC(y, m - 1, d) / 1000) as UTCTimestamp
}

function timeToUTCDate(time: Time): Date {
  if (typeof time === "number") return new Date(time * 1000)
  if (typeof time === "string") return new Date(time)
  return new Date(Date.UTC(time.year, time.month - 1, time.day))
}

function fmtYYYYMMDD(time: Time) {
  const d = timeToUTCDate(time)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${yyyy}.${mm}.${dd}`
}

function periodToVisibleBars(p: Period) {
  if (p === "D") return 30
  if (p === "W") return 60
  if (p === "M") return 140
  return 260
}

function n0(x: unknown) {
  const v = typeof x === "number" ? x : Number(x)
  return Number.isFinite(v) ? v : 0
}

function fmtNum(v: unknown, digits = 0) {
  const x = n0(v)
  return Math.round(x).toLocaleString("ko-KR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

function fmtVol(v: unknown) {
  const x = n0(v)
  return Math.round(x).toLocaleString("ko-KR")
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export default function LightweightStockChart({ data, period, height = 350, refLines }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  // overlays
  const yearOverlayRef = useRef<HTMLDivElement | null>(null)
  const hoverOverlayRef = useRef<HTMLDivElement | null>(null)
  const hoverLineElRef = useRef<HTMLDivElement | null>(null)

  const chartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null)

  const candleData = useMemo<CandlestickData<UTCTimestamp>[]>(() => {
    return data.map((d) => ({
      time: yyyymmddToUTCSeconds(d.date),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))
  }, [data])

  const volumeData = useMemo<HistogramData<UTCTimestamp>[]>(() => {
    return data.map((d) => ({
      time: yyyymmddToUTCSeconds(d.date),
      value: d.volume,
      color: d.close >= d.open ? UP_COLOR : DOWN_COLOR,
    }))
  }, [data])

  const maData = useMemo(() => {
    const mk = (key: keyof CandlePoint): LineData<UTCTimestamp>[] =>
      data
        .map((d) => {
          const v = d[key]
          if (v == null) return null
          return { time: yyyymmddToUTCSeconds(d.date), value: v } as LineData<UTCTimestamp>
        })
        .filter((x): x is LineData<UTCTimestamp> => x !== null)

    return {
      ma5: mk("ma5"),
      ma20: mk("ma20"),
      ma60: mk("ma60"),
      ma120: mk("ma120"),
    }
  }, [data])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let disposed = false
    let raf = 0

    // hover line element (single)
    const hoverOverlay = hoverOverlayRef.current
    if (hoverOverlay && !hoverLineElRef.current) {
      const line = document.createElement("div")
      line.style.position = "absolute"
      line.style.top = "0px"
      line.style.bottom = "0px"
      line.style.width = "1px"
      line.style.background = UI_BORDER
      line.style.opacity = "0.95"
      line.style.transform = "translateX(-0.5px)"
      line.style.display = "none"
      hoverOverlay.appendChild(line)
      hoverLineElRef.current = line
    }

    const chart = createChart(el, {
      height,
      width: el.clientWidth,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: UI_MUTED,
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { labelVisible: false, color: UI_BORDER, width: 1, style: 0 },
        horzLine: { labelVisible: true, color: UI_BORDER, width: 1, style: 0 },
      },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: {
        borderVisible: false,
        rightOffset: 6,
        barSpacing: 8,
        tickMarkFormatter: (time: Time) => {
          const d = timeToUTCDate(time)
          const yyyy = d.getUTCFullYear()
          const mm = d.getUTCMonth() + 1
          if (period === "Y") return `${yyyy}`
          if (period === "M") return `${yyyy}`
          return `${mm}월`
        },
      },
      localization: { priceFormatter: (p: number) => Math.round(p).toLocaleString("ko-KR") },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    })

    // watermark(logo) 옵션 (지원 버전이면 꺼짐)
    try {
      ;(chart as any).applyOptions?.({ layout: { attributionLogo: false } })
    } catch {
      // ignore
    }

    chartRef.current = chart

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      borderUpColor: UP_COLOR,
      borderDownColor: DOWN_COLOR,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
      lastValueVisible: true,
      priceLineVisible: true,
    })
    candle.setData(candleData)

    const volume = chart.addSeries(HistogramSeries, {
      priceScaleId: "",
      priceFormat: { type: "volume" },
      lastValueVisible: false,
      priceLineVisible: false,
    })
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    volume.setData(volumeData)

    const ma5 = chart.addSeries(LineSeries, { lineWidth: 2, color: MA5_COLOR, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
    ma5.setData(maData.ma5)

    const ma20 = chart.addSeries(LineSeries, { lineWidth: 2, color: MA20_COLOR, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
    ma20.setData(maData.ma20)

    const ma60 = chart.addSeries(LineSeries, { lineWidth: 2, color: MA60_COLOR, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
    ma60.setData(maData.ma60)

    const ma120 = chart.addSeries(LineSeries, { lineWidth: 2, color: MA120_COLOR, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
    ma120.setData(maData.ma120)

    candleRef.current = candle
    volRef.current = volume

    // reference lines
    if (refLines?.prevClose != null) {
      candle.createPriceLine({ price: refLines.prevClose, color: UI_BORDER, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "전일" })
    }
    if (refLines?.dayHigh != null) {
      candle.createPriceLine({ price: refLines.dayHigh, color: UI_MUTED, lineWidth: 1, lineStyle: 3, axisLabelVisible: false, title: "고" })
    }
    if (refLines?.dayLow != null) {
      candle.createPriceLine({ price: refLines.dayLow, color: UI_MUTED, lineWidth: 1, lineStyle: 3, axisLabelVisible: false, title: "저" })
    }

    // initial range
    const visible = periodToVisibleBars(period)
    const total = candleData.length
    if (total > 0) {
      const from = Math.max(0, total - visible)
      chart.timeScale().setVisibleLogicalRange({ from, to: total + 2 })
    } else {
      chart.timeScale().fitContent()
    }

    // ----- Tooltip -----
    const tooltip = tooltipRef.current

    const setTooltipHtml = (html: string) => {
      if (!tooltip) return
      tooltip.innerHTML = html
      tooltip.style.opacity = "1"
    }
    const hideTooltip = () => {
      if (!tooltip) return
      tooltip.style.opacity = "0"
    }

    // ----- Hover vertical line overlay -----
    const setHoverX = (x: number | null) => {
      const line = hoverLineElRef.current
      if (!line) return
      if (x == null || Number.isNaN(x)) {
        line.style.display = "none"
        return
      }
      line.style.display = "block"
      line.style.left = `${x}px`
    }

    // ✅ tooltip을 마우스(크로스헤어) 위치로 이동
    const moveTooltipToPoint = (point: { x: number; y: number }) => {
      if (!tooltip) return

      // 먼저 렌더링된 사이즈를 기준으로 화면 밖 방지
      const tw = tooltip.offsetWidth || 180
      const th = tooltip.offsetHeight || 100
      const w = el.clientWidth
      const h = height

      const pad = 12
      let left = point.x + pad
      let top = point.y + pad

      left = clamp(left, 0, Math.max(0, w - tw))
      top = clamp(top, 0, Math.max(0, h - th))

      tooltip.style.left = `${left}px`
      tooltip.style.top = `${top}px`
    }

    const onCrosshairMove = (param: MouseEventParams<Time>) => {
      if (disposed) return

      if (!param?.time || !param.point) {
        hideTooltip()
        setHoverX(null)
        return
      }

      const x = chart.timeScale().timeToCoordinate(param.time)
      setHoverX(x)

      const c = (param.seriesData.get(candle) as any) ?? null
      if (!c) {
        hideTooltip()
        return
      }

      const v = (param.seriesData.get(volume) as any) ?? null
      const m5 = (param.seriesData.get(ma5) as any) ?? null
      const m20 = (param.seriesData.get(ma20) as any) ?? null
      const m60 = (param.seriesData.get(ma60) as any) ?? null
      const m120 = (param.seriesData.get(ma120) as any) ?? null

      const open = n0(c.open)
      const high = n0(c.high)
      const low = n0(c.low)
      const close = n0(c.close)

      const isUp = close >= open
      const priceColor = isUp ? UP_COLOR : DOWN_COLOR

      const prevClose = refLines?.prevClose != null ? Number(refLines.prevClose) : null
      const diff = prevClose != null ? close - prevClose : null
      const diffPct = prevClose != null && prevClose > 0 ? (diff! / prevClose) * 100 : null

      const vol = v?.value ?? 0

      const row = (label: string, value: string, strong = false, valueColor?: string) => `
        <div style="display:flex; justify-content:space-between; gap:10px; margin-top:2px;">
          <span style="color:${UI_MUTED};">${label}</span>
          <span style="font-weight:${strong ? 800 : 600}; color:${valueColor ?? UI_FG};">${value}</span>
        </div>
      `

      const maRow = (label: string, val: any, color: string) =>
        row(label, val?.value == null ? "-" : fmtNum(val.value, 0), false, color)

      const html = `
        <div style="min-width:180px; font-size:12px; line-height:1.2;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <div style="font-weight:800; color:${UI_FG};">${fmtYYYYMMDD(param.time)}</div>
            <div style="font-weight:900; color:${priceColor};">${fmtNum(close, 0)}</div>
          </div>

          <div style="margin-top:6px; padding-top:6px; border-top:1px solid ${UI_BORDER};">
            ${row("시", fmtNum(open, 0))}
            ${row("고", fmtNum(high, 0))}
            ${row("저", fmtNum(low, 0))}
            ${row("거래량", fmtVol(vol))}
            ${
        diff == null
          ? ""
          : row(
            "전일대비",
            `${diff >= 0 ? "+" : ""}${fmtNum(diff, 0)} (${diffPct == null ? "-" : diffPct.toFixed(2)}%)`,
            true,
            diff >= 0 ? UP_COLOR : DOWN_COLOR,
          )
      }
          </div>

          <div style="margin-top:6px; padding-top:6px; border-top:1px solid ${UI_BORDER};">
            ${maRow("MA5", m5, MA5_COLOR)}
            ${maRow("MA20", m20, MA20_COLOR)}
            ${maRow("MA60", m60, MA60_COLOR)}
            ${maRow("MA120", m120, MA120_COLOR)}
          </div>
        </div>
      `

      setTooltipHtml(html)

      // ✅ DOM 업데이트 후 위치 계산이 더 정확함
      requestAnimationFrame(() => moveTooltipToPoint(param.point!))
    }

    chart.subscribeCrosshairMove(onCrosshairMove)

    // ----- Year guides overlay -----
    const drawYearGuides = () => {
      if (disposed) return
      const overlay = yearOverlayRef.current
      if (!overlay) return

      overlay.innerHTML = ""
      if (period === "Y") return
      if (!data?.length) return

      const marks: { t: UTCTimestamp; year: string }[] = []
      for (let i = 0; i < data.length; i++) {
        const curY = data[i].date.slice(0, 4)
        const prevY = i > 0 ? data[i - 1].date.slice(0, 4) : null
        if (i === 0 || (prevY && prevY !== curY)) {
          marks.push({ t: yyyymmddToUTCSeconds(data[i].date), year: curY })
        }
      }

      const w = el.clientWidth
      const h = height

      const frag = document.createDocumentFragment()
      for (const m of marks) {
        const x = chart.timeScale().timeToCoordinate(m.t)
        if (x == null) continue

        const line = document.createElement("div")
        line.style.position = "absolute"
        line.style.left = `${x}px`
        line.style.top = `0px`
        line.style.width = "2px"
        line.style.height = `${h}px`
        line.style.background = UI_BORDER
        line.style.opacity = "0.65"
        frag.appendChild(line)

        const label = document.createElement("div")
        label.style.position = "absolute"
        label.style.left = `${x + 6}px`
        label.style.top = `10px`
        label.style.fontSize = "18px"
        label.style.fontWeight = "800"
        label.style.color = UI_FG
        label.style.opacity = "0.14"
        label.textContent = m.year
        frag.appendChild(label)
      }

      overlay.appendChild(frag)
      overlay.style.width = `${w}px`
      overlay.style.height = `${h}px`
    }

    const scheduleGuides = () => {
      if (disposed) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(drawYearGuides)
    }

    chart.timeScale().subscribeVisibleTimeRangeChange(scheduleGuides)

    const ro = new ResizeObserver(() => {
      if (disposed) return
      chart.applyOptions({ width: el.clientWidth })
      scheduleGuides()
    })
    ro.observe(el)

    scheduleGuides()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)

      ro.disconnect()
      chart.timeScale().unsubscribeVisibleTimeRangeChange(scheduleGuides)
      chart.unsubscribeCrosshairMove(onCrosshairMove)

      setHoverX(null)
      hideTooltip()

      chart.remove()
      chartRef.current = null
      candleRef.current = null
      volRef.current = null
    }
  }, [candleData, volumeData, maData, height, period, data, refLines?.prevClose, refLines?.dayHigh, refLines?.dayLow])

  return (
    <div className="relative w-full" style={{ height }}>
      {/* ✅ 차트 캔버스: zIndex 0 */}
      <div ref={containerRef} className="h-full w-full" style={{ position: "relative", zIndex: 0 }} />

      {/* year guides: 위 레이어 */}
      <div ref={yearOverlayRef} className="pointer-events-none absolute inset-0" style={{ zIndex: 10 }} />

      {/* hover line: 위 레이어 */}
      <div ref={hoverOverlayRef} className="pointer-events-none absolute inset-0" style={{ zIndex: 20 }} />

      {/* ✅ tooltip: 최상단 + 커서 따라다님 */}
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute"
        style={{
          left: 0,
          top: 0,
          opacity: 0,
          zIndex: 30, // ✅ 차트 위로
          transition: "opacity 120ms ease",
          border: `1px solid ${UI_BORDER}`,
          background: UI_PANEL_BG,
          borderRadius: 10,
          padding: "10px 12px",
          boxShadow: UI_PANEL_SHADOW,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          willChange: "left, top, opacity",
        }}
      />
    </div>
  )
}
