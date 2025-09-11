import React, { Suspense, lazy } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { useChartResponsive, useChartPerformance } from "@/hooks/use-chart-responsive"

interface MobileChartWrapperProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  collapsible?: boolean
  fullscreenEnabled?: boolean
  performanceMode?: boolean
  showMetadata?: boolean
  metadata?: {
    lastUpdated?: string
    dataPoints?: number
    confidence?: "High" | "Medium" | "Low"
  }
}

const MobileChartWrapper = React.forwardRef<HTMLDivElement, MobileChartWrapperProps>(
  ({
    title,
    description,
    children,
    className,
    collapsible = false,
    fullscreenEnabled = true,
    performanceMode = true,
    showMetadata = false,
    metadata,
    ...props
  }, ref) => {
    const isMobile = useIsMobile()
    const [isCollapsed, setIsCollapsed] = React.useState(false)
    const [isFullscreen, setIsFullscreen] = React.useState(false)
    
    const chartDimensions = useChartResponsive({
      enableMobileOptimizations: true,
      mobileAspectRatio: "auto"
    })
    
    const { chartRef, isVisible, shouldSimplify } = useChartPerformance({
      enableLazyLoading: performanceMode,
      simplifyOnMobile: true
    })

    const toggleCollapse = () => {
      if (collapsible) {
        setIsCollapsed(!isCollapsed)
      }
    }

    const toggleFullscreen = () => {
      if (fullscreenEnabled) {
        setIsFullscreen(!isFullscreen)
      }
    }

    const getConfidenceColor = (confidence?: string) => {
      switch (confidence) {
        case "High": return "bg-green-100 text-green-800 border-green-200"
        case "Medium": return "bg-yellow-100 text-yellow-800 border-yellow-200" 
        case "Low": return "bg-red-100 text-red-800 border-red-200"
        default: return "bg-gray-100 text-gray-800 border-gray-200"
      }
    }

    return (
      <Card 
        ref={ref}
        className={cn(
          "relative transition-all duration-300",
          isFullscreen && isMobile && [
            "fixed inset-4 z-50 bg-background shadow-2xl",
            "animate-in zoom-in-95"
          ],
          className
        )}
        data-testid="mobile-chart-wrapper"
        {...props}
      >
        <CardHeader className={cn(
          "pb-3",
          isMobile && "pb-2 px-3",
          isCollapsed && "pb-3"
        )}>
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className={cn(
                  "text-lg font-semibold",
                  isMobile && "text-base",
                  isCollapsed && isMobile && "text-sm"
                )} data-testid="chart-title">
                  {title}
                </CardTitle>
                {showMetadata && metadata?.confidence && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs px-2 py-0.5",
                      getConfidenceColor(metadata.confidence)
                    )}
                    data-testid="chart-confidence"
                  >
                    {metadata.confidence}
                  </Badge>
                )}
              </div>
              {description && !isCollapsed && (
                <CardDescription className={cn(
                  "text-sm text-muted-foreground",
                  isMobile && "text-xs"
                )} data-testid="chart-description">
                  {description}
                </CardDescription>
              )}
              {showMetadata && metadata && !isCollapsed && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {metadata.lastUpdated && (
                    <span data-testid="chart-last-updated">
                      Updated: {metadata.lastUpdated}
                    </span>
                  )}
                  {metadata.dataPoints && (
                    <span data-testid="chart-data-points">
                      {metadata.dataPoints} data points
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {fullscreenEnabled && !isCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className={cn(
                    "h-8 w-8 p-0",
                    isMobile && "h-7 w-7"
                  )}
                  data-testid="button-toggle-fullscreen"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapse}
                  className={cn(
                    "h-8 w-8 p-0",
                    isMobile && "h-7 w-7"
                  )}
                  data-testid="button-toggle-collapse"
                  aria-label={isCollapsed ? "Expand chart" : "Collapse chart"}
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {!isCollapsed && (
          <CardContent className={cn(
            "pt-0",
            isMobile && "px-3 pb-3"
          )}>
            <div 
              ref={chartRef}
              className={cn(
                "relative",
                chartDimensions.aspectRatio,
                chartDimensions.isCompact && "min-h-[180px]",
                !chartDimensions.isCompact && chartDimensions.isMobile && "min-h-[200px]",
                !chartDimensions.isMobile && "min-h-[300px]"
              )}
              data-testid="chart-content-area"
            >
              {isVisible ? (
                <Suspense fallback={
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="space-y-3 w-full">
                      <Skeleton className="h-4 w-3/4 mx-auto" />
                      <Skeleton className="h-32 w-full" />
                      <div className="flex justify-center gap-4">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </div>
                }>
                  <div 
                    className="h-full w-full"
                    data-simplified={shouldSimplify}
                    data-testid="chart-render-area"
                  >
                    {children}
                  </div>
                </Suspense>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="space-y-3 w-full">
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                    <Skeleton className="h-32 w-full" />
                    <div className="flex justify-center gap-4">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Mobile-specific chart controls */}
            {isMobile && isVisible && !isCollapsed && (
              <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground">
                  Tap chart to interact • Pinch to zoom
                </div>
              </div>
            )}
          </CardContent>
        )}
        
        {/* Fullscreen overlay for mobile */}
        {isFullscreen && isMobile && (
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={toggleFullscreen}
            data-testid="fullscreen-overlay"
          />
        )}
      </Card>
    )
  }
)

MobileChartWrapper.displayName = "MobileChartWrapper"

export { MobileChartWrapper }