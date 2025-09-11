import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { MobileChartWrapper } from "@/components/ui/mobile-chart-wrapper"
import { useChartResponsive, getResponsiveChartMargin, getResponsiveFontSizes } from "@/hooks/use-chart-responsive"
import { useIsMobile } from "@/hooks/use-mobile"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Sample data for examples
const playerPointsData = [
  { gameweek: "GW1", points: 8, expected: 7.2, name: "Salah" },
  { gameweek: "GW2", points: 12, expected: 9.8, name: "Salah" },
  { gameweek: "GW3", points: 6, expected: 8.5, name: "Salah" },
  { gameweek: "GW4", points: 15, expected: 11.2, name: "Salah" },
  { gameweek: "GW5", points: 9, expected: 8.7, name: "Salah" },
  { gameweek: "GW6", points: 14, expected: 10.1, name: "Salah" },
]

const teamGoalsData = [
  { team: "LIV", goals: 2.4, cleanSheets: 0.65, color: "#C41E3A" },
  { team: "MCI", goals: 2.8, cleanSheets: 0.72, color: "#6CABDD" },
  { team: "ARS", goals: 2.2, cleanSheets: 0.58, color: "#EF0107" },
  { team: "CHE", goals: 2.0, cleanSheets: 0.54, color: "#034694" },
  { team: "TOT", goals: 1.9, cleanSheets: 0.48, color: "#132257" },
]

const priceChangeData = [
  { date: "Mon", risers: 15, fallers: 8 },
  { date: "Tue", risers: 12, fallers: 11 },
  { date: "Wed", risers: 8, fallers: 14 },
  { date: "Thu", risers: 18, fallers: 6 },
  { date: "Fri", risers: 22, fallers: 4 },
  { date: "Sat", risers: 9, fallers: 13 },
  { date: "Sun", risers: 11, fallers: 10 },
]

const chartConfig = {
  points: {
    label: "Actual Points",
    color: "#2563eb",
  },
  expected: {
    label: "Expected Points",
    color: "#60a5fa",
  },
  goals: {
    label: "Expected Goals",
    color: "#dc2626",
  },
  cleanSheets: {
    label: "Clean Sheet %",
    color: "#16a34a",
  },
  risers: {
    label: "Price Risers",
    color: "#059669",
  },
  fallers: {
    label: "Price Fallers",
    color: "#dc2626",
  }
}

// Example 1: Mobile-Optimized Line Chart with Performance Integration
export function ResponsivePlayerPointsChart() {
  const isMobile = useIsMobile()
  const { isCompact } = useChartResponsive()
  const margins = getResponsiveChartMargin(isMobile, isCompact)
  const fontSizes = getResponsiveFontSizes(isMobile, isCompact)

  return (
    <MobileChartWrapper
      title="Player Points Trend (Performance Optimized)"
      description="Actual vs Expected FPL points with adaptive performance settings"
      collapsible={true}
      performanceMode={true}
      showMetadata={true}
      metadata={{
        lastUpdated: "2 hours ago",
        dataPoints: playerPointsData.length,
        confidence: "High"
      }}
      data-testid="player-points-chart"
    >
      <ChartContainer 
        config={chartConfig}
        mobileAspectRatio="auto"
        enableMobileOptimizations={true}
        enablePerformanceOptimizations={true}
        enableGestures={true}
        gestureConfig={{
          enableTap: true,
          enablePinch: true,
          enablePan: true
        }}
        showMobileLegend={true}
      >
        {((performanceProps?: any): React.ReactElement => {
          const optimizedData = performanceProps ? 
            (performanceProps.maxDataPoints < playerPointsData.length ? 
              playerPointsData.filter((_, i) => i % Math.ceil(playerPointsData.length / performanceProps.maxDataPoints) === 0) : 
              playerPointsData) : 
            playerPointsData
            
          return (
            <LineChart
              data={optimizedData}
              margin={margins}
            >
              {(!performanceProps || performanceProps.showGrid) && (
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              )}
              <XAxis 
                dataKey="gameweek"
                fontSize={fontSizes.axis}
                tick={{ fontSize: fontSizes.axis }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                fontSize={fontSizes.axis}
                tick={{ fontSize: fontSizes.axis }}
                tickLine={false}
                axisLine={false}
              />
              {(!performanceProps || performanceProps.enableTooltips) && (
                <ChartTooltip 
                  content={<ChartTooltipContent 
                    mobilePosition="auto"
                    compactMode={isCompact}
                  />}
                />
              )}
              {(!performanceProps || performanceProps.enableLegend) && (
                <ChartLegend 
                  content={<ChartLegendContent 
                    mobileLayout="horizontal"
                    collapsible={isMobile}
                    maxMobileItems={2}
                  />}
                />
              )}
              <Line
                type="monotone"
                dataKey="points"
                stroke="var(--color-points)"
                strokeWidth={performanceProps?.strokeWidth ?? (isMobile ? 3 : 2)}
                animationDuration={performanceProps?.animationDuration ?? 300}
                isAnimationActive={performanceProps ? performanceProps.animationDuration > 0 : true}
                dot={{ 
                  fill: "var(--color-points)",
                  strokeWidth: 2,
                  r: performanceProps?.dotSize ?? (isMobile ? 5 : 4)
                }}
                activeDot={{ 
                  r: (performanceProps?.dotSize ?? (isMobile ? 5 : 4)) + 2,
                  strokeWidth: 0
                }}
              />
              <Line
                type="monotone"
                dataKey="expected"
                stroke="var(--color-expected)"
                strokeWidth={(performanceProps?.strokeWidth ?? (isMobile ? 3 : 2)) * 0.75}
                animationDuration={performanceProps?.animationDuration ?? 300}
                isAnimationActive={performanceProps ? performanceProps.animationDuration > 0 : true}
                strokeDasharray="5 5"
                dot={{ 
                  fill: "var(--color-expected)",
                  strokeWidth: 2,
                  r: (performanceProps?.dotSize ?? (isMobile ? 4 : 3))
                }}
                activeDot={{ 
                  r: (performanceProps?.dotSize ?? (isMobile ? 4 : 3)) + 2,
                  strokeWidth: 0
                }}
              />
            </LineChart>
          )
        }) as any}
      </ChartContainer>
    </MobileChartWrapper>
  )
}

// Example 2: Mobile-Optimized Bar Chart
export function ResponsiveTeamGoalsChart() {
  const isMobile = useIsMobile()
  const { isCompact } = useChartResponsive()
  const margins = getResponsiveChartMargin(isMobile, isCompact)
  const fontSizes = getResponsiveFontSizes(isMobile, isCompact)

  return (
    <MobileChartWrapper
      title="Team Goal Projections"
      description="Expected goals and clean sheet percentages by team"
      collapsible={false}
      fullscreenEnabled={true}
      data-testid="team-goals-chart"
    >
      <ChartContainer 
        config={chartConfig}
        mobileAspectRatio="portrait"
        enableMobileOptimizations={true}
        showMobileLegend={!isCompact}
      >
        <BarChart
          data={teamGoalsData}
          margin={margins}
          barCategoryGap={isMobile ? "15%" : "20%"}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis 
            dataKey="team"
            fontSize={fontSizes.axis}
            tick={{ fontSize: fontSizes.axis }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            fontSize={fontSizes.axis}
            tick={{ fontSize: fontSizes.axis }}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip 
            content={<ChartTooltipContent 
              mobilePosition="top"
              compactMode={isCompact}
            />}
          />
          {!isCompact && (
            <ChartLegend 
              content={<ChartLegendContent 
                mobileLayout="grid"
                collapsible={false}
              />}
            />
          )}
          <Bar
            dataKey="goals"
            fill="var(--color-goals)"
            radius={[2, 2, 0, 0]}
            maxBarSize={isMobile ? 40 : 60}
          />
        </BarChart>
      </ChartContainer>
    </MobileChartWrapper>
  )
}

// Example 3: Mobile-Optimized Area Chart
export function ResponsivePriceChangesChart() {
  const isMobile = useIsMobile()
  const { isCompact } = useChartResponsive()
  const margins = getResponsiveChartMargin(isMobile, isCompact)
  const fontSizes = getResponsiveFontSizes(isMobile, isCompact)

  return (
    <MobileChartWrapper
      title="Daily Price Changes"
      description="FPL player price risers vs fallers throughout the week"
      collapsible={true}
      performanceMode={true}
      data-testid="price-changes-chart"
    >
      <ChartContainer 
        config={chartConfig}
        mobileAspectRatio="landscape"
        enableMobileOptimizations={true}
        showMobileLegend={true}
      >
        <AreaChart
          data={priceChangeData}
          margin={margins}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis 
            dataKey="date"
            fontSize={fontSizes.axis}
            tick={{ fontSize: fontSizes.axis }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            fontSize={fontSizes.axis}
            tick={{ fontSize: fontSizes.axis }}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip 
            content={<ChartTooltipContent 
              mobilePosition="center"
              compactMode={isCompact}
            />}
          />
          <ChartLegend 
            content={<ChartLegendContent 
              mobileLayout="horizontal"
              collapsible={isMobile}
              maxMobileItems={2}
            />}
          />
          <Area
            type="monotone"
            dataKey="fallers"
            stackId="1"
            stroke="var(--color-fallers)"
            fill="var(--color-fallers)"
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="risers"
            stackId="1"
            stroke="var(--color-risers)"
            fill="var(--color-risers)"
            fillOpacity={0.6}
          />
        </AreaChart>
      </ChartContainer>
    </MobileChartWrapper>
  )
}

// Example 4: Mobile-Optimized Pie Chart
export function ResponsivePositionDistributionChart() {
  const isMobile = useIsMobile()
  
  const positionData = [
    { position: "Goalkeepers", count: 15, percentage: 15, color: "#FFA500" },
    { position: "Defenders", count: 35, percentage: 35, color: "#4169E1" },
    { position: "Midfielders", count: 35, percentage: 35, color: "#32CD32" },
    { position: "Forwards", count: 15, percentage: 15, color: "#DC143C" },
  ]

  return (
    <MobileChartWrapper
      title="Squad Position Distribution"
      description="Breakdown of FPL squad by player positions"
      collapsible={true}
      data-testid="position-distribution-chart"
    >
      <ChartContainer 
        config={{
          goalkeepers: { label: "GK", color: "#FFA500" },
          defenders: { label: "DEF", color: "#4169E1" },
          midfielders: { label: "MID", color: "#32CD32" },
          forwards: { label: "FWD", color: "#DC143C" }
        }}
        mobileAspectRatio="square"
        enableMobileOptimizations={true}
        showMobileLegend={true}
      >
        <PieChart>
          <Pie
            data={positionData}
            dataKey="count"
            nameKey="position"
            cx="50%"
            cy="50%"
            outerRadius={isMobile ? 60 : 80}
            innerRadius={isMobile ? 30 : 40}
            strokeWidth={2}
            stroke="var(--color-background)"
          >
            {positionData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <ChartTooltip 
            content={<ChartTooltipContent 
              mobilePosition="center"
              formatter={(value, name) => [
                `${value} players (${positionData.find(d => d.position === name)?.percentage}%)`,
                name
              ]}
            />}
          />
          <ChartLegend 
            content={<ChartLegendContent 
              mobileLayout="grid"
              collapsible={false}
            />}
          />
        </PieChart>
      </ChartContainer>
    </MobileChartWrapper>
  )
}

// Example usage demonstration component
export function ChartExamplesDemo() {
  return (
    <div className="space-y-6 p-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Responsive Chart Examples</h1>
        <p className="text-muted-foreground">
          Mobile-optimized charts with touch-friendly interactions
        </p>
      </div>
      
      <div className="grid gap-6">
        <ResponsivePlayerPointsChart />
        <ResponsiveTeamGoalsChart />
        <ResponsivePriceChangesChart />
        <ResponsivePositionDistributionChart />
      </div>
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Mobile Optimization Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">Responsive Features:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Adaptive aspect ratios (4:3 mobile, 16:9 desktop)</li>
                <li>• Touch-friendly chart targets (larger dots/bars)</li>
                <li>• Responsive margins and font sizes</li>
                <li>• Mobile-optimized tooltips with better positioning</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Interactive Features:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Collapsible legends with horizontal layout</li>
                <li>• Fullscreen mode for detailed viewing</li>
                <li>• Lazy loading for better performance</li>
                <li>• Gesture support (tap, pinch, pan)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}