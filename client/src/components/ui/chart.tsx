"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { useChartGestures, useChartPerformance } from "@/hooks/use-chart-responsive"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
  gestureState?: {
    isGesturing: boolean
    scale: number
    position: { x: number; y: number }
    transform: { scale: number; translateX: number; translateY: number }
  }
  chartTransform?: { scale: number; translateX: number; translateY: number }
  resetTransform?: () => void
  performance?: {
    shouldSimplify: boolean
    animationDuration: number
    maxDataPoints: number
    strokeWidth: number
    dotSize: number
    showGrid: boolean
    enableTooltips: boolean
    enableLegend: boolean
    performanceMode: string
    deviceQuality: string
  }
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

interface GestureConfig {
  enablePinch?: boolean
  enablePan?: boolean
  enableTap?: boolean
  onPinch?: (scale: number) => void
  onPan?: (delta: { x: number; y: number }) => void
  onTap?: (event: TouchEvent, coordinates: { x: number; y: number }) => void
}

interface PerformanceConfig {
  enableLazyLoading?: boolean
  throttleResize?: number
  reduceAnimations?: boolean
  simplifyOnMobile?: boolean
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ReactNode | ((performanceProps?: {
      animationDuration: number;
      maxDataPoints: number;
      strokeWidth: number;
      dotSize: number;
      showGrid: boolean;
      enableTooltips: boolean;
      enableLegend: boolean;
      shouldSimplify: boolean;
      isMobile: boolean;
      isLowPerformance: boolean;
    }) => React.ReactNode)
    mobileAspectRatio?: "square" | "portrait" | "landscape" | "auto"
    enableMobileOptimizations?: boolean
    showMobileLegend?: boolean
    gestureConfig?: GestureConfig
    enableGestures?: boolean
    performanceConfig?: PerformanceConfig
    enablePerformanceOptimizations?: boolean
  }
>(({ id, className, children, config, mobileAspectRatio = "auto", enableMobileOptimizations = true, showMobileLegend = true, gestureConfig = {}, enableGestures = false, performanceConfig = {}, enablePerformanceOptimizations = true, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`
  const isMobile = useIsMobile()

  // Initialize performance optimizations
  const performanceSettings = useChartPerformance({
    ...performanceConfig,
    simplifyOnMobile: enablePerformanceOptimizations && performanceConfig.simplifyOnMobile !== false
  })

  // Initialize gesture support
  const [chartTransform, setChartTransform] = React.useState({ scale: 1, translateX: 0, translateY: 0 })
  
  const { gestureState, gestureHandlers, resetTransform, currentTransform } = useChartGestures({
    enablePinch: enableGestures && gestureConfig.enablePinch && isMobile,
    enablePan: enableGestures && gestureConfig.enablePan && isMobile,
    enableTap: enableGestures && gestureConfig.enableTap && isMobile,
    onPinch: (scale) => {
      setChartTransform(prev => ({ ...prev, scale }))
      gestureConfig.onPinch?.(scale)
    },
    onPan: (delta) => {
      setChartTransform(prev => ({
        ...prev,
        translateX: prev.translateX + delta.x,
        translateY: prev.translateY + delta.y
      }))
      gestureConfig.onPan?.(delta)
    },
    onTap: gestureConfig.onTap
  })

  // Update chart transform when gesture transform changes
  React.useEffect(() => {
    setChartTransform(currentTransform)
  }, [currentTransform])

  // Determine aspect ratio based on mobile state and preference
  const getAspectRatio = () => {
    if (!enableMobileOptimizations) return "aspect-video"
    
    if (mobileAspectRatio === "auto") {
      return "aspect-[4/3] sm:aspect-video" // Default mobile-first approach
    }
    
    switch (mobileAspectRatio) {
      case "square":
        return "aspect-square"
      case "portrait":
        return "aspect-[3/4] sm:aspect-video"
      case "landscape":
        return "aspect-video"
      default:
        return "aspect-[4/3] sm:aspect-video"
    }
  }

  return (
    <ChartContext.Provider value={{ 
      config, 
      gestureState: enableGestures ? gestureState : undefined,
      chartTransform: enableGestures ? chartTransform : undefined,
      resetTransform: enableGestures ? resetTransform : undefined,
      performance: enablePerformanceOptimizations ? {
        shouldSimplify: performanceSettings.shouldSimplify,
        animationDuration: performanceSettings.animationDuration,
        maxDataPoints: performanceSettings.maxDataPoints,
        strokeWidth: performanceSettings.strokeWidth,
        dotSize: performanceSettings.dotSize,
        showGrid: performanceSettings.showGrid,
        enableTooltips: performanceSettings.enableTooltips,
        enableLegend: performanceSettings.enableLegend,
        performanceMode: performanceSettings.performanceMode,
        deviceQuality: performanceSettings.deviceQuality
      } : undefined
    }}>
      <div
        data-chart={chartId}
        data-testid={`chart-container-${chartId}`}
        ref={ref}
        className={cn(
          "flex justify-center relative",
          // Responsive aspect ratios with mobile optimization
          getAspectRatio(),
          // Enhanced mobile text sizing with better hierarchy
          "text-xs sm:text-sm",
          // Touch-friendly minimum sizes
          enableMobileOptimizations && "min-h-[200px] sm:min-h-[300px]",
          // Enhanced Recharts styling with mobile optimizations
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-axis-tick_text]:text-[10px] sm:[&_.recharts-cartesian-axis-tick_text]:text-xs",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/30 sm:[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          "[&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-dot]:cursor-pointer",
          // Larger touch targets on mobile
          enableMobileOptimizations && "[&_.recharts-dot]:min-w-[24px] [&_.recharts-dot]:min-h-[24px] sm:[&_.recharts-dot]:min-w-[16px] sm:[&_.recharts-dot]:min-h-[16px]",
          "[&_.recharts-layer]:outline-none",
          "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-radial-bar-background-sector]:fill-muted",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
          "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-sector]:cursor-pointer",
          "[&_.recharts-surface]:outline-none",
          // Enhanced mobile-friendly legend styling
          showMobileLegend ? [
            "[&_.recharts-legend-wrapper]:text-[10px] sm:[&_.recharts-legend-wrapper]:text-xs",
            "[&_.recharts-legend-item]:cursor-pointer [&_.recharts-legend-item]:px-2 [&_.recharts-legend-item]:py-1.5 sm:[&_.recharts-legend-item]:px-1 sm:[&_.recharts-legend-item]:py-0.5",
            "[&_.recharts-legend-item]:min-h-[32px] sm:[&_.recharts-legend-item]:min-h-[24px]", // Touch-friendly legend items
            "[&_.recharts-legend-wrapper]:flex [&_.recharts-legend-wrapper]:flex-wrap [&_.recharts-legend-wrapper]:justify-center [&_.recharts-legend-wrapper]:gap-1"
          ] : "[&_.recharts-legend-wrapper]:hidden",
          // Enhanced mobile tooltip optimizations
          "[&_.recharts-tooltip-wrapper]:text-xs sm:[&_.recharts-tooltip-wrapper]:text-sm",
          "[&_.recharts-tooltip-wrapper]:pointer-events-auto",
          "[&_.recharts-tooltip-wrapper]:z-50", // Ensure tooltips appear above other content
          // Better mobile axis label positioning
          "[&_.recharts-xAxis_.recharts-cartesian-axis-tick]:text-[10px] sm:[&_.recharts-xAxis_.recharts-cartesian-axis-tick]:text-xs",
          "[&_.recharts-yAxis_.recharts-cartesian-axis-tick]:text-[10px] sm:[&_.recharts-yAxis_.recharts-cartesian-axis-tick]:text-xs",
          // Responsive margins for better mobile display
          enableMobileOptimizations && "[&_.recharts-wrapper]:!w-full [&_.recharts-wrapper]:!h-full",
          // Gesture support classes
          enableGestures && gestureState.isGesturing && "cursor-grabbing",
          enableGestures && !gestureState.isGesturing && "cursor-grab",
          className
        )}
        style={{
          ...props.style,
          ...(enableGestures ? gestureHandlers.style : {}),
          // Apply transform for gesture support
          ...(enableGestures && (chartTransform.scale !== 1 || chartTransform.translateX !== 0 || chartTransform.translateY !== 0) && {
            transform: `translate(${chartTransform.translateX}px, ${chartTransform.translateY}px) scale(${chartTransform.scale})`,
            transformOrigin: 'center center',
            transition: gestureState?.isGesturing ? 'none' : 'transform 0.2s ease-out'
          })
        }}
        {...(enableGestures && gestureHandlers && {
          onTouchStart: gestureHandlers.onTouchStart,
          onTouchMove: gestureHandlers.onTouchMove,
          onTouchEnd: gestureHandlers.onTouchEnd
        })}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        {performanceSettings.isVisible ? (
          <RechartsPrimitive.ResponsiveContainer
            width="100%"
            height="100%"
            minHeight={isMobile && enableMobileOptimizations ? 200 : 300}
            debounce={performanceSettings.shouldSimplify ? 200 : 50}
            ref={performanceSettings.chartRef}
          >
            {typeof children === 'function' ? children({
              animationDuration: enablePerformanceOptimizations ? performanceSettings.animationDuration : 300,
              maxDataPoints: enablePerformanceOptimizations ? performanceSettings.maxDataPoints : 100,
              strokeWidth: enablePerformanceOptimizations ? performanceSettings.strokeWidth : 2,
              dotSize: enablePerformanceOptimizations ? performanceSettings.dotSize : 4,
              showGrid: enablePerformanceOptimizations ? performanceSettings.showGrid : true,
              enableTooltips: enablePerformanceOptimizations ? performanceSettings.enableTooltips : true,
              enableLegend: enablePerformanceOptimizations ? performanceSettings.enableLegend : true,
              shouldSimplify: enablePerformanceOptimizations ? performanceSettings.shouldSimplify : false,
              isMobile,
              isLowPerformance: enablePerformanceOptimizations && (performanceSettings.performanceMode === 'power-save' || performanceSettings.deviceQuality === 'low')
            }) : children}
          </RechartsPrimitive.ResponsiveContainer>
        ) : (
          <div 
            className="flex items-center justify-center min-h-[200px]"
            data-testid="chart-loading-skeleton"
            ref={performanceSettings.chartRef}
          >
            <div className="text-muted-foreground text-sm">Loading chart...</div>
          </div>
        )}
        
        {/* Gesture overlay for better touch handling */}
        {enableGestures && isMobile && (
          <div 
            className="absolute inset-0 pointer-events-none z-10"
            data-testid="gesture-overlay"
            style={{
              background: gestureState.isGesturing ? 'rgba(0,0,0,0.02)' : 'transparent',
              transition: 'background 0.1s ease'
            }}
          />
        )}
        
        {/* Debug indicator for gestures in development */}
        {enableGestures && process.env.NODE_ENV === 'development' && gestureState.isGesturing && (
          <div className="absolute top-2 right-2 text-xs bg-black/80 text-white px-2 py-1 rounded z-20">
            Scale: {chartTransform.scale.toFixed(2)}
          </div>
        )}
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean
      hideIndicator?: boolean
      indicator?: "line" | "dot" | "dashed"
      nameKey?: string
      labelKey?: string
      mobilePosition?: "auto" | "top" | "bottom" | "center"
      compactMode?: boolean
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
      mobilePosition = "auto",
      compactMode = false,
    },
    ref
  ) => {
    const { config } = useChart()
    const isMobile = useIsMobile()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item?.dataKey || item?.name || "value"}`
      const itemConfig = getPayloadConfigFromPayload(config, item, key)
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        )
      }

      if (!value) {
        return null
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      config,
      labelKey,
    ])

    if (!active || !payload?.length) {
      return null
    }

    const nestLabel = payload.length === 1 && indicator !== "dot"
    const isCompact = compactMode || (isMobile && payload.length > 2)

    return (
      <div
        ref={ref}
        className={cn(
          "grid items-start gap-1.5 rounded-lg border border-border/50 bg-background shadow-xl backdrop-blur-sm",
          // Responsive sizing and positioning
          isMobile ? [
            "min-w-[6rem] max-w-[85vw] px-2 py-1.5 text-xs",
            // Better mobile positioning
            mobilePosition === "top" && "mb-4",
            mobilePosition === "bottom" && "mt-4",
            mobilePosition === "center" && "my-2"
          ] : "min-w-[8rem] max-w-[90vw] px-2.5 py-1.5 text-xs sm:text-sm",
          // Enhanced z-index for mobile
          "z-[100]",
          // Compact mode adjustments
          isCompact && "gap-1 py-1",
          className
        )}
        data-testid="chart-tooltip"
        style={{
          // Improve mobile touch interactions
          pointerEvents: 'auto',
          // Ensure tooltip is always visible on mobile
          position: isMobile ? 'fixed' : 'absolute',
        }}
      >
        {!nestLabel && !isCompact ? tooltipLabel : null}
        <div className={cn(
          "grid",
          isCompact ? "gap-0.5" : "gap-1.5"
        )}>
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            const indicatorColor = color || item.payload.fill || item.color

            return (
              <div
                key={item.dataKey}
                className={cn(
                  "flex w-full items-stretch gap-2",
                  // Mobile-friendly layout adjustments
                  isMobile && "gap-1.5",
                  // Compact mode layout
                  isCompact && "gap-1 text-xs leading-tight",
                  // Icon sizing
                  "[&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  isMobile && "[&>svg]:h-3 [&>svg]:w-3",
                  indicator === "dot" && "items-center"
                )}
                data-testid={`tooltip-item-${key}`}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                            {
                              "h-2.5 w-2.5": indicator === "dot" && !isMobile,
                              "h-3 w-3": indicator === "dot" && isMobile, // Larger for mobile
                              "w-1": indicator === "line",
                              "w-0 border-[1.5px] border-dashed bg-transparent":
                                indicator === "dashed",
                              "my-0.5": nestLabel && indicator === "dashed",
                            }
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center",
                        // Mobile text adjustments
                        isMobile && "text-xs",
                        isCompact && "text-xs leading-3"
                      )}
                    >
                      <div className={cn(
                        "grid",
                        isCompact ? "gap-0" : "gap-1.5"
                      )}>
                        {nestLabel && !isCompact ? tooltipLabel : null}
                        <span className={cn(
                          "text-muted-foreground",
                          isMobile && "text-xs",
                          isCompact && "text-xs leading-none"
                        )}>
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {item.value && (
                        <span className={cn(
                          "font-mono font-medium tabular-nums text-foreground ml-2",
                          isMobile && "text-xs",
                          isCompact && "text-xs font-normal"
                        )}>
                          {typeof item.value === 'number' && item.value > 1000 
                            ? `${(item.value / 1000).toFixed(1)}k`
                            : item.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
        
        {/* Mobile-specific compact label at bottom */}
        {isCompact && tooltipLabel && (
          <div className={cn(
            "text-xs font-medium text-center border-t border-border/30 pt-1 mt-1",
            labelClassName
          )}>
            {typeof label === "string" ? label : "Data Point"}
          </div>
        )}
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltip"

const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean
      nameKey?: string
      mobileLayout?: "horizontal" | "vertical" | "grid"
      collapsible?: boolean
      maxMobileItems?: number
    }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey, mobileLayout = "horizontal", collapsible = false, maxMobileItems = 4 },
    ref
  ) => {
    const { config } = useChart()
    const isMobile = useIsMobile()
    const [isCollapsed, setIsCollapsed] = React.useState(false)

    if (!payload?.length) {
      return null
    }

    // Handle mobile item limiting and collapsing
    const shouldShowCollapse = isMobile && collapsible && payload.length > maxMobileItems
    const visibleItems = shouldShowCollapse && isCollapsed 
      ? payload.slice(0, maxMobileItems) 
      : payload
    const hiddenCount = payload.length - visibleItems.length

    // Mobile layout classes
    const getMobileLayoutClasses = () => {
      if (!isMobile) return "flex items-center justify-center gap-4"
      
      switch (mobileLayout) {
        case "vertical":
          return "flex flex-col items-center gap-2"
        case "grid":
          return "grid grid-cols-2 gap-2 justify-items-center"
        case "horizontal":
        default:
          return "flex items-center justify-center gap-2 flex-wrap"
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          getMobileLayoutClasses(),
          verticalAlign === "top" ? "pb-3" : "pt-3",
          isMobile && "px-2", // Add padding on mobile
          className
        )}
        data-testid="chart-legend"
      >
        {visibleItems.map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5",
                // Mobile-friendly touch targets
                isMobile && "min-h-[32px] px-2 py-1",
                // Responsive icon sizing
                "[&>svg]:h-3 [&>svg]:w-3 sm:[&>svg]:h-4 sm:[&>svg]:w-4 [&>svg]:text-muted-foreground",
                // Text sizing
                "text-xs sm:text-sm"
              )}
              data-testid={`legend-item-${key}`}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className={cn(
                    "shrink-0 rounded-[2px]",
                    // Responsive indicator sizing
                    isMobile ? "h-3 w-3" : "h-2 w-2"
                  )}
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              <span className={cn(
                "truncate",
                isMobile && "max-w-[80px] sm:max-w-none"
              )}>
                {itemConfig?.label || item.value}
              </span>
            </div>
          )
        })}
        
        {/* Collapsible toggle for mobile */}
        {shouldShowCollapse && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors",
              "border border-border rounded-md min-h-[32px]"
            )}
            data-testid="legend-toggle"
          >
            {isCollapsed ? (
              <>
                <span>+{hiddenCount} more</span>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            ) : (
              <>
                <span>Show less</span>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegend"

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config]
}

// Performance utilities for chart components to consume context
export function useChartOptimizations() {
  const context = useChart()
  const isMobile = useIsMobile()
  
  const optimizeChartData = <T extends Record<string, any>>(
    data: T[], 
    keyField: string = 'x'
  ): T[] => {
    if (!context.performance?.shouldSimplify) return data
    
    const maxPoints = context.performance.maxDataPoints
    if (data.length <= maxPoints) return data
    
    const step = Math.ceil(data.length / maxPoints)
    return data.filter((_, index) => index % step === 0)
  }
  
  const getOptimizedAnimationProps = () => ({
    animationDuration: context.performance?.animationDuration ?? 300,
    isAnimationActive: context.performance ? context.performance.animationDuration > 0 : true,
    animationBegin: 0
  })
  
  const getOptimizedSeriesProps = () => ({
    strokeWidth: context.performance?.strokeWidth ?? (isMobile ? 3 : 2),
    dot: context.performance?.enableTooltips !== false,
    activeDot: context.performance?.enableTooltips !== false
  })
  
  const shouldRenderComponent = (component: 'tooltip' | 'legend' | 'grid') => {
    if (!context.performance) return true
    
    switch (component) {
      case 'tooltip': return context.performance.enableTooltips
      case 'legend': return context.performance.enableLegend
      case 'grid': return context.performance.showGrid
      default: return true
    }
  }
  
  return {
    optimizeData: optimizeChartData,
    animationProps: getOptimizedAnimationProps(),
    seriesProps: getOptimizedSeriesProps(),
    shouldRender: shouldRenderComponent,
    performance: context.performance,
    isLowPerformance: context.performance?.performanceMode === 'power-save' || context.performance?.deviceQuality === 'low'
  }
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  useChart
}
