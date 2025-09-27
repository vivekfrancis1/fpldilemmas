import { useState, useEffect, useMemo, useRef } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useBatteryAwarePerformance, useAdaptiveChartQuality } from "@/lib/chart-performance"

interface ChartResponsiveConfig {
  mobileAspectRatio?: "square" | "portrait" | "landscape" | "auto"
  enableMobileOptimizations?: boolean
  showMobileLegend?: boolean
  mobileHeight?: number
  desktopHeight?: number
  breakpoint?: number
}

interface ChartDimensions {
  width: number
  height: number
  aspectRatio: string
  isMobile: boolean
  isCompact: boolean
}

export function useChartResponsive(config: ChartResponsiveConfig & { isMobile?: boolean } = {}): ChartDimensions {
  const {
    mobileAspectRatio = "auto",
    enableMobileOptimizations = true,
    mobileHeight = 200,
    desktopHeight = 300,
    breakpoint = 768,
    isMobile: passedIsMobile
  } = config

  // Use passed mobile state or fallback to direct hook call if not provided
  const isMobile = passedIsMobile ?? false
  const [dimensions, setDimensions] = useState<ChartDimensions>({
    width: 0,
    height: 0,
    aspectRatio: "",
    isMobile: false,
    isCompact: false
  })

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth
      const isMobileView = width < breakpoint
      const isCompactView = width < 480 // Extra small screens

      let aspectRatio = "aspect-video"
      let height = desktopHeight

      if (enableMobileOptimizations && isMobileView) {
        height = mobileHeight
        
        switch (mobileAspectRatio) {
          case "square":
            aspectRatio = "aspect-square"
            break
          case "portrait":
            aspectRatio = "aspect-[3/4]"
            break
          case "landscape":
            aspectRatio = "aspect-video"
            break
          case "auto":
          default:
            aspectRatio = isCompactView ? "aspect-[4/3]" : "aspect-[5/3]"
            break
        }
      }

      setDimensions({
        width,
        height,
        aspectRatio,
        isMobile: isMobileView,
        isCompact: isCompactView
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    
    return () => window.removeEventListener('resize', updateDimensions)
  }, [mobileAspectRatio, enableMobileOptimizations, mobileHeight, desktopHeight, breakpoint])

  return dimensions
}

interface ChartGestureConfig {
  enablePinch?: boolean
  enablePan?: boolean
  enableTap?: boolean
  onTap?: (event: TouchEvent, coordinates: { x: number; y: number }) => void
  onPinch?: (scale: number) => void
  onPan?: (delta: { x: number; y: number }) => void
}

export function useChartGestures(config: ChartGestureConfig = {}) {
  const {
    enablePinch = false,
    enablePan = false,
    enableTap = true,
    onTap,
    onPinch,
    onPan
  } = config

  const [gestureState, setGestureState] = useState({
    isGesturing: false,
    scale: 1,
    position: { x: 0, y: 0 },
    transform: { scale: 1, translateX: 0, translateY: 0 }
  })

  // Ref to track initial gesture state
  const gestureRef = useRef({
    initialPinchDistance: 0,
    initialScale: 1,
    lastPanPosition: { x: 0, y: 0 },
    startTime: 0
  })

  const handleTouchStart = useMemo(() => (event: TouchEvent) => {
    if (!enableTap && !enablePinch && !enablePan) return

    const touch = event.touches[0]
    const currentTime = Date.now()
    
    // Initialize gesture state
    setGestureState(prev => ({ 
      ...prev, 
      isGesturing: true,
      position: { x: touch.clientX, y: touch.clientY }
    }))

    // Initialize reference values
    gestureRef.current.startTime = currentTime
    gestureRef.current.lastPanPosition = { x: touch.clientX, y: touch.clientY }

    // For pinch gestures, calculate initial distance
    if (enablePinch && event.touches.length === 2) {
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      const initialDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      gestureRef.current.initialPinchDistance = initialDistance
      gestureRef.current.initialScale = gestureState.scale
    }
  }, [enableTap, enablePinch, enablePan, gestureState.scale])

  const handleTouchMove = useMemo(() => (event: TouchEvent) => {
    if (!gestureState.isGesturing) return

    event.preventDefault() // Prevent scrolling during gestures

    // Handle pinch gesture with relative scale calculation
    if (enablePinch && event.touches.length === 2 && onPinch && gestureRef.current.initialPinchDistance > 0) {
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      
      // Calculate relative scale based on initial distance
      const relativeScale = currentDistance / gestureRef.current.initialPinchDistance
      const newScale = Math.max(0.5, Math.min(3, gestureRef.current.initialScale * relativeScale))
      
      onPinch(newScale)
      setGestureState(prev => ({ 
        ...prev, 
        scale: newScale,
        transform: { ...prev.transform, scale: newScale }
      }))
    }

    // Handle pan gesture with proper delta calculation
    if (enablePan && event.touches.length === 1 && onPan) {
      const touch = event.touches[0]
      const delta = {
        x: touch.clientX - gestureRef.current.lastPanPosition.x,
        y: touch.clientY - gestureRef.current.lastPanPosition.y
      }
      
      // Only trigger pan if movement is significant (reduces jitter)
      if (Math.abs(delta.x) > 1 || Math.abs(delta.y) > 1) {
        onPan(delta)
        setGestureState(prev => ({
          ...prev,
          position: { x: touch.clientX, y: touch.clientY },
          transform: {
            ...prev.transform,
            translateX: prev.transform.translateX + delta.x,
            translateY: prev.transform.translateY + delta.y
          }
        }))
        
        // Update last position for next delta calculation
        gestureRef.current.lastPanPosition = { x: touch.clientX, y: touch.clientY }
      }
    }
  }, [gestureState.isGesturing, enablePinch, enablePan, onPinch, onPan])

  const handleTouchEnd = useMemo(() => (event: TouchEvent) => {
    if (!gestureState.isGesturing) return

    const touchDuration = Date.now() - gestureRef.current.startTime
    const wasQuickTap = touchDuration < 200 // Consider taps under 200ms

    // Handle tap gesture (only for quick taps with minimal movement)
    if (enableTap && event.changedTouches.length === 1 && onTap && wasQuickTap) {
      const touch = event.changedTouches[0]
      const startPos = gestureRef.current.lastPanPosition
      const endPos = { x: touch.clientX, y: touch.clientY }
      const movement = Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y)
      
      // Only trigger tap if movement was minimal (< 10px)
      if (movement < 10) {
        onTap(event, endPos)
      }
    }

    // Reset gesture state
    setGestureState(prev => ({ ...prev, isGesturing: false }))
    
    // Reset reference values
    gestureRef.current.initialPinchDistance = 0
    gestureRef.current.startTime = 0
  }, [gestureState.isGesturing, enableTap, onTap])

  const gestureHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    // Add passive false to allow preventDefault
    style: { touchAction: (enablePinch || enablePan) ? 'none' : 'auto' }
  }

  // Function to reset transform state
  const resetTransform = useMemo(() => () => {
    setGestureState(prev => ({
      ...prev,
      scale: 1,
      transform: { scale: 1, translateX: 0, translateY: 0 }
    }))
    gestureRef.current.initialScale = 1
  }, [])

  return { 
    gestureState, 
    gestureHandlers, 
    resetTransform,
    // Expose current transform for charts
    currentTransform: gestureState.transform
  }
}

interface ChartPerformanceConfig {
  enableLazyLoading?: boolean
  throttleResize?: number
  reduceAnimations?: boolean
  simplifyOnMobile?: boolean
}

export function useChartPerformance(config: ChartPerformanceConfig & { isMobile?: boolean } = {}) {
  const {
    enableLazyLoading = true,
    throttleResize = 100,
    reduceAnimations = false,
    simplifyOnMobile = true,
    isMobile: passedIsMobile
  } = config

  // Use passed mobile state or fallback to false if not provided
  const isMobile = passedIsMobile ?? false
  const [isVisible, setIsVisible] = useState(!enableLazyLoading)
  const [shouldSimplify, setShouldSimplify] = useState(false)

  // Always call hooks consistently - no conditional hook usage
  const batteryPerformance = useBatteryAwarePerformance()
  const adaptiveQuality = useAdaptiveChartQuality()

  // Extract values after hooks are called
  const { batteryInfo, performanceMode } = batteryPerformance
  const { quality, qualityConfig } = adaptiveQuality

  // Combined performance state considering mobile, battery, and device capabilities
  useEffect(() => {
    let needsSimplification = false
    
    // Mobile simplification
    if (simplifyOnMobile && isMobile) {
      needsSimplification = true
    }
    
    // Battery-aware simplification
    if (performanceMode === 'power-save') {
      needsSimplification = true
    }
    
    // Device capability simplification
    if (quality === 'low') {
      needsSimplification = true
    }
    
    setShouldSimplify(needsSimplification)
  }, [simplifyOnMobile, isMobile, performanceMode, quality])

  const observerRef = useMemo(() => {
    if (!enableLazyLoading || typeof IntersectionObserver === 'undefined') {
      return null
    }

    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        })
      },
      { rootMargin: '50px' }
    )
  }, [enableLazyLoading])

  const chartRef = useMemo(() => {
    let currentElement: HTMLElement | null = null
    
    return (element: HTMLElement | null) => {
      // Cleanup previous element if any
      if (currentElement && observerRef) {
        observerRef.unobserve(currentElement)
      }
      
      // Set new element
      currentElement = element
      
      // Observe new element if available
      if (observerRef && element) {
        observerRef.observe(element)
      }
      
      // Callback refs should not return anything
    }
  }, [observerRef])

  const getPerformanceProps = () => {
    // Base performance settings
    let animationDuration = 300
    let maxDataPoints = 100
    let updateInterval = 500
    
    // Apply quality-based adjustments
    if (qualityConfig) {
      animationDuration = qualityConfig.animationDuration
      maxDataPoints = qualityConfig.maxDataPoints
    }
    
    // Apply battery-aware adjustments
    switch (performanceMode) {
      case 'power-save':
        animationDuration = 0
        maxDataPoints = Math.min(maxDataPoints, 30)
        updateInterval = 2000
        break
      case 'balanced':
        animationDuration = Math.min(animationDuration, 200)
        maxDataPoints = Math.min(maxDataPoints, 75)
        updateInterval = 1000
        break
      case 'high-performance':
        // Use quality config as-is
        break
    }
    
    // Apply manual overrides
    if (reduceAnimations || shouldSimplify) {
      animationDuration = 0
    }
    
    if (shouldSimplify) {
      maxDataPoints = Math.min(maxDataPoints, 50)
      updateInterval = Math.max(updateInterval, 1000)
    }

    return {
      isVisible,
      shouldSimplify,
      animationDuration,
      updateInterval,
      maxDataPoints,
      // Expose additional quality-based settings
      strokeWidth: qualityConfig?.strokeWidth || (shouldSimplify ? 1 : 2),
      dotSize: qualityConfig?.dotSize || (shouldSimplify ? 2 : 4),
      showGrid: qualityConfig?.showGrid !== false && !shouldSimplify,
      enableTooltips: qualityConfig?.enableTooltips !== false && !shouldSimplify,
      enableLegend: qualityConfig?.enableLegend !== false,
      // Battery and performance info
      batteryLevel: batteryInfo.level,
      isCharging: batteryInfo.charging,
      lowPowerMode: batteryInfo.lowPowerMode,
      performanceMode,
      deviceQuality: quality
    }
  }

  return { chartRef, ...getPerformanceProps() }
}

export function getResponsiveChartMargin(isMobile: boolean, isCompact: boolean) {
  if (isCompact) {
    return { top: 10, right: 10, bottom: 20, left: 20 }
  }
  
  if (isMobile) {
    return { top: 15, right: 15, bottom: 30, left: 25 }
  }
  
  return { top: 20, right: 30, bottom: 40, left: 40 }
}

export function getResponsiveFontSizes(isMobile: boolean, isCompact: boolean) {
  return {
    tooltip: isCompact ? 10 : isMobile ? 11 : 12,
    axis: isCompact ? 9 : isMobile ? 10 : 11,
    legend: isCompact ? 9 : isMobile ? 10 : 12,
    title: isCompact ? 12 : isMobile ? 14 : 16
  }
}