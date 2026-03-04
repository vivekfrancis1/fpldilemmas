import { TrendingUp, TrendingDown } from "lucide-react";
import { ResponsiveTableColumn } from "@/components/ui/responsive-table";
import { calculateFreeTransfers } from "@/lib/free-transfers";

export interface GWHistory {
  event: number;
  event_transfers: number;
  event_transfers_cost: number;
}

export interface ChipUsage {
  event: number;
  name: string;
}

export interface GWTransferDetail {
  playerIn: string;
  playerOut: string;
  teamIn: string;
  teamOut: string;
}

export interface ManagerStandingsData {
  id?: number;
  name: string;
  managerId: number;
  rankChange?: number | null;
  historyData?: {
    current: GWHistory[];
    chips: ChipUsage[];
  };
  latestTracking?: {
    gameweek?: number;
    overallRank?: number;
    overallPoints?: number;
    gameweekPoints?: number;
    gameweekRank?: number;
    teamValue?: number | string;
    bank?: number | string;
    totalTransfers?: number;
    chipsUsed?: number;
    secondHalfChipsUsed?: number;
  };
}

export type ValueScale = 'raw' | 'millions';

export interface ManagerColumnsConfig {
  currentGameweek?: number;
  upcomingGameweek?: number;
  valueScale?: ValueScale;
  gwTransfersMap?: Record<number | string, GWTransferDetail[]>;
  gwTransfersKeyField?: 'id' | 'managerId';
}

export function getChipLabel(chip: string | null | undefined): string | null {
  if (!chip) return null;
  switch (chip) {
    case 'bboost': return 'BB';
    case '3xc': return '3xC';
    case 'freehit': return 'FH';
    case 'wildcard': return 'WC';
    default: return chip.toUpperCase();
  }
}

function parseValue(val: number | string | undefined | null, scale: ValueScale): number {
  if (val === undefined || val === null) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return scale === 'raw' ? num / 10 : num;
}

export function renderRankChange(change: number | undefined | null) {
  if (!change || change === 0) return <span className="text-gray-400">-</span>;
  if (change > 0) {
    return (
      <div className="flex items-center justify-end text-green-600 font-medium">
        <TrendingUp className="h-3 w-3 mr-1" />
        {change.toLocaleString()}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end text-red-600 font-medium">
      <TrendingDown className="h-3 w-3 mr-1" />
      {Math.abs(change).toLocaleString()}
    </div>
  );
}

export function getSharedColumns<T extends ManagerStandingsData>(
  config: ManagerColumnsConfig
): ResponsiveTableColumn<T>[] {
  const {
    currentGameweek,
    upcomingGameweek,
    valueScale = 'millions',
    gwTransfersMap,
    gwTransfersKeyField = 'id',
  } = config;
  const ftGameweek = upcomingGameweek || (currentGameweek ? currentGameweek + 1 : 1);

  return [
    {
      key: 'latestTracking.overallRank',
      header: <span className="leading-tight">Overall<br/>Rank</span>,
      priority: 'important',
      align: 'right',
      mobileLabel: 'Rank',
      cardOrder: 2,
      sortable: true,
      render: (_, item: T) => {
        const rank = item.latestTracking?.overallRank;
        return (
          <span className="font-medium">
            {rank ? rank.toLocaleString() : "N/A"}
          </span>
        );
      }
    },
    {
      key: 'rankChange',
      header: <span className="leading-tight">Rank<br/>Gain</span>,
      priority: 'important',
      align: 'right',
      mobileLabel: 'Gain',
      cardOrder: 3,
      sortable: true,
      render: (_, item: T) => renderRankChange(item.rankChange)
    },
    {
      key: 'latestTracking.overallPoints',
      header: <span className="leading-tight">Total<br/>Pts</span>,
      priority: 'important',
      align: 'right',
      mobileLabel: 'Points',
      cardOrder: 4,
      sortable: true,
      className: 'font-mono',
      render: (_, item: T) => {
        const points = item.latestTracking?.overallPoints;
        return points !== undefined && points !== null ? points : "N/A";
      }
    },
    {
      key: 'latestTracking.gameweekPoints',
      header: currentGameweek ? <span className="leading-tight">Pts<br/>GW{currentGameweek}</span> : 'GW Pts',
      priority: 'secondary',
      align: 'right',
      mobileLabel: currentGameweek ? `GW${currentGameweek}` : 'GW Pts',
      cardOrder: 5,
      sortable: true,
      render: (_, item: T) => {
        const gwPoints = item.latestTracking?.gameweekPoints;
        return (
          <span className="font-mono font-bold">
            {gwPoints !== undefined && gwPoints !== null ? gwPoints : "N/A"}
          </span>
        );
      }
    },
    {
      key: 'latestTracking.squadValue',
      header: <span className="leading-tight">Squad<br/>Value</span>,
      priority: 'secondary',
      align: 'right',
      mobileLabel: 'Squad',
      cardOrder: 6,
      sortable: true,
      className: 'font-mono',
      render: (_, item: T) => {
        const teamValue = item.latestTracking?.teamValue;
        const bank = item.latestTracking?.bank;
        if (teamValue === undefined || teamValue === null) return "N/A";
        const tv = parseValue(teamValue, valueScale);
        const bk = parseValue(bank, valueScale);
        return `£${(tv - bk).toFixed(1)}m`;
      }
    },
    {
      key: 'latestTracking.bank',
      header: 'Bank',
      priority: 'optional',
      align: 'right',
      mobileLabel: 'Bank',
      cardOrder: 7,
      sortable: true,
      className: 'font-mono',
      render: (_, item: T) => {
        const bank = item.latestTracking?.bank;
        if (bank === undefined || bank === null) return "£0.0m";
        return `£${parseValue(bank, valueScale).toFixed(1)}m`;
      }
    },
    {
      key: 'latestTracking.teamValue',
      header: <span className="leading-tight">Team<br/>Value</span>,
      priority: 'optional',
      align: 'right',
      mobileLabel: 'TV',
      cardOrder: 8,
      sortable: true,
      className: 'font-mono',
      render: (_, item: T) => {
        const teamValue = item.latestTracking?.teamValue;
        if (teamValue === undefined || teamValue === null) return "N/A";
        return `£${parseValue(teamValue, valueScale).toFixed(1)}m`;
      }
    },
    {
      key: 'transfersMade',
      header: 'Transfers',
      priority: 'optional',
      align: 'right',
      mobileLabel: 'TM',
      cardOrder: 9,
      sortable: true,
      className: 'font-mono',
      render: (_, item: T) => {
        const history = item.historyData?.current;
        const chips = item.historyData?.chips || [];
        if (!history || history.length === 0) return "N/A";
        const chipGWs = new Set(
          chips.filter(c => c.name === 'freehit' || c.name === 'wildcard').map(c => c.event)
        );
        return history
          .filter(gw => !chipGWs.has(gw.event))
          .reduce((sum, gw) => sum + (gw.event_transfers || 0), 0);
      }
    },
    {
      key: 'gwTransfers',
      header: currentGameweek ? <span className="leading-tight">GW{currentGameweek}<br/>Transfers</span> : 'GW Transfers',
      priority: 'secondary',
      align: 'left',
      mobileLabel: currentGameweek ? `GW${currentGameweek}` : 'GW TM',
      cardOrder: 10,
      sortable: true,
      width: '220px',
      render: (_, item: T) => {
        const history = item.historyData?.current;
        if (!history || history.length === 0) return "N/A";
        const gwData = history.find(gw => gw.event === (currentGameweek || 0));
        if (!gwData) return "-";
        const transferCount = gwData.event_transfers || 0;
        const cost = gwData.event_transfers_cost || 0;
        const key = gwTransfersKeyField === 'id' ? item.id : item.managerId;
        const details = key !== undefined ? gwTransfersMap?.[key] : undefined;

        if (transferCount === 0) return <span className="text-gray-400">-</span>;

        return (
          <div className="space-y-0.5">
            {details && details.length > 0 ? (
              details.map((t, i) => (
                <div key={i} className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <span className="text-green-600 font-medium">{t.playerIn}</span>
                  <span className="text-gray-400 text-[10px]">({t.teamIn})</span>
                  <span className="text-gray-400 mx-0.5">←</span>
                  <span className="text-red-500">{t.playerOut}</span>
                  <span className="text-gray-400 text-[10px]">({t.teamOut})</span>
                </div>
              ))
            ) : (
              <span className="text-xs">{transferCount} transfer{transferCount !== 1 ? 's' : ''}</span>
            )}
            {cost > 0 && (
              <div className="text-red-500 text-[10px] font-medium">-{cost} pts hit</div>
            )}
          </div>
        );
      }
    },
    {
      key: 'freeTransfers',
      header: 'FT',
      priority: 'optional',
      align: 'right',
      mobileLabel: 'FT',
      cardOrder: 11,
      sortable: true,
      className: 'font-mono',
      render: (_, item: T) => {
        const history = item.historyData?.current;
        const chips = item.historyData?.chips;
        if (!history || history.length === 0) return "N/A";
        return calculateFreeTransfers(history, chips, ftGameweek);
      }
    },
    {
      key: 'chipsAvailable',
      header: <span className="leading-tight">Chips<br/>Available</span>,
      priority: 'optional',
      align: 'right',
      mobileLabel: 'Chips',
      cardOrder: 12,
      sortable: true,
      className: 'font-mono',
      render: (_, item: T) => {
        const chips = item.historyData?.chips || [];
        const secondHalfChipsUsed = (item.latestTracking as any)?.secondHalfChipsUsed ??
          chips.filter(c => c.event >= 20).length;
        return Math.max(0, 4 - secondHalfChipsUsed);
      }
    },
  ];
}

export function getSharedSortValue<T extends ManagerStandingsData>(
  item: T,
  field: string,
  currentGameweek?: number,
  valueScale: ValueScale = 'millions',
  upcomingGameweek?: number
): string | number {
  switch (field) {
    case 'latestTracking.overallRank':
      return item.latestTracking?.overallRank || Number.MAX_SAFE_INTEGER;
    case 'rankChange':
      return item.rankChange || 0;
    case 'latestTracking.overallPoints':
      return item.latestTracking?.overallPoints || 0;
    case 'latestTracking.gameweekPoints':
      return item.latestTracking?.gameweekPoints || 0;
    case 'latestTracking.squadValue': {
      const tv = parseValue(item.latestTracking?.teamValue, valueScale);
      const bk = parseValue(item.latestTracking?.bank, valueScale);
      return tv - bk;
    }
    case 'latestTracking.bank':
      return parseValue(item.latestTracking?.bank, valueScale);
    case 'latestTracking.teamValue':
      return parseValue(item.latestTracking?.teamValue, valueScale);
    case 'transfersMade': {
      const hist = item.historyData?.current || [];
      const chipGWs = new Set(
        (item.historyData?.chips || [])
          .filter(c => c.name === 'freehit' || c.name === 'wildcard')
          .map(c => c.event)
      );
      return hist.filter(gw => !chipGWs.has(gw.event)).reduce((s, gw) => s + (gw.event_transfers || 0), 0);
    }
    case 'gwTransfers': {
      const gwData = (item.historyData?.current || []).find(gw => gw.event === (currentGameweek || 0));
      return gwData?.event_transfers || 0;
    }
    case 'freeTransfers': {
      const history = item.historyData?.current;
      const chips = item.historyData?.chips;
      if (!history || history.length === 0) return 0;
      const ftGw = upcomingGameweek || (currentGameweek ? currentGameweek + 1 : 1);
      return calculateFreeTransfers(history, chips, ftGw);
    }
    case 'chipsAvailable': {
      const chips = item.historyData?.chips || [];
      const secondHalfUsed = (item.latestTracking as any)?.secondHalfChipsUsed ??
        chips.filter(c => c.event >= 20).length;
      return Math.max(0, 4 - secondHalfUsed);
    }
    case 'projected_points':
      return (item as any).projected_points || 0;
    case 'name':
      return item.name?.toLowerCase() || '';
    default:
      return 0;
  }
}

export const SHARED_SORT_KEY_MAP: Record<string, string> = {
  'latestTracking.overallRank': 'latestTracking.overallRank',
  'rankChange': 'rankChange',
  'latestTracking.overallPoints': 'latestTracking.overallPoints',
  'latestTracking.gameweekPoints': 'latestTracking.gameweekPoints',
  'latestTracking.squadValue': 'latestTracking.squadValue',
  'latestTracking.bank': 'latestTracking.bank',
  'latestTracking.teamValue': 'latestTracking.teamValue',
  'transfersMade': 'transfersMade',
  'gwTransfers': 'gwTransfers',
  'freeTransfers': 'freeTransfers',
  'chipsAvailable': 'chipsAvailable',
  'name': 'name',
};

export function sortManagerData<T extends ManagerStandingsData>(
  data: T[],
  sortField: string,
  sortDirection: 'asc' | 'desc',
  currentGameweek?: number,
  valueScale: ValueScale = 'millions',
  upcomingGameweek?: number
): T[] {
  return [...data].sort((a, b) => {
    const aVal = getSharedSortValue(a, sortField, currentGameweek, valueScale, upcomingGameweek);
    const bVal = getSharedSortValue(b, sortField, currentGameweek, valueScale, upcomingGameweek);

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });
}
