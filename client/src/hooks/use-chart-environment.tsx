import { useMemo } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useChartGestures, useChartPerformance } from "@/hooks/use-chart-responsive"
import { useBatteryAwarePerformance, useAdaptiveChartQuality } from "@/lib/chart-performance"

interface ChartEnvironmentConfig {
  // Mobile configuration
  mobileAspectRatio?: "square" | "portrait" | "landscape" | "auto"
  enableMobileOptimizations?: boolean
  showMobileLegend?: boolean
  
  // Gesture configuration
  gestureConfig?: {
    enablePinch?: boolean
    enablePan?: boolean
    enableTap?: boolean
    onPinch?: (scale: number) => void
    onPan?: (delta: { x: number; y: number }) => void
    onTap?: (event: TouchEvent, coordinates: { x: number; y: number }) => void
  }
  enableGestures?: boolean
  
  // Performance configuration
  performanceConfig?: {
    enableLazyLoading?: boolean
    throttleResize?: number
    reduceAnimations?: boolean
    simplifyOnMobile?: boolean
  }
  enablePerformanceOptimizations?: boolean
}

/**
 * Unified chart environment hook that calls ALL chart-related hooks unconditionally
 * to ensure stable hook call order and prevent "Rendered more hooks than during the previous render" errors
 */
export function useChartEnvironment(config: ChartEnvironmentConfig = {}) {
  const {
    // Mobile config with defaults
    mobileAspectRatio = "auto",
    enableMobileOptimizations = true,
    showMobileLegend = true,
    
    // Gesture config with defaults
    gestureConfig = {},
    enableGestures = false,
    
    // Performance config with defaults
    performanceConfig = {},
    enablePerformanceOptimizations = true
  } = config

  // CRITICAL: Call ALL hooks unconditionally in same order every render
  const isMobile = useIsMobile()
  
  // Always call battery and adaptive quality hooks - never conditionally
  const batteryPerformance = useBatteryAwarePerformance()
  const adaptiveQuality = useAdaptiveChartQuality()
  
  // Create stable gesture config to avoid dependency cycles
  const stableGestureConfig = useMemo(() => ({
    enablePinch: gestureConfig.enablePinch || false,
    enablePan: gestureConfig.enablePan || false,
    enableTap: gestureConfig.enableTap !== false,
    onPinch: gestureConfig.onPinch,
    onPan: gestureConfig.onPan,
    onTap: gestureConfig.onTap
  }), [
    gestureConfig.enablePinch,
    gestureConfig.enablePan,
    gestureConfig.enableTap,
    gestureConfig.onPinch,
    gestureConfig.onPan,
    gestureConfig.onTap
  ])
  
  // Always call gesture hook - even if gestures are disabled
  const gestureSystem = useChartGestures(stableGestureConfig)
  
  // Always call performance hook - even if optimizations are disabled
  const performanceSystem = useChartPerformance({
    ...performanceConfig,
    simplifyOnMobile: enablePerformanceOptimizations && performanceConfig.simplifyOnMobile !== false
  })

  // Return stable environment object with all computed values
  return useMemo(() => {
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

    return {
      // Mobile environment
      mobile: {
        isMobile,
        aspectRatio: getAspectRatio(),
        enableOptimizations: enableMobileOptimizations,
        showLegend: showMobileLegend
      },
      
      // Gesture environment (available but conditionally used)
      gestures: enableGestures ? {
        state: gestureSystem.gestureState,
        handlers: gestureSystem.gestureHandlers,
        resetTransform: gestureSystem.resetTransform,
        currentTransform: gestureSystem.currentTransform
      } : {
        state: undefined,
        handlers: { style: {} },
        resetTransform: () => {},
        currentTransform: { scale: 1, translateX: 0, translateY: 0 }
      },
      
      // Performance environment (available but conditionally used)
      performance: enablePerformanceOptimizations ? {
        isVisible: performanceSystem.isVisible,
        shouldSimplify: performanceSystem.shouldSimplify,
        animationDuration: performanceSystem.animationDuration,
        maxDataPoints: performanceSystem.maxDataPoints,
        strokeWidth: performanceSystem.strokeWidth,
        dotSize: performanceSystem.dotSize,
        showGrid: performanceSystem.showGrid,
        enableTooltips: performanceSystem.enableTooltips,
        enableLegend: performanceSystem.enableLegend,
        performanceMode: performanceSystem.performanceMode,
        deviceQuality: performanceSystem.deviceQuality,
        chartRef: performanceSystem.chartRef
      } : {
        isVisible: true,
        shouldSimplify: false,
        animationDuration: 300,
        maxDataPoints: 100,
        strokeWidth: 2,
        dotSize: 4,
        showGrid: true,
        enableTooltips: true,
        enableLegend: true,
        performanceMode: 'high-performance' as const,
        deviceQuality: 'high' as const,
        chartRef: () => {}
      },
      
      // Raw access to underlying systems for advanced use cases
      _internal: {
        batteryInfo: batteryPerformance.batteryInfo,
        adaptiveQuality: adaptiveQuality.quality,
        enableGestures,
        enablePerformanceOptimizations
      }
    }
  }, [
    isMobile,
    mobileAspectRatio,
    enableMobileOptimizations,
    showMobileLegend,
    enableGestures,
    gestureSystem.gestureState,
    gestureSystem.gestureHandlers,
    gestureSystem.resetTransform,
    gestureSystem.currentTransform,
    enablePerformanceOptimizations,
    performanceSystem.isVisible,
    performanceSystem.shouldSimplify,
    performanceSystem.animationDuration,
    performanceSystem.maxDataPoints,
    performanceSystem.strokeWidth,
    performanceSystem.dotSize,
    performanceSystem.showGrid,
    performanceSystem.enableTooltips,
    performanceSystem.enableLegend,
    performanceSystem.performanceMode,
    performanceSystem.deviceQuality,
    performanceSystem.chartRef,
    batteryPerformance.batteryInfo,
    adaptiveQuality.quality
  ])
}