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

  return (
    <div className={cn(
      "rounded-lg border bg-white shadow-sm overflow-hidden",
      className
    )}>
      <div 
        className={cn(
          "overflow-x-auto overflow-y-auto",
          maxHeight && `max-h-[${maxHeight}]`
        )}
        style={{ 
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <table className="w-full">
          <thead className={cn(
            "border-b bg-gray-50/50",
            stickyHeader && "sticky top-0 z-10 backdrop-blur-sm bg-gray-50/90"
          )}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "font-semibold text-gray-700 border-b border-gray-200",
                    compact ? "px-3 py-2" : "px-4 py-3",
                    getAlignment(column.align),
                    column.className,
                    column.width && `w-${column.width}`
                  )}
                >
                  {column.sortable && onSort ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort(column.key)}
                      className={cn(
                        "h-auto p-0 font-semibold text-gray-700 hover:text-indigo-600 hover:bg-transparent",
                        "flex items-center gap-1 transition-colors"
                      )}
                    >
                      {column.header}
                      {getSortIcon(column.key)}
                    </Button>
                  ) : (
                    <span className="flex items-center gap-1">
                      {column.header}
                    </span>
                  )}
                </th>
              ))}
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
                  key={index}
                  className={cn(
                    "border-b border-gray-100 hover:bg-gray-50/50 transition-colors",
                    highlightRow && highlightRow(item, index) && "bg-indigo-50 hover:bg-indigo-100/50",
                    index === data.length - 1 && "border-b-0" // Remove border from last row
                  )}
                >
                  {columns.map((column) => {
                    const value = item[column.key as keyof T];
                    const renderedValue = column.render 
                      ? column.render(value, item, index)
                      : value;

                    return (
                      <td
                        key={column.key}
                        className={cn(
                          "text-sm text-gray-900",
                          compact ? "px-3 py-2" : "px-4 py-3",
                          getAlignment(column.align),
                          column.className
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

// Utility components for common cell types
export const PlayerNameCell = ({ name, className }: { name: string; className?: string }) => (
  <span className={cn("font-medium text-gray-900", className)}>{name}</span>
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

export const ValueCell = ({ 
  value, 
  format = 'number', 
  decimals = 1, 
  className,
  colorScheme 
}: { 
  value: number; 
  format?: 'number' | 'percentage' | 'currency' | 'points';
  decimals?: number;
  className?: string;
  colorScheme?: 'default' | 'points' | 'percentage';
}) => {
  const formatValue = () => {
    switch (format) {
      case 'percentage':
        return `${(value * 100).toFixed(decimals)}%`;
      case 'currency':
        return `£${value.toFixed(decimals)}`;
      case 'points':
        return value.toFixed(decimals);
      default:
        return value.toFixed(decimals);
    }
  };

  const getColorClass = () => {
    if (colorScheme === 'points') {
      if (value >= 6) return 'text-green-700 font-semibold';
      if (value >= 4) return 'text-blue-700 font-medium';
      if (value >= 2) return 'text-gray-700';
      return 'text-gray-500';
    }
    if (colorScheme === 'percentage') {
      if (value >= 0.15) return 'text-green-700 font-semibold';
      if (value >= 0.10) return 'text-blue-700 font-medium';
      if (value >= 0.05) return 'text-gray-700';
      return 'text-gray-500';
    }
    return 'text-gray-900';
  };

  return (
    <span className={cn(getColorClass(), className)}>
      {formatValue()}
    </span>
  );
};

export default EnhancedTable;