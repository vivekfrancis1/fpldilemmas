import { useMemo, useEffect, useState } from "react"

// Performance utility functions for mobile charts
export const chartPerformanceUtils = {
  // Throttle function for resize events
  throttle: <T extends (...args: any[]) => void>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean
    return function (this: any, ...args: Parameters<T>) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  },

  // Debounce function for frequent updates
  debounce: <T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout
    return function (this: any, ...args: Parameters<T>) {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(this, args), delay)
    }
  },

  // Reduce data points for mobile
  simplifyDataForMobile: <T extends Record<string, any>>(
    data: T[],
    maxPoints: number = 50,
    keyField: string = 'x'
  ): T[] => {
    if (data.length <= maxPoints) return data
    
    const step = Math.ceil(data.length / maxPoints)
    return data.filter((_, index) => index % step === 0)
  },

  // Optimize chart colors for mobile (reduce complexity)
  getOptimizedColors: (isMobile: boolean) => ({
    primary: isMobile ? '#2563eb' : '#3b82f6',
    secondary: isMobile ? '#dc2626' : '#ef4444',
    success: isMobile ? '#16a34a' : '#22c55e',
    warning: isMobile ? '#d97706' : '#f59e0b',
    muted: isMobile ? '#64748b' : '#94a3b8'
  }),

  // Calculate optimal chart dimensions
  getOptimalDimensions: (containerWidth: number, isMobile: boolean) => {
    if (isMobile) {
      return {
        width: Math.min(containerWidth, 400),
        height: Math.min(containerWidth * 0.75, 300),
        aspectRatio: '4:3'
      }
    }
    
    return {
      width: Math.min(containerWidth, 800),
      height: Math.min(containerWidth * 0.5625, 450),
      aspectRatio: '16:9'
    }
  },

  // Reduce animation complexity on mobile
  getAnimationConfig: (isMobile: boolean, isLowEnd: boolean = false) => {
    if (isLowEnd || (isMobile && window.navigator?.hardwareConcurrency <= 4)) {
      return {
        animationBegin: 0,
        animationDuration: 0,
        isAnimationActive: false
      }
    }
    
    return {
      animationBegin: 0,
      animationDuration: isMobile ? 300 : 500,
      isAnimationActive: true
    }
  }
}

// Hook for monitoring chart performance
export function useChartPerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    lastUpdate: Date.now(),
    frameRate: 60,
    isPerformant: true
  })

  const startRenderTimer = useMemo(() => {
    let startTime = 0
    
    return {
      start: () => {
        startTime = performance.now()
      },
      end: () => {
        const renderTime = performance.now() - startTime
        setMetrics(prev => ({
          ...prev,
          renderTime,
          lastUpdate: Date.now(),
          isPerformant: renderTime < 16.67 // 60fps threshold
        }))
        return renderTime
      }
    }
  }, [])

  return { metrics, startRenderTimer }
}

// Hook for adaptive chart quality based on device capabilities
export function useAdaptiveChartQuality() {
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high')
  
  useEffect(() => {
    const assessDeviceCapabilities = () => {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      
      // Check device capabilities
      const deviceMemory = (navigator as any).deviceMemory || 4
      const hardwareConcurrency = navigator.hardwareConcurrency || 4
      const connection = (navigator as any).connection
      const effectiveType = connection?.effectiveType || '4g'
      
      // Determine quality based on capabilities
      if (deviceMemory >= 8 && hardwareConcurrency >= 8 && effectiveType === '4g') {
        setQuality('high')
      } else if (deviceMemory >= 4 && hardwareConcurrency >= 4) {
        setQuality('medium')
      } else {
        setQuality('low')
      }
    }

    assessDeviceCapabilities()
  }, [])

  const qualityConfig = useMemo(() => {
    switch (quality) {
      case 'high':
        return {
          maxDataPoints: 200,
          animationDuration: 500,
          showGrid: true,
          strokeWidth: 2,
          dotSize: 4,
          enableTooltips: true,
          enableLegend: true
        }
      case 'medium':
        return {
          maxDataPoints: 100,
          animationDuration: 300,
          showGrid: true,
          strokeWidth: 1.5,
          dotSize: 3,
          enableTooltips: true,
          enableLegend: true
        }
      case 'low':
        return {
          maxDataPoints: 50,
          animationDuration: 0,
          showGrid: false,
          strokeWidth: 1,
          dotSize: 2,
          enableTooltips: false,
          enableLegend: false
        }
    }
  }, [quality])

  return { quality, qualityConfig }
}

// Intersection Observer hook for lazy loading charts
export function useChartLazyLoading(threshold: number = 0.1) {
  const [isVisible, setIsVisible] = useState(false)
  const [ref, setRef] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!ref) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      {
        threshold,
        rootMargin: '50px'
      }
    )

    observer.observe(ref)

    return () => {
      observer.disconnect()
    }
  }, [ref, threshold])

  return { isVisible, ref: setRef }
}

// Memory management for chart data
export function useChartMemoryManagement<T>(
  data: T[],
  maxCacheSize: number = 1000
) {
  const [cachedData, setCachedData] = useState<Map<string, T[]>>(new Map())
  
  const cacheData = useMemo(() => 
    chartPerformanceUtils.debounce((key: string, newData: T[]) => {
      setCachedData(prev => {
        const newCache = new Map(prev)
        
        // Remove oldest entries if cache is full
        if (newCache.size >= maxCacheSize) {
          const firstKey = newCache.keys().next().value
          if (firstKey !== undefined) {
            newCache.delete(firstKey)
          }
        }
        
        newCache.set(key, newData)
        return newCache
      })
    }, 100), 
    [maxCacheSize]
  )
  
  const getCachedData = (key: string): T[] | undefined => {
    return cachedData.get(key)
  }
  
  const clearCache = () => {
    setCachedData(new Map())
  }
  
  return { cacheData, getCachedData, clearCache, cacheSize: cachedData.size }
}

// Battery-aware performance optimization
export function useBatteryAwarePerformance() {
  const [batteryInfo, setBatteryInfo] = useState<{
    level: number
    charging: boolean
    lowPowerMode: boolean
  }>({
    level: 1,
    charging: false,
    lowPowerMode: false
  })

  useEffect(() => {
    const getBatteryInfo = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery()
          
          const updateBatteryInfo = () => {
            setBatteryInfo({
              level: battery.level,
              charging: battery.charging,
              lowPowerMode: battery.level < 0.2 && !battery.charging
            })
          }
          
          updateBatteryInfo()
          
          battery.addEventListener('levelchange', updateBatteryInfo)
          battery.addEventListener('chargingchange', updateBatteryInfo)
          
          return () => {
            battery.removeEventListener('levelchange', updateBatteryInfo)
            battery.removeEventListener('chargingchange', updateBatteryInfo)
          }
        } catch (error) {
          console.debug('Battery API not supported')
        }
      }
    }

    getBatteryInfo()
  }, [])

  const performanceMode = useMemo(() => {
    if (batteryInfo.lowPowerMode) {
      return 'power-save'
    } else if (batteryInfo.level > 0.5 || batteryInfo.charging) {
      return 'high-performance'
    } else {
      return 'balanced'
    }
  }, [batteryInfo])

  return { batteryInfo, performanceMode }
}