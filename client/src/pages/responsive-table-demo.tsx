import { useState } from "react";
import { ResponsiveTable, FPLColumnPresets, ResponsiveTableColumn, createResponsiveColumn } from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Users, TrendingUp, Star, Shield, Target } from "lucide-react";

// Sample data structure similar to FPL managers
interface MockManager {
  id: number;
  name: string;
  rank: number;
  totalPoints: number;
  gameweekPoints: number;
  teamValue: number;
  transfers: number;
  chips: number;
  region: string;
  change: number;
  isActive: boolean;
}

// Generate sample data
const sampleManagers: MockManager[] = [
  {
    id: 1,
    name: "Tom Dollimore",
    rank: 1,
    totalPoints: 2847,
    gameweekPoints: 89,
    teamValue: 1012,
    transfers: 23,
    chips: 3,
    region: "England",
    change: 0,
    isActive: true,
  },
  {
    id: 2,
    name: "Ben Crellin",
    rank: 2,
    totalPoints: 2834,
    gameweekPoints: 76,
    teamValue: 1008,
    transfers: 28,
    chips: 2,
    region: "England",
    change: 1,
    isActive: true,
  },
  {
    id: 3,
    name: "Fábio Borges",
    rank: 3,
    totalPoints: 2821,
    gameweekPoints: 94,
    teamValue: 1015,
    transfers: 19,
    chips: 4,
    region: "Portugal",
    change: -1,
    isActive: true,
  },
  {
    id: 4,
    name: "John Walsh",
    rank: 4,
    totalPoints: 2810,
    gameweekPoints: 67,
    teamValue: 1001,
    transfers: 31,
    chips: 1,
    region: "Ireland",
    change: 2,
    isActive: true,
  },
  {
    id: 5,
    name: "Abhinav C",
    rank: 5,
    totalPoints: 2798,
    gameweekPoints: 83,
    teamValue: 1019,
    transfers: 25,
    chips: 3,
    region: "India",
    change: -2,
    isActive: false,
  },
];

const ResponsiveTableDemo = () => {
  const [sortField, setSortField] = useState<string>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);

  // Sample handler functions
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (manager: MockManager, index: number) => {
    console.log('Row clicked:', manager.name, 'at index:', index);
  };

  const refreshData = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  // Custom rendering functions
  const renderManagerName = (value: string, item: MockManager) => (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">
        {item.rank <= 3 ? (
          <Crown className="h-5 w-5 text-yellow-500" />
        ) : (
          <Users className="h-5 w-5 text-gray-400" />
        )}
      </div>
      <div>
        <div className="font-semibold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{item.region}</div>
      </div>
    </div>
  );

  const renderRank = (value: number, item: MockManager) => (
    <div className="flex items-center gap-2">
      <Badge 
        variant={value <= 10 ? "default" : value <= 100 ? "secondary" : "outline"}
        className="font-mono"
      >
        #{value.toLocaleString()}
      </Badge>
      {item.change !== 0 && (
        <div className={`flex items-center text-xs ${item.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
          <TrendingUp className="h-3 w-3 mr-1" />
          {Math.abs(item.change)}
        </div>
      )}
    </div>
  );

  const renderPoints = (value: number) => (
    <span className="font-mono font-semibold text-blue-700">
      {value.toLocaleString()}
    </span>
  );

  const renderGameweekPoints = (value: number) => (
    <span className="font-mono font-semibold text-green-700">
      {value}
    </span>
  );

  const renderTeamValue = (value: number) => (
    <span className="font-mono text-purple-700">
      £{(value / 10).toFixed(1)}m
    </span>
  );

  const renderStatus = (value: any, item: MockManager) => (
    <Badge variant={item.isActive ? "default" : "secondary"}>
      {item.isActive ? "Active" : "Inactive"}
    </Badge>
  );

  // Define responsive columns with priorities
  const columns: ResponsiveTableColumn<MockManager>[] = [
    {
      key: 'name',
      header: 'Manager',
      priority: 'essential',
      align: 'left',
      mobileLabel: 'Manager',
      cardOrder: 1,
      render: renderManagerName,
      className: 'min-w-[200px]'
    },
    {
      key: 'rank',
      header: 'Rank',
      priority: 'essential',
      align: 'center',
      mobileLabel: 'Rank',
      cardOrder: 2,
      sortable: true,
      render: renderRank,
      formatForCard: 'rank'
    },
    {
      key: 'totalPoints',
      header: 'Total Points',
      priority: 'important',
      align: 'right',
      mobileLabel: 'Points',
      cardOrder: 3,
      sortable: true,
      render: renderPoints,
      formatForCard: 'number'
    },
    {
      key: 'gameweekPoints',
      header: 'GW Points',
      priority: 'important',
      align: 'right',
      mobileLabel: 'GW',
      cardOrder: 4,
      sortable: true,
      render: renderGameweekPoints,
      formatForCard: 'number'
    },
    {
      key: 'teamValue',
      header: 'Team Value',
      priority: 'secondary',
      align: 'right',
      mobileLabel: 'Value',
      cardOrder: 5,
      sortable: true,
      render: renderTeamValue,
      formatForCard: 'currency'
    },
    {
      key: 'transfers',
      header: 'Transfers',
      priority: 'secondary',
      align: 'right',
      mobileLabel: 'Transfers',
      cardOrder: 6,
      formatForCard: 'number'
    },
    {
      key: 'chips',
      header: 'Chips Used',
      priority: 'optional',
      align: 'right',
      mobileLabel: 'Chips',
      cardOrder: 7,
      formatForCard: 'number'
    },
    {
      key: 'isActive',
      header: 'Status',
      priority: 'optional',
      align: 'center',
      mobileLabel: 'Status',
      cardOrder: 8,
      render: renderStatus,
      hideOnMobile: false
    }
  ];

  const getCardTitle = (manager: MockManager) => manager.name;

  const highlightRow = (manager: MockManager) => manager.rank <= 3;

  return (
    <div className="fpl-page-wrapper">
      <div className="fpl-container fpl-content-area">
        {/* Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Star className="h-8 w-8" />
              <h1>ResponsiveTable Demo</h1>
            </div>
            <p className="fpl-page-subtitle">
              Interactive demonstration of the new ResponsiveTable component with mobile-first design, 
              column priority system, and automatic card layout for mobile devices.
            </p>
            <p className="fpl-page-tagline">
              Test on different screen sizes to see responsive behavior
            </p>
          </div>
        </div>

        {/* Demo Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Demo Controls
            </CardTitle>
            <CardDescription>
              Test the table functionality and responsive behavior
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button onClick={refreshData} disabled={loading}>
                {loading ? "Loading..." : "Test Loading State"}
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Current sort:</span>
                <Badge variant="outline">
                  {sortField} ({sortDirection})
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="h-6 w-6 text-blue-500" />
                <h3 className="font-semibold">Mobile-First</h3>
              </div>
              <p className="text-sm text-gray-600">
                Automatically switches to card layout on mobile devices (≤640px) with collapsible secondary data.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Target className="h-6 w-6 text-green-500" />
                <h3 className="font-semibold">Column Priority</h3>
              </div>
              <p className="text-sm text-gray-600">
                Essential, important, secondary, and optional columns with responsive visibility based on screen size.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="h-6 w-6 text-purple-500" />
                <h3 className="font-semibold">Touch Optimized</h3>
              </div>
              <p className="text-sm text-gray-600">
                Smooth horizontal scrolling, sticky columns, and proper touch targets for mobile interaction.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Responsive Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top FPL Managers (Demo Data)
            </CardTitle>
            <CardDescription>
              This table demonstrates all ResponsiveTable features with sample FPL manager data.
              Try resizing your browser window to see the responsive behavior.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ResponsiveTable
              data={sampleManagers}
              columns={columns}
              loading={loading}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              onRowClick={handleRowClick}
              mobileCardTitle={getCardTitle}
              highlightRow={highlightRow}
              enableHorizontalScroll={true}
              stickyHeader={true}
              stickyFirstColumn={true}
              emptyMessage="No managers found"
              enableMobileCards={true}
              className="border-0"
            />
          </CardContent>
        </Card>

        {/* Usage Examples */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Usage Examples</CardTitle>
            <CardDescription>
              How to implement the ResponsiveTable in your components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Column Priorities</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Essential:</strong> Always visible (Manager name)</div>
                  <div><strong>Important:</strong> Hidden on small screens (Rank, Points)</div>
                  <div><strong>Secondary:</strong> Hidden on medium screens (Team Value, Transfers)</div>
                  <div><strong>Optional:</strong> Hidden on large screens (Chips, Status)</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Mobile Cards</h4>
                <p className="text-sm text-gray-600">
                  On mobile devices, table rows automatically transform into cards with essential data visible 
                  and secondary data in an expandable accordion.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Touch Interaction</h4>
                <p className="text-sm text-gray-600">
                  Horizontal scrolling is optimized for touch with momentum scrolling, scroll indicators, 
                  and sticky columns for key data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResponsiveTableDemo;