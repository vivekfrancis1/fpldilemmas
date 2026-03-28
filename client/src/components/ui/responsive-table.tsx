import React, { useState, useMemo, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface ResponsiveTableColumn<T = any> {
  key: string;
  header: string | React.ReactNode;
  render?: (value: any, item: T, index: number) => React.ReactNode;
  
  // Responsive visibility
  priority: 'essential' | 'important' | 'secondary' | 'optional';
  mobileLabel?: string; // Custom label for mobile cards
  hideOnMobile?: boolean; // Force hide on mobile
  
  // Styling and behavior
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
  
  // Mobile card formatting
  formatForCard?: 'currency' | 'number' | 'badge' | 'text' | 'rank' | 'custom';
  cardOrder?: number; // Order in mobile card (lower = higher priority)
}

export interface ResponsiveTableProps<T = any> {
  data: T[];
  columns: ResponsiveTableColumn<T>[];
  
  // Sorting
  onSort?: (field: string) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  
  // Responsive behavior
  enableMobileCards?: boolean;
  mobileCardTitle?: (item: T) => string; // Main title for mobile cards
  mobileCompactTable?: boolean; // Show full table on mobile (compact, scrollable) instead of cards
  
  // Table behavior
  loading?: boolean;
  emptyMessage?: string;
  stickyHeader?: boolean;
  enableHorizontalScroll?: boolean;
  stickyFirstColumn?: boolean;
  
  // Styling
  className?: string;
  compact?: boolean;
  maxHeight?: string;
  highlightRow?: (item: T, index: number) => boolean;
  
  // Events
  onRowClick?: (item: T, index: number) => void;
  
  // Row Test IDs
  getRowTestId?: (item: T, index: number) => string;
}

// Mobile Card Component
function MobileCard<T>({ 
  item, 
  index, 
  columns, 
  title,
  onRowClick,
  highlightRow,
  className,
  getRowTestId
}: {
  item: T;
  index: number;
  columns: ResponsiveTableColumn<T>[];
  title?: string;
  onRowClick?: (item: T, index: number) => void;
  highlightRow?: (item: T, index: number) => boolean;
  className?: string;
  getRowTestId?: (item: T, index: number) => string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort columns by priority and card order
  const sortedColumns = useMemo(() => {
    return [...columns]
      .filter(col => !col.hideOnMobile)
      .sort((a, b) => {
        const priorityOrder = { essential: 0, important: 1, secondary: 2, optional: 3 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        const aOrder = a.cardOrder ?? 999;
        const bOrder = b.cardOrder ?? 999;
        return aOrder - bOrder;
      });
  }, [columns]);

  const formatValueForCard = (column: ResponsiveTableColumn<T>, value: any) => {
    if (column.render) {
      return column.render(value, item, index);
    }

    switch (column.formatForCard) {
      case 'currency':
        return typeof value === 'number' ? `£${(value / 10).toFixed(1)}m` : value;
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'rank':
        return typeof value === 'number' ? `#${value.toLocaleString()}` : value;
      default:
        return value;
    }
  };

  const handleCardClick = () => {
    if (onRowClick) {
      onRowClick(item, index);
    }
  };

  return (
    <Card 
      className={cn(
        "responsive-table-mobile-card mb-4 transition-all duration-200",
        onRowClick && "cursor-pointer hover:shadow-md hover:bg-slate-50",
        highlightRow && highlightRow(item, index) && "bg-blue-50 border-blue-200",
        className
      )}
      onClick={handleCardClick}
      data-testid={getRowTestId ? getRowTestId(item, index).replace('row-', 'mobile-card-') : `mobile-card-${index}`}
    >
      <CardContent className="p-4">
        {/* Card Title */}
        {title && (
          <div className="font-semibold text-lg mb-3 text-gray-900">
            {title}
          </div>
        )}

        {/* All Columns - Always Visible */}
        <div className="space-y-2">
          {sortedColumns.map((column) => {
            const value = item[column.key as keyof T];
            const formattedValue = formatValueForCard(column, value);
            
            return (
              <div 
                key={column.key} 
                className="flex justify-between items-center"
                data-testid={`card-field-${column.key}`}
              >
                <span className="text-sm text-gray-600 font-medium">
                  {column.mobileLabel || column.header}:
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {formattedValue as React.ReactNode}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Column visibility utilities
const getColumnVisibilityClass = (priority: ResponsiveTableColumn['priority'], hideOnMobile?: boolean) => {
  if (hideOnMobile) return 'hidden lg:table-cell';
  
  switch (priority) {
    case 'essential':
      return ''; // Always visible
    case 'important':
      return 'hidden sm:table-cell';
    case 'secondary':
      return 'hidden md:table-cell';
    case 'optional':
      return 'hidden lg:table-cell';
    default:
      return 'hidden md:table-cell';
  }
};

export function ResponsiveTable<T = any>({
  data,
  columns,
  onSort,
  sortField,
  sortDirection,
  enableMobileCards = true,
  mobileCardTitle,
  mobileCompactTable = false,
  loading = false,
  emptyMessage = "No data available",
  stickyHeader = false,
  enableHorizontalScroll = true,
  stickyFirstColumn = false,
  className,
  compact = false,
  maxHeight,
  highlightRow,
  onRowClick,
  getRowTestId,
}: ResponsiveTableProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
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

  // Loading state
  if (loading) {
    return (
      <div className="responsive-table-loading fpl-loading">
        <div className="fpl-loading-spinner animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="fpl-loading-text ml-4 text-gray-600">Loading...</span>
      </div>
    );
  }

  // Mobile card layout (skipped when mobileCompactTable is active)
  if (isMobile && enableMobileCards && !mobileCompactTable) {
    return (
      <div 
        className={cn("responsive-table-mobile-container", className)}
        data-testid="responsive-table-mobile"
      >
        {data.length === 0 ? (
          <div className="fpl-empty">
            <div className="fpl-empty-title">No Data Available</div>
            <div className="fpl-empty-message">{emptyMessage}</div>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item, index) => (
              <MobileCard
                key={index}
                item={item}
                index={index}
                columns={columns}
                title={mobileCardTitle ? mobileCardTitle(item) : undefined}
                onRowClick={onRowClick}
                highlightRow={highlightRow}
                getRowTestId={getRowTestId}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop table layout
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

  // When mobileCompactTable is active, force horizontal scroll and show all columns
  const isCompactMobile = mobileCompactTable && isMobile;
  const isCompact = compact || isCompactMobile;
  const cellPadding = isCompactMobile ? "px-1.5 py-1" : compact ? "px-2 py-1.5" : "px-4 py-3";
  const getVisibilityClass = (priority: ResponsiveTableColumn['priority'], hideOnMobile?: boolean) => {
    if (isCompactMobile) return hideOnMobile ? 'hidden' : '';
    return getColumnVisibilityClass(priority, hideOnMobile);
  };

  return (
    <div 
      className={cn("responsive-table-container fpl-table-container", className)}
      data-testid={isCompactMobile ? "responsive-table-compact-mobile" : "responsive-table-desktop"}
    >
      {/* Scroll Controls - Only on non-desktop when horizontal scroll is enabled */}
      {(enableHorizontalScroll || isCompactMobile) && (
        <div className="flex justify-between items-center px-2 sm:px-4 py-2 bg-gray-50 border-b lg:hidden">
          <div className="flex gap-1 sm:gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={scrollToStart} 
              className="text-xs mobile-button"
              data-testid="scroll-start"
              aria-label="Scroll to table start"
            >
              <span className="hidden sm:inline">⏮ Start</span>
              <span className="sm:hidden">⏮</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={scrollLeft} 
              className="text-xs mobile-button"
              data-testid="scroll-left"
              aria-label="Scroll table left"
            >
              <span className="hidden sm:inline">← Left</span>
              <span className="sm:hidden">←</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={scrollRight} 
              className="text-xs mobile-button"
              data-testid="scroll-right"
              aria-label="Scroll table right"
            >
              <span className="hidden sm:inline">Right →</span>
              <span className="sm:hidden">→</span>
            </Button>
          </div>
          <span className="text-xs text-gray-500">Scroll →</span>
        </div>
      )}

      {/* Table Container */}
      <div 
        ref={scrollContainerRef}
        className={cn(
          "responsive-table-scroll",
          (enableHorizontalScroll || isCompactMobile) && "overflow-x-auto",
          !enableHorizontalScroll && !isCompactMobile && "overflow-x-hidden",
          maxHeight && "overflow-y-auto"
        )}
        style={maxHeight ? { maxHeight } : undefined}
        data-testid="table-scroll-container"
      >
        <Table className={cn("w-full", isCompact && "text-xs")}>
          <TableHeader 
            className={cn(
              "responsive-table-header",
              stickyHeader && "sticky top-0 z-20 bg-white shadow-sm"
            )}
          >
            <TableRow>
              {columns.map((column, columnIndex) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "responsive-table-head",
                    getAlignment(column.align),
                    getVisibilityClass(column.priority, column.hideOnMobile),
                    stickyFirstColumn && columnIndex === 0 && "sticky left-0 bg-white z-30 shadow-sm",
                    stickyHeader && stickyFirstColumn && columnIndex === 0 && "z-40",
                    cellPadding,
                    column.className,
                    column.width && `w-${column.width}`
                  )}
                  data-priority={column.priority}
                  data-testid={`header-${column.key}`}
                >
                  {column.sortable && onSort ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort(column.key)}
                      className={cn(
                        "h-auto p-0 font-semibold text-gray-700 hover:text-indigo-600 hover:bg-transparent flex items-center gap-0.5 transition-colors",
                        isCompact && "text-xs"
                      )}
                      data-testid={`sort-${column.key}`}
                      aria-label={`Sort by ${column.header} ${sortField === column.key ? (sortDirection === 'asc' ? 'descending' : 'ascending') : ''}`}
                    >
                      {column.header}
                      {getSortIcon(column.key)}
                    </Button>
                  ) : (
                    <span className={cn("font-semibold text-gray-700", isCompact && "text-xs")}>
                      {column.header}
                    </span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length} 
                  className="px-4 py-8 text-center text-gray-500"
                  data-testid="empty-message"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow
                  key={index}
                  className={cn(
                    "responsive-table-row transition-colors",
                    onRowClick && "cursor-pointer hover:bg-gray-50",
                    highlightRow && highlightRow(item, index) && "bg-blue-50 hover:bg-blue-100"
                  )}
                  onClick={() => onRowClick && onRowClick(item, index)}
                  data-testid={getRowTestId ? getRowTestId(item, index) : `row-${index}`}
                >
                  {columns.map((column, columnIndex) => {
                    const value = item[column.key as keyof T];
                    const renderedValue = column.render 
                      ? column.render(value, item, index)
                      : value;

                    return (
                      <TableCell
                        key={column.key}
                        className={cn(
                          "responsive-table-cell",
                          getAlignment(column.align),
                          getVisibilityClass(column.priority, column.hideOnMobile),
                          stickyFirstColumn && columnIndex === 0 && "sticky left-0 bg-white z-10 shadow-sm",
                          cellPadding,
                          column.className
                        )}
                        data-priority={column.priority}
                        data-testid={`cell-${column.key}-${index}`}
                      >
                        {renderedValue as React.ReactNode}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Utility function to create responsive columns easily
export const createResponsiveColumn = <T = any>(
  config: Omit<ResponsiveTableColumn<T>, 'key'> & { key: keyof T }
): ResponsiveTableColumn<T> => ({
  ...config,
  key: String(config.key)
});

// Common column presets for FPL data
export const FPLColumnPresets = {
  playerName: (key: string = 'name'): ResponsiveTableColumn => ({
    key,
    header: 'Player',
    priority: 'essential',
    align: 'left',
    mobileLabel: 'Player',
    cardOrder: 1,
    formatForCard: 'text'
  }),

  rank: (key: string = 'rank'): ResponsiveTableColumn => ({
    key,
    header: 'Rank',
    priority: 'important',
    align: 'center',
    mobileLabel: 'Rank',
    cardOrder: 2,
    formatForCard: 'rank',
    sortable: true
  }),

  points: (key: string = 'points'): ResponsiveTableColumn => ({
    key,
    header: 'Points',
    priority: 'important',
    align: 'right',
    mobileLabel: 'Points',
    cardOrder: 3,
    formatForCard: 'number',
    sortable: true
  }),

  teamValue: (key: string = 'teamValue'): ResponsiveTableColumn => ({
    key,
    header: 'Team Value',
    priority: 'secondary',
    align: 'right',
    mobileLabel: 'Value',
    cardOrder: 4,
    formatForCard: 'currency',
    sortable: true
  }),

  transfers: (key: string = 'transfers'): ResponsiveTableColumn => ({
    key,
    header: 'Transfers',
    priority: 'optional',
    align: 'right',
    mobileLabel: 'Transfers',
    cardOrder: 5,
    formatForCard: 'number'
  })
};

export default ResponsiveTable;