import React from 'react';
import { ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface TableColumn<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (value: any, item: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface EnhancedTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  onSort?: (field: string) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  stickyHeader?: boolean;
  compact?: boolean;
  highlightRow?: (item: T, index: number) => boolean;
  maxHeight?: string;
}

export function EnhancedTable<T = any>({
  data,
  columns,
  onSort,
  sortField,
  sortDirection,
  loading = false,
  emptyMessage = "No data available",
  className,
  stickyHeader = false,
  compact = false,
  highlightRow,
  maxHeight
}: EnhancedTableProps<T>) {
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-3 h-3" /> 
      : <ChevronDown className="w-3 h-3" />;
  };

  const handleSort = (field: string) => {
    if (onSort) {
      onSort(field);
    }
  };

  const getAlignment = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-4 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = Math.max(0, scrollContainerRef.current.scrollLeft - 200);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += 200;
    }
  };

  const scrollToStart = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  };

  return (
    <div className={cn(
      "rounded-lg border bg-white shadow-sm overflow-hidden",
      className
    )}>
      {/* Scroll Controls - Mobile Optimized */}
      <div className="flex justify-between items-center px-2 sm:px-4 py-2 bg-gray-50 border-b">
        <div className="flex gap-1 sm:gap-2">
          <Button variant="outline" size="sm" onClick={scrollToStart} className="text-xs mobile-button" data-testid="button-scroll-start">
            <span className="hidden sm:inline">⏮ Start</span>
            <span className="sm:hidden">⏮</span>
          </Button>
          <Button variant="outline" size="sm" onClick={scrollLeft} className="text-xs mobile-button" data-testid="button-scroll-left">
            <span className="hidden sm:inline">← Left</span>
            <span className="sm:hidden">←</span>
          </Button>
          <Button variant="outline" size="sm" onClick={scrollRight} className="text-xs mobile-button" data-testid="button-scroll-right">
            <span className="hidden sm:inline">Right →</span>
            <span className="sm:hidden">→</span>
          </Button>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-500 hidden md:block">Use scrollbar, buttons, or arrow keys to navigate</span>
          <span className="text-xs text-gray-500 md:hidden">Swipe or scroll →</span>
          <span className="text-xs text-gray-400 mt-1">{data.length} {data.length === 1 ? 'item' : 'items'}</span>
        </div>
      </div>
      <div 
        ref={scrollContainerRef}
        className="overflow-x-scroll w-full"
        style={{ 
          overflowX: 'scroll',
          overflowY: 'visible',
          width: '100%',
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          scrollbarWidth: 'auto',
          scrollSnapType: 'none',
          overscrollBehaviorX: 'auto'
        }}
        onScroll={(e) => {
          // Ensure scroll position is preserved
          const target = e.target as HTMLElement;
          if (target.scrollLeft < 0) {
            target.scrollLeft = 0;
          }
        }}
        onDoubleClick={(e) => {
          // Double-click to reset scroll position
          const target = e.currentTarget as HTMLElement;
          target.scrollLeft = 0;
        }}
        onKeyDown={(e) => {
          // Arrow key navigation
          const target = e.currentTarget as HTMLElement;
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            target.scrollLeft = Math.max(0, target.scrollLeft - 50);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            target.scrollLeft += 50;
          } else if (e.key === 'Home') {
            e.preventDefault();
            target.scrollLeft = 0;
          } else if (e.key === 'End') {
            e.preventDefault();
            target.scrollLeft = target.scrollWidth - target.clientWidth;
          }
        }}
        tabIndex={0}
      >
        <table className="w-full mobile-table" style={{ minWidth: 'max-content', tableLayout: 'auto' }}>
          <thead className={cn(
            "border-b bg-gray-50/50",
            stickyHeader && "sticky top-0 z-10 backdrop-blur-sm bg-gray-50/90"
          )}>
            <tr>
              {columns.map((column, colIndex) => {
                // First column (Player) needs highest z-index for sticky behavior
                const isFirstColumn = colIndex === 0;
                const stickyZIndex = isFirstColumn ? 'z-30' : '';
                
                return (
                <th
                  key={column.key}
                  className={cn(
                    "font-semibold text-gray-700 border-b border-gray-200",
                    compact ? "px-2 py-1.5 text-xs" : "px-4 py-3",
                    getAlignment(column.align),
                    column.className,
                    column.width && `w-${column.width}`,
                    isFirstColumn && column.className?.includes('sticky') && stickyZIndex
                  )}
                >
                  {column.sortable && onSort ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort(column.key)}
                      className={cn(
                        "h-auto p-0 font-semibold text-gray-700 hover:text-indigo-600 hover:bg-transparent",
                        "flex items-center gap-1 transition-colors text-xs md:text-sm"
                      )}
                    >
                      <span className="whitespace-nowrap">{column.header}</span>
                      {getSortIcon(column.key)}
                    </Button>
                  ) : (
                    <span className="flex items-center gap-1 whitespace-nowrap text-xs md:text-sm">
                      {column.header}
                    </span>
                  )}
                </th>
              )})}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={`${(item as any).playerId || (item as any).id || index}-${(item as any).name || (item as any).playerName || ''}-${index}`}
                  className={cn(
                    "border-b border-gray-100 hover:bg-gray-50/50 transition-colors",
                    highlightRow && highlightRow(item, index) && "bg-indigo-50 hover:bg-indigo-100/50",
                    index === data.length - 1 && "border-b-0" // Remove border from last row
                  )}
                >
                  {columns.map((column, colIndex) => {
                    const value = item[column.key as keyof T];
                    const renderedValue = column.render 
                      ? column.render(value, item, index)
                      : value;
                    
                    // First column needs higher z-index for sticky behavior
                    const isFirstColumn = colIndex === 0;
                    const stickyZIndex = isFirstColumn && column.className?.includes('sticky') ? 'z-20' : '';

                    return (
                      <td
                        key={column.key}
                        className={cn(
                          "text-sm text-gray-900",
                          compact ? "px-2 py-1.5" : "px-4 py-3",
                          getAlignment(column.align),
                          column.className,
                          stickyZIndex
                        )}
                      >
                        {renderedValue as React.ReactNode}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Enhanced utility components for common cell types
export const PlayerNameCell = ({ 
  name, 
  position, 
  team, 
  compact = false, 
  showOwnership = false, 
  ownership,
  className 
}: { 
  name: string; 
  position?: string; 
  team?: string; 
  compact?: boolean; 
  showOwnership?: boolean; 
  ownership?: number;
  className?: string;
}) => (
  <div className={cn("flex flex-col", className)}>
    <div className="font-semibold text-gray-900">
      {name}
    </div>
    <div className="flex items-center gap-1 mt-1">
      {position && (
        <PositionBadge position={position} compact={true} />
      )}
      {team && (
        <TeamBadge team={team} compact={true} />
      )}
      {showOwnership && ownership !== undefined && (
        <span className="text-xs text-gray-500">
          {ownership}% owned
        </span>
      )}
    </div>
  </div>
);

export const TeamBadge = ({ team, className, compact = false }: { team: string; className?: string; compact?: boolean }) => (
  <Badge variant="outline" className={cn("text-xs font-medium", compact && "px-1 py-0.5", className)}>
    {team}
  </Badge>
);

export const PositionBadge = ({ position, className, compact = false }: { position: string; className?: string; compact?: boolean }) => {
  const getPositionColor = (pos: string) => {
    switch (pos?.toLowerCase()) {
      case 'goalkeeper': return 'bg-yellow-100 text-yellow-800';
      case 'defender': return 'bg-blue-100 text-blue-800';
      case 'midfielder': return 'bg-green-100 text-green-800';
      case 'forward': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getShortPosition = (pos: string) => {
    switch (pos?.toLowerCase()) {
      case 'goalkeeper': return 'GKP';
      case 'defender': return 'DEF';
      case 'midfielder': return 'MID';
      case 'forward': return 'FWD';
      default: return pos?.substring(0, 3).toUpperCase() || 'UNK';
    }
  };

  return (
    <Badge className={cn("text-xs font-medium", getPositionColor(position), compact && "px-1 py-0.5", className)}>
      {compact ? getShortPosition(position) : position}
    </Badge>
  );
};

// Standardized sortable header component
export const SortableHeader = ({ 
  field, 
  children, 
  onSort, 
  sortField, 
  sortDirection,
  className,
  align = 'left'
}: { 
  field: string; 
  children: React.ReactNode; 
  onSort?: (field: string) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  className?: string;
  align?: 'left' | 'center' | 'right';
}) => {
  const getSortIcon = () => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-3 h-3" /> 
      : <ChevronDown className="w-3 h-3" />;
  };

  const getAlignment = () => {
    switch (align) {
      case 'center': return 'justify-center';
      case 'right': return 'justify-end';
      default: return 'justify-start';
    }
  };

  if (!onSort) {
    return (
      <div className={cn("flex items-center gap-1", getAlignment(), className)}>
        {children}
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(field)}
      className={cn(
        "h-auto p-0 font-semibold text-gray-700 hover:text-indigo-600 hover:bg-transparent",
        "flex items-center gap-1 transition-colors",
        getAlignment(),
        className
      )}
    >
      {children}
      {getSortIcon()}
    </Button>
  );
};

export const ValueCell = ({ 
  value, 
  format = 'number', 
  decimals = 1, 
  className,
  colorScheme,
  fontWeight = 'medium'
}: { 
  value: number; 
  format?: 'number' | 'percentage' | 'currency' | 'points' | 'goals' | 'assists' | 'minutes' | 'rank' | 'price' | 'projection';
  decimals?: number;
  className?: string;
  colorScheme?: 'default' | 'points' | 'percentage' | 'goals' | 'assists' | 'defensive';
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
}) => {
  const formatValue = () => {
    switch (format) {
      case 'percentage':
        return `${(value * 100).toFixed(decimals)}%`;
      case 'currency':
        return `£${value.toFixed(decimals)}`;
      case 'price':
        return `£${(value / 10).toFixed(1)}m`;
      case 'rank':
        return value.toLocaleString();
      case 'goals':
      case 'assists':
      case 'projection':
        return value.toFixed(decimals);
      case 'minutes':
        return Math.round(value).toString();
      case 'points':
        return value.toFixed(decimals);
      default:
        return value.toFixed(decimals);
    }
  };

  const getFontWeightClass = () => {
    switch (fontWeight) {
      case 'normal': return 'font-normal';
      case 'medium': return 'font-medium';
      case 'semibold': return 'font-semibold';
      case 'bold': return 'font-bold';
      default: return 'font-medium';
    }
  };

  const getColorClass = () => {
    if (colorScheme === 'points') {
      if (value >= 6) return 'text-green-700';
      if (value >= 4) return 'text-blue-700';
      if (value >= 2) return 'text-gray-700';
      return 'text-gray-500';
    }
    if (colorScheme === 'percentage') {
      if (value >= 0.15) return 'text-green-700';
      if (value >= 0.10) return 'text-blue-700';
      if (value >= 0.05) return 'text-gray-700';
      return 'text-gray-500';
    }
    if (colorScheme === 'goals') {
      if (value >= 0.7) return 'text-green-700';
      if (value >= 0.4) return 'text-blue-700';
      if (value >= 0.2) return 'text-gray-700';
      return 'text-gray-500';
    }
    if (colorScheme === 'assists') {
      if (value >= 0.5) return 'text-green-700';
      if (value >= 0.3) return 'text-blue-700';
      if (value >= 0.1) return 'text-gray-700';
      return 'text-gray-500';
    }
    if (colorScheme === 'defensive') {
      if (value >= 12) return 'text-green-700';
      if (value >= 8) return 'text-blue-700';
      if (value >= 4) return 'text-gray-700';
      return 'text-gray-500';
    }
    return 'text-gray-900';
  };

  return (
    <span className={cn(getColorClass(), getFontWeightClass(), 'text-sm', className)}>
      {formatValue()}
    </span>
  );
};

export default EnhancedTable;