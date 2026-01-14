"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Newspaper, TrendingUp, TrendingDown, Minus, Sparkles, ExternalLink } from "lucide-react"
import { generateMarketNews } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import Link from "next/link"

type Category = "전체" | "경제" | "산업" | "정책" | "글로벌" | "기업"
type Sentiment = "전체" | "positive" | "negative" | "neutral"

export function MarketNewsFeed() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체")
  const [selectedSentiment, setSelectedSentiment] = useState<Sentiment>("전체")

  const newsItems = useMemo(() => generateMarketNews(), [])

  const categories: Category[] = ["전체", "경제", "산업", "정책", "글로벌", "기업"]
  const sentiments: { value: Sentiment; label: string }[] = [
    { value: "전체", label: "전체" },
    { value: "positive", label: "호재" },
    { value: "negative", label: "악재" },
    { value: "neutral", label: "중립" },
  ]

  const filteredNews = newsItems.filter((news) => {
    const categoryMatch = selectedCategory === "전체" || news.category === selectedCategory
    const sentimentMatch = selectedSentiment === "전체" || news.sentiment === selectedSentiment
    return categoryMatch && sentimentMatch
  })

  const getSentimentIcon = (sentiment: "positive" | "negative" | "neutral") => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case "negative":
        return <TrendingDown className="h-4 w-4 text-blue-500" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getSentimentBadge = (sentiment: "positive" | "negative" | "neutral") => {
    switch (sentiment) {
      case "positive":
        return (
          <Badge variant="outline" className="border-red-500/50 text-red-500 text-xs">
            호재
          </Badge>
        )
      case "negative":
        return (
          <Badge variant="outline" className="border-blue-500/50 text-blue-500 text-xs">
            악재
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground text-xs">
            중립
          </Badge>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          시장 뉴스
        </CardTitle>
        <div className="flex flex-col gap-2 mt-3">
           {/*카테고리 필터*/}
          <div className="flex flex-wrap gap-1">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
           {/*호재/악재 필터*/}
          <div className="flex flex-wrap gap-1">
            {sentiments.map((sentiment) => (
              <Button
                key={sentiment.value}
                variant={selectedSentiment === sentiment.value ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 text-xs",
                  selectedSentiment === sentiment.value &&
                    sentiment.value === "positive" &&
                    "bg-red-500/20 text-red-500",
                  selectedSentiment === sentiment.value &&
                    sentiment.value === "negative" &&
                    "bg-blue-500/20 text-blue-500",
                )}
                onClick={() => setSelectedSentiment(sentiment.value)}
              >
                {sentiment.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredNews.map((news) => {
            return (
              <div
                key={news.id}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  news.sentiment === "positive" && "border-red-500/20",
                  news.sentiment === "negative" && "border-blue-500/20",
                  news.sentiment === "neutral" && "border-border",
                )}
              >
                <div className="flex items-start gap-2">
                  {getSentimentIcon(news.sentiment)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {news.category}
                      </Badge>
                      {getSentimentBadge(news.sentiment)}
                      <span className="text-xs text-muted-foreground">{news.source}</span>
                      <span className="text-xs text-muted-foreground">{news.time}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground line-clamp-1">{news.title}</p>

                    {/* AI 한줄 요약 - 항상 표시 */}
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-chart-4 shrink-0" />
                      <span className="line-clamp-1">{news.aiSummary}</span>
                    </div>

                    {/* 관련 종목 + 원문 보기 */}
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                        {news.relatedStocks.slice(0, 3).map((stock) => (
                          <Link key={stock.ticker} href={`/stock/${stock.ticker}`}>
                            <Badge variant="outline" className="text-xs hover:bg-primary/10 cursor-pointer">
                              {stock.name}
                            </Badge>
                          </Link>
                        ))}
                        {news.relatedStocks.length > 3 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            +{news.relatedStocks.length - 3}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-primary hover:text-primary shrink-0"
                        asChild
                      >
                        <a href={news.url || "#"} target="_blank" rel="noopener noreferrer">
                          원문 보기
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {filteredNews.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">해당 조건의 뉴스가 없습니다</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
