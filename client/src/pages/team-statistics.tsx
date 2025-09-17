import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Trophy } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { MobileChartWrapper } from "@/components/ui/mobile-chart-wrapper";
import { useChartResponsive, getResponsiveChartMargin, getResponsiveFontSizes } from "@/hooks/use-chart-responsive";
import { useIsMobile } from "@/hooks/use-mobile";
import { EnhancedTable, TableColumn, TeamBadge } from "@/components/enhanced-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TeamStats } from "@shared/schema";

interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

// Team name cell component
const TeamNameCell = ({ 
  name, 
  shortName, 
  position,
  points,
  className 
}: { 
  name: string; 
  shortName: string; 
  position?: number;
  points?: number;
  className?: string;
}) => (
  <div className={cn("flex flex-col", className)}>
    <div className="font-semibold text-gray-900">
      {name}
    </div>
    <div className="flex items-center gap-2 mt-1">
      <TeamBadge team={shortName} compact={true} />
      {position && (
        <span className="text-xs text-gray-500">
          Pos: {position}
        </span>
      )}
      {points !== undefined && (
        <span className="text-xs text-gray-600 font-medium">
          {points} pts
        </span>
      )}
    </div>
  </div>
);

// Form badge component
const FormBadge = ({ form }: { form: string }) => {
  const getFormColor = (result: string) => {
    switch (result?.toUpperCase()) {
      case 'W': return 'bg-green-100 text-green-800 border-green-200';
      case 'D': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'L': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex items-center gap-1">
      {form?.split('').slice(-5).map((result, index) => (
        <Badge 
          key={index} 
          className={cn(
            "text-xs font-medium px-1.5 py-0.5 border",
            getFormColor(result)
          )}
        >
          {result}
        </Badge>
      ))}
    </div>
  );
};

// Confidence indicator
const ConfidenceIndicator = ({ confidence }: { confidence: string }) => {
  const getConfidenceColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Badge className={cn("text-xs font-medium", getConfidenceColor(confidence))}>
      {confidence}
    </Badge>
  );
};

export default function TeamStatistics() {
  const [sort, setSort] = useState<SortState>({
    field: "currentStats.position",
    direction: "asc",
  });

  // Fetch team statistics data
  const { data: teamStats, isLoading, error } = useQuery<TeamStats[]>({
    queryKey: ["/api/team-statistics"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle sorting
  const handleSort = (field: string) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sort data
  const sortedData = teamStats ? [...teamStats].sort((a, b) => {
    const getValue = (obj: TeamStats, path: string) => {
      return path.split('.').reduce((o: any, p: string) => o?.[p], obj);
    };

    const aValue = getValue(a, sort.field);
    const bValue = getValue(b, sort.field);

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return sort.direction === 'asc' ? result : -result;
  }) : [];

  // Define table columns
  const columns: TableColumn<TeamStats>[] = [
    {
      key: "name",
      header: "Team",
      sortable: true,
      className: "min-w-[200px]",
      render: (_, team) => (
        <TeamNameCell 
          name={team.name}
          shortName={team.shortName}
          position={team.currentStats.position}
          points={team.currentStats.points}
        />
      )
    },
    {
      key: "currentStats.position",
      header: "Position",
      sortable: true,
      align: "center",
      className: "w-20",
      render: (value) => (
        <div className="flex items-center justify-center">
          <Badge className="bg-indigo-100 text-indigo-800 font-semibold">
            {value}
          </Badge>
        </div>
      )
    },
    {
      key: "currentStats.points",
      header: "Points",
      sortable: true,
      align: "right",
      className: "w-20",
      render: (value) => (
        <span className="font-semibold text-gray-900">{value || 0}</span>
      )
    },
    {
      key: "currentStats.form",
      header: "Form",
      sortable: false,
      className: "min-w-[120px]",
      render: (value) => value ? <FormBadge form={value} /> : <span className="text-gray-400">-</span>
    },
    {
      key: "currentStats.goalsScored",
      header: "Goals For",
      sortable: true,
      align: "right",
      className: "w-24",
      render: (value) => (
        <span className="font-medium text-green-700">{value || 0}</span>
      )
    },
    {
      key: "currentStats.goalsConceded",
      header: "Goals Against",
      sortable: true,
      align: "right",
      className: "w-24",
      render: (value) => (
        <span className="font-medium text-red-700">{value || 0}</span>
      )
    },
    {
      key: "currentStats.cleanSheets",
      header: "Clean Sheets",
      sortable: true,
      align: "right",
      className: "w-24",
      render: (value) => (
        <span className="font-medium text-blue-700">{value || 0}</span>
      )
    },
    {
      key: "projectedStats.expectedGoals",
      header: "xG",
      sortable: true,
      align: "right",
      className: "w-20",
      render: (value, team) => (
        <div className="flex flex-col items-end">
          <span className="font-medium text-gray-900">
            {typeof value === 'number' ? value.toFixed(1) : '0.0'}
          </span>
          {team.confidence?.goals && (
            <ConfidenceIndicator confidence={team.confidence.goals} />
          )}
        </div>
      )
    },
    {
      key: "projectedStats.expectedGoalsConceded",
      header: "xGC",
      sortable: true,
      align: "right",
      className: "w-20",
      render: (value, team) => (
        <div className="flex flex-col items-end">
          <span className="font-medium text-gray-900">
            {typeof value === 'number' ? value.toFixed(1) : '0.0'}
          </span>
          {team.confidence?.cleanSheets && (
            <ConfidenceIndicator confidence={team.confidence.cleanSheets} />
          )}
        </div>
      )
    },
    {
      key: "projectedStats.expectedAssists",
      header: "xA",
      sortable: true,
      align: "right",
      className: "w-20",
      render: (value, team) => (
        <div className="flex flex-col items-end">
          <span className="font-medium text-gray-900">
            {typeof value === 'number' ? value.toFixed(1) : '0.0'}
          </span>
          {team.confidence?.assists && (
            <ConfidenceIndicator confidence={team.confidence.assists} />
          )}
        </div>
      )
    },
    {
      key: "currentStats.strengthAttackHome",
      header: "Att. Home",
      sortable: true,
      align: "right",
      className: "w-24",
      render: (value) => (
        <span className="text-sm font-medium text-gray-700">{value || 0}</span>
      )
    },
    {
      key: "currentStats.strengthAttackAway",
      header: "Att. Away",
      sortable: true,
      align: "right",
      className: "w-24",
      render: (value) => (
        <span className="text-sm font-medium text-gray-700">{value || 0}</span>
      )
    },
    {
      key: "currentStats.strengthDefenceHome",
      header: "Def. Home",
      sortable: true,
      align: "right",
      className: "w-24",
      render: (value) => (
        <span className="text-sm font-medium text-gray-700">{value || 0}</span>
      )
    },
    {
      key: "currentStats.strengthDefenceAway",
      header: "Def. Away",
      sortable: true,
      align: "right",
      className: "w-24",
      render: (value) => (
        <span className="text-sm font-medium text-gray-700">{value || 0}</span>
      )
    }
  ];

  // Chart data preparation - team performance visualization
  const chartData = sortedData.slice(0, 20).map((team) => ({
    name: team.shortName,
    points: team.currentStats.points || 0,
    xG: team.projectedStats.expectedGoals || 0,
    xGC: team.projectedStats.expectedGoalsConceded || 0,
    position: team.currentStats.position || 20
  }));

  const chartConfig = {
    points: {
      label: "League Points",
      color: "#2563eb",
    },
    xG: {
      label: "Expected Goals",
      color: "#dc2626",
    }
  };

  if (error) {
    return (
      <div className="fpl-page-wrapper">
        <div className="fpl-container fpl-content-area">
          <div className="fpl-error" data-testid="error-state">
            <h1 className="fpl-error-title">Failed to load team data</h1>
            <p className="fpl-error-message">Unable to connect to FPL API. Please check your connection and try again.</p>
            <button 
              className="fpl-error-button"
              onClick={() => window.location.reload()}
              data-testid="button-retry"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-page-wrapper">
      <div className="fpl-container fpl-content-area fpl-section-spacing px-2 sm:px-4">
        {/* Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Trophy className="h-8 w-8" />
              <h1>Team Statistics</h1>
            </div>
            <p className="fpl-page-subtitle">
              Comprehensive team performance analysis including current league standings, expected statistics, and strength ratings for informed FPL decisions
            </p>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 mobile-stats-card">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4" data-testid="text-quick-stats-title">
              League Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4">
                <div className="text-2xl sm:text-3xl font-bold text-blue-700 mb-1">
                  {teamStats?.length || 0}
                </div>
                <div className="text-xs sm:text-sm text-blue-600 font-medium">
                  Teams
                </div>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 sm:p-4">
                <div className="text-2xl sm:text-3xl font-bold text-green-700 mb-1">
                  {teamStats?.reduce((sum, team) => sum + (team.currentStats.points || 0), 0) || 0}
                </div>
                <div className="text-xs sm:text-sm text-green-600 font-medium">
                  Total Points
                </div>
              </div>
              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-3 sm:p-4">
                <div className="text-2xl sm:text-3xl font-bold text-yellow-700 mb-1">
                  {teamStats?.reduce((sum, team) => sum + (team.currentStats.goalsScored || 0), 0) || 0}
                </div>
                <div className="text-xs sm:text-sm text-yellow-600 font-medium">
                  Total Goals
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3 sm:p-4">
                <div className="text-2xl sm:text-3xl font-bold text-purple-700 mb-1">
                  {teamStats?.reduce((sum, team) => sum + (team.currentStats.cleanSheets || 0), 0) || 0}
                </div>
                <div className="text-xs sm:text-sm text-purple-600 font-medium">
                  Clean Sheets
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Statistics Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <EnhancedTable
            data={sortedData}
            columns={columns}
            onSort={handleSort}
            sortField={sort.field}
            sortDirection={sort.direction}
            loading={isLoading}
            emptyMessage="No team data available"
            stickyHeader={true}
            className="min-h-[400px]"
          />
        </div>

        {/* Team Performance Chart with Performance Optimizations */}
        {chartData.length > 0 && (
          <MobileChartWrapper
            title="Team Performance Overview"
            description={`League points vs expected goals analysis (${chartData.length} teams)`}
            collapsible={true}
            performanceMode={true}
            showMetadata={true}
            metadata={{
              lastUpdated: "Live data",
              dataPoints: chartData.length,
              confidence: "High"
            }}
            className="mt-6"
            data-testid="team-performance-chart"
          >
            <ChartContainer 
              config={chartConfig}
              mobileAspectRatio="auto"
              enableMobileOptimizations={true}
              enablePerformanceOptimizations={true}
              showMobileLegend={true}
            >
              {((performanceProps?: any) => {
                const isMobile = useIsMobile()
                const { isCompact } = useChartResponsive()
                const margins = getResponsiveChartMargin(isMobile, isCompact)
                const fontSizes = getResponsiveFontSizes(isMobile, isCompact)
                
                // Apply performance optimizations - reduce data points on mobile/low-performance devices
                const optimizedData = performanceProps && performanceProps.maxDataPoints < chartData.length
                  ? chartData.slice(0, performanceProps.maxDataPoints)
                  : chartData
                
                return (
                  <LineChart
                    data={optimizedData}
                    margin={margins}
                  >
                    {/* Conditionally render grid based on performance */}
                    {(!performanceProps || performanceProps.showGrid) && (
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    )}
                    <XAxis 
                      dataKey="name"
                      fontSize={fontSizes.axis}
                      tick={{ fontSize: fontSizes.axis }}
                      tickLine={false}
                      axisLine={false}
                      interval={performanceProps?.shouldSimplify ? 1 : 0}
                    />
                    <YAxis 
                      fontSize={fontSizes.axis}
                      tick={{ fontSize: fontSizes.axis }}
                      tickLine={false}
                      axisLine={false}
                    />
                    
                    {/* Conditionally render tooltip based on performance */}
                    {(!performanceProps || performanceProps.enableTooltips) && (
                      <ChartTooltip 
                        content={<ChartTooltipContent 
                          mobilePosition="auto"
                          compactMode={isCompact}
                          formatter={(value, name) => [
                            typeof value === 'number' ? value.toFixed(1) : value,
                            name
                          ]}
                        />}
                      />
                    )}
                    
                    {/* Conditionally render legend based on performance */}
                    {(!performanceProps || performanceProps.enableLegend) && !isCompact && (
                      <ChartLegend 
                        content={<ChartLegendContent 
                          mobileLayout="horizontal"
                          collapsible={false}
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
                  </LineChart>
                )
              }) as any}
            </ChartContainer>
          </MobileChartWrapper>
        )}

        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="loading-state">
            <div className="bg-white rounded-lg p-8 flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-700 font-medium">
                Loading team statistics...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}