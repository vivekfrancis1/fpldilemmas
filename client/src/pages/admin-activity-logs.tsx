import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Users, LogIn, Link2, Search, ChevronLeft, ChevronRight, Activity, Clock, Navigation } from "lucide-react";

function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

interface ActivityLog {
  id: number;
  activityType: string;
  managerId: number | null;
  managerName: string | null;
  email: string | null;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  createdAt: string;
}

interface ActivityStats {
  byType: Array<{
    activityType: string;
    count: number;
    uniqueManagers: number;
    uniqueEmails: number;
  }>;
  total: number;
  last24h: number;
}

function getActivityBadge(type: string) {
  switch (type) {
    case 'manager_id_search':
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Search className="h-3 w-3 mr-1" />Manager Search</Badge>;
    case 'manager_navigation':
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><Navigation className="h-3 w-3 mr-1" />Manager Navigation</Badge>;
    case 'login':
      return <Badge className="bg-green-100 text-green-800 border-green-200"><LogIn className="h-3 w-3 mr-1" />Login</Badge>;
    case 'fpl_connect':
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200"><Link2 className="h-3 w-3 mr-1" />FPL Connect</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function parseUserAgent(ua: string | null) {
  if (!ua) return 'Unknown';
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) return 'Mobile';
  if (ua.includes('Tablet') || ua.includes('iPad')) return 'Tablet';
  return 'Desktop';
}

export default function AdminActivityLogs() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<string>("all");

  const { data: statsData, isLoading: statsLoading } = useQuery<ActivityStats>({
    queryKey: ["/api/admin/user-activity-stats"],
    enabled: isAdmin,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery<{
    logs: ActivityLog[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: ["/api/admin/user-activity-logs", page, filterType],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filterType !== 'all') params.set('type', filterType);
      const res = await fetch(`/api/admin/user-activity-logs?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: isAdmin,
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold text-gray-700">Admin access required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pagination = logsData?.pagination;
  const logs = logsData?.logs || [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">
          User Activity Logs
        </h1>
        <p className="text-muted-foreground mt-1">Track all user interactions including manager searches, logins, and FPL account connections.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Total Events</span>
            </div>
            <div className="text-2xl font-bold text-purple-700">
              {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (statsData?.total || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Last 24 Hours</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (statsData?.last24h || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        {statsData?.byType?.map((stat) => (
          <Card key={stat.activityType} className="border-0 bg-white/80 shadow-sm">
            <CardContent className="p-4">
              <div className="mb-1">{getActivityBadge(stat.activityType)}</div>
              <div className="text-xl font-bold text-gray-800">{Number(stat.count).toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">
                {Number(stat.uniqueManagers)} managers | {Number(stat.uniqueEmails)} emails
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Activity Log</CardTitle>
              <CardDescription>
                {pagination ? `Showing ${logs.length} of ${pagination.total} events` : 'Loading...'}
              </CardDescription>
            </div>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="manager_id_search">Manager Searches</SelectItem>
                <SelectItem value="manager_navigation">Manager Navigation</SelectItem>
                <SelectItem value="login">Logins</SelectItem>
                <SelectItem value="fpl_connect">FPL Connections</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No activity logs found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Date & Time</TableHead>
                      <TableHead className="w-[140px]">Activity</TableHead>
                      <TableHead>Manager ID</TableHead>
                      <TableHead>Manager Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell>{getActivityBadge(log.activityType)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.managerId || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.managerName || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.email || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {parseUserAgent(log.userAgent)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {log.metadata ? (
                            <>
                              {log.metadata.method && <span>Method: {log.metadata.method}</span>}
                              {log.metadata.teamName && <span>Team: {log.metadata.teamName}</span>}
                              {log.metadata.managerName && <span>{log.metadata.managerName}</span>}
                            </>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={page >= pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
