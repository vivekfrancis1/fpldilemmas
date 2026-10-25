import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, AlertTriangle, Search, BarChart3, ChevronUp, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerNameCell } from "@/components/enhanced-table";
import { EmptyNote, HeroPanel, HeroStat, InputPanel, PercentBar, Pill, SectionCard, SegmentedControl } from "@/components/tool-ui";
import { BootstrapData } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";

interface TransferData {
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
  current_price: number;
  ownership_percentage: number;
  // Season totals
  net_transfers: number;
  transfers_in: number;
  transfers_out: number;
  // Gameweek data
  transfers_in_event: number;
  transfers_out_event: number;
  net_transfers_event: number;
  // Price change data from FPL API
  price_change_event: number;  // Price change this gameweek
  price_change_season: number; // Total price change this season
  // Calculated fields
  absolute_ownership?: number;
  initial_ownership?: number;
  initial_ownership_gameweek?: number;
  net_transfers_percentage?: number;
  net_transfers_event_percentage?: number;
}

type SortField = 'net_transfers' | 'transfers_in' | 'transfers_out' | 'transfers_in_event' | 'transfers_out_event' | 'net_transfers_event' | 'ownership_percentage' | 'absolute_ownership' | 'initial_ownership' | 'initial_ownership_gameweek' | 'net_transfers_percentage' | 'net_transfers_event_percentage' | 'current_price' | 'price_change_event' | 'price_change_season';
type SortDirection = 'asc' | 'desc';

export default function TransferTracker() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [transferTypeFilter, setTransferTypeFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>('net_transfers_event');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const isMobile = useIsMobile();

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: transferData, isLoading: isLoadingTransfers, error: transfersError } = useQuery({
    queryKey: ["/api/price-predictions"],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const getPlayersByPosition = () => {
    if (!bootstrapData) return [];
    return bootstrapData.element_types.map(position => ({
      id: position.id,
      name: position.singular_name_short
    }));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedAndFilteredTransfers = useMemo(() => {
    if (!Array.isArray(transferData)) return [];
    
    // First filter and enhance the transfer data with calculated fields
    const filtered = transferData.filter((data: TransferData) => {
      const matchesSearch = data.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           data.team_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === "all" || data.position === positionFilter;
      const matchesTransferType = transferTypeFilter === "all" || 
                                 (transferTypeFilter === "in" && data.net_transfers > 0) ||
                                 (transferTypeFilter === "out" && data.net_transfers < 0) ||
                                 (transferTypeFilter === "stable" && data.net_transfers === 0);
      return matchesSearch && matchesPosition && matchesTransferType;
    }).map((data: TransferData) => {
      // Calculate additional transfer analysis fields using actual FPL total players
      const totalPlayers = bootstrapData?.total_players || 11131759; // Use actual current total as fallback
      const absoluteOwnership = Math.round((data.ownership_percentage / 100) * totalPlayers);
      
      // Calculate initial ownership (before any season transfers)
      // Initial Ownership = Current Absolute Ownership - Season Net Transfers
      const initialOwnershipSeason = absoluteOwnership - (data.net_transfers || 0);
      
      // Calculate initial ownership at gameweek start (before gameweek transfers)
      const netTransfersEvent = (data.transfers_in_event || 0) - (data.transfers_out_event || 0);
      const initialOwnershipGameweek = absoluteOwnership - netTransfersEvent;
      
      // Calculate season net transfer percentage (as % of initial season ownership)
      const netTransfersPercentage = initialOwnershipSeason > 0 ? 
        Math.round((data.net_transfers / initialOwnershipSeason) * 10000) / 100 : 0;
      
      // Calculate gameweek net transfer percentage (as % of initial gameweek ownership)
      const netTransfersEventPercentage = initialOwnershipGameweek > 0 ? 
        Math.round((netTransfersEvent / initialOwnershipGameweek) * 10000) / 100 : 0;
      

      
      return {
        ...data,
        net_transfers_event: netTransfersEvent,
        absolute_ownership: absoluteOwnership,
        initial_ownership: initialOwnershipSeason,
        initial_ownership_gameweek: initialOwnershipGameweek,
        net_transfers_percentage: netTransfersPercentage,
        net_transfers_event_percentage: netTransfersEventPercentage
      };
    });

    // Then sort the filtered results
    return filtered.sort((a: TransferData, b: TransferData) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'absolute_ownership':
          aValue = a.absolute_ownership || 0;
          bValue = b.absolute_ownership || 0;
          break;
        case 'initial_ownership':
          aValue = a.initial_ownership || 0;
          bValue = b.initial_ownership || 0;
          break;
        case 'initial_ownership_gameweek':
          aValue = a.initial_ownership_gameweek || 0;
          bValue = b.initial_ownership_gameweek || 0;
          break;
        case 'net_transfers_percentage':
          aValue = a.net_transfers_percentage || 0;
          bValue = b.net_transfers_percentage || 0;
          break;
        case 'transfers_in_event':
          aValue = a.transfers_in_event || 0;
          bValue = b.transfers_in_event || 0;
          break;
        case 'transfers_out_event':
          aValue = a.transfers_out_event || 0;
          bValue = b.transfers_out_event || 0;
          break;
        case 'net_transfers_event':
          aValue = a.net_transfers_event || 0;
          bValue = b.net_transfers_event || 0;
          break;
        case 'net_transfers_event_percentage':
          aValue = a.net_transfers_event_percentage || 0;
          bValue = b.net_transfers_event_percentage || 0;
          break;
        case 'price_change_event':
          aValue = a.price_change_event || 0;
          bValue = b.price_change_event || 0;
          break;
        case 'price_change_season':
          aValue = a.price_change_season || 0;
          bValue = b.price_change_season || 0;
          break;

        default:
          aValue = a[sortField];
          bValue = b[sortField];
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transferData, searchTerm, positionFilter, transferTypeFilter, sortField, sortDirection]);

  const SortableHeader = ({ field, children, className = "" }: { 
    field: SortField; 
    children: React.ReactNode; 
    className?: string; 
  }) => (
    <Button
      variant="ghost"
      className={`h-auto p-1 justify-start font-semibold text-xs hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors ${className}`}
      onClick={() => handleSort(field)}
      data-testid={`header-${field}`}
    >
      <div className="flex items-center gap-1">
        <span className="text-gray-700 dark:text-gray-200">{children}</span>
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3 text-gray-600 dark:text-gray-300" /> : <ChevronDown className="h-3 w-3 text-gray-600 dark:text-gray-300" />
        )}
      </div>
    </Button>
  );

  const formatPrice = (price: number | string | undefined | null) => {
    if (price === null || price === undefined) {
      return "£?.?m";
    }
    
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(numPrice)) {
      return "£?.?m";
    }
    
    return `£${(numPrice / 10).toFixed(1)}m`;
  };

  const fmtNet = (n: number) =>
    `${n > 0 ? "+" : ""}${Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(0)}k` : n.toLocaleString()}`;
  const fmtPriceDelta = (n: number) => `${n > 0 ? "+" : ""}${(n / 10).toFixed(1)}`;
  const tone = (n: number): "green" | "red" | "gray" => (n > 0 ? "green" : n < 0 ? "red" : "gray");

  const transfers = Array.isArray(transferData) ? transferData : [];
  const maxOwnership = Math.max(1, ...sortedAndFilteredTransfers.map((t: TransferData) => t.ownership_percentage || 0));

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-title">
          <BarChart3 className="h-8 w-8" />
          <h1>Transfer Tracker</h1>
        </div>
        <p className="fpl-page-subtitle">
          Comprehensive transfer analysis and ownership tracking for all FPL players
        </p>
      </div>

      <div className="fpl-section-spacing space-y-5">
        <HeroPanel testId="transfer-summary">
          <div className="grid gap-6 sm:grid-cols-3">
            <HeroStat
              label="Net positive transfers"
              value={transfers.filter((p: any) => p.net_transfers > 0).length}
              valueTestId="text-net-positive"
              sub={<span className="inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> More transfers in than out this season</span>}
            />
            <HeroStat
              label="Net negative transfers"
              value={transfers.filter((p: any) => p.net_transfers < 0).length}
              valueTestId="text-net-negative"
              sub={<span className="inline-flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5" /> More transfers out than in this season</span>}
            />
            <HeroStat
              label="High ownership players"
              value={transfers.filter((p: any) => p.ownership_percentage > 10).length}
              valueTestId="text-high-ownership"
              sub="Owned by more than 10% of managers"
            />
          </div>
        </HeroPanel>

        <InputPanel icon={SlidersHorizontal} title="Find players" subtitle="Search by player or club, then narrow by position and transfer direction">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-indigo-500" />
            <Input
              placeholder="Search players or teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 rounded-xl pl-10 text-base"
              data-testid="input-search-players"
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Position</span>
              <SegmentedControl
                ariaLabel="Position"
                testIdPrefix="select-position-filter"
                value={positionFilter}
                onChange={setPositionFilter}
                options={[{ value: "all", label: "All" }, ...getPlayersByPosition().map((p) => ({ value: p.name, label: p.name }))]}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Transfers</span>
              <SegmentedControl
                ariaLabel="Transfer direction"
                testIdPrefix="select-transfer-type-filter"
                value={transferTypeFilter}
                onChange={setTransferTypeFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "in", label: "Net in" },
                  { value: "out", label: "Net out" },
                  { value: "stable", label: "Stable" },
                ]}
              />
            </div>
          </div>
        </InputPanel>

        {/* Error Display */}
        {transfersError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load transfer data from FPL API. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* All Players Transfer Tracker */}
        <SectionCard
          icon={BarChart3}
          title={`All Players Transfer Tracker (${transfers.length} players)`}
          subtitle="Season-to-date transfer activity, ownership levels, and comprehensive transfer analysis"
          bodyClassName="p-0"
        >
          {(isLoadingBootstrap || isLoadingTransfers) ? (
            <div className="space-y-3 p-4 sm:p-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="h-14 rounded-xl bg-gray-200"></div>
                </div>
              ))}
            </div>
          ) : sortedAndFilteredTransfers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50/80 dark:bg-gray-800/50">
                    <th className="text-left py-2 px-3 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-700 min-w-[120px]">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Player</div>
                    </th>
                    <th className="text-right py-2 px-2 min-w-[60px] hidden sm:table-cell">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Price</div>
                    </th>
                    <th className="text-right py-2 px-2 min-w-[150px]">
                      <SortableHeader field="ownership_percentage" className="text-right font-semibold">
                        Own %
                      </SortableHeader>
                    </th>

                    {/* Gameweek Section */}
                    <th className="text-center py-1 px-2 border-l-2 border-indigo-300 bg-indigo-500/10" colSpan={isMobile ? 2 : 3}>
                      <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">This GW</div>
                    </th>

                    {/* Season Section — hidden on mobile */}
                    {!isMobile && (
                      <th className="text-center py-1 px-2 border-l-2 border-violet-300 bg-violet-500/10" colSpan={2}>
                        <div className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide">Season Totals</div>
                      </th>
                    )}
                  </tr>
                  <tr className="border-b bg-gray-50/40 dark:bg-gray-900/30">
                    <th className="sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-700"></th>
                    <th className="hidden sm:table-cell"></th>
                    <th></th>

                    {/* Gameweek Sub-headers */}
                    <th className="text-right py-1 px-2 border-l border-indigo-200 min-w-[80px]">
                      <SortableHeader field="net_transfers_event" className="text-right text-xs">
                        Net Δ
                      </SortableHeader>
                    </th>
                    {!isMobile && (
                      <th className="text-right py-1 px-2 min-w-[60px]">
                        <SortableHeader field="net_transfers_event_percentage" className="text-right text-xs">
                          Net %
                        </SortableHeader>
                      </th>
                    )}
                    <th className="text-right py-1 px-2 min-w-[70px]">
                      <SortableHeader field="price_change_event" className="text-right text-xs">
                        Price Δ
                      </SortableHeader>
                    </th>

                    {/* Season Sub-headers — hidden on mobile */}
                    {!isMobile && (
                      <>
                        <th className="text-right py-1 px-2 border-l border-violet-200 min-w-[80px]">
                          <SortableHeader field="net_transfers" className="text-right text-xs">
                            Net Transfers
                          </SortableHeader>
                        </th>
                        <th className="text-right py-1 px-2 min-w-[70px]">
                          <SortableHeader field="price_change_season" className="text-right text-xs">
                            Price Δ
                          </SortableHeader>
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFilteredTransfers.map((transfer: TransferData, index: number) => (
                    <tr
                      key={`${transfer.player_id}-${index}`}
                      className="border-b border-gray-100 hover:bg-indigo-500/[0.04] transition-colors group"
                      data-testid={`transfer-${transfer.player_id}`}
                    >
                      <td className="py-2 px-3 sticky left-0 bg-white dark:bg-gray-950 group-hover:bg-indigo-50 dark:group-hover:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                              transfer.net_transfers > 0
                                ? "bg-emerald-500/15 text-emerald-600"
                                : transfer.net_transfers < 0
                                  ? "bg-red-500/15 text-red-600"
                                  : "bg-gray-500/10 text-gray-400"
                            }`}
                          >
                            {transfer.net_transfers > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : transfer.net_transfers < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : (
                              <BarChart3 className="h-3 w-3" />
                            )}
                          </span>
                          <PlayerNameCell
                            name={transfer.player_name}
                            position={transfer.position}
                            team={transfer.team_name}
                            compact={true}
                            playerId={transfer.player_id}
                          />
                        </div>
                      </td>
                      {/* Price — hidden on mobile */}
                      <td className="py-2 px-2 text-right hidden sm:table-cell">
                        <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100">
                          {formatPrice(transfer.current_price)}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <PercentBar percent={((transfer.ownership_percentage || 0) / maxOwnership) * 100} label={`${transfer.ownership_percentage?.toFixed(1) || "0.0"}%`} />
                      </td>

                      {/* Gameweek section */}
                      <td className="py-2 px-2 text-right border-l border-indigo-200 bg-indigo-500/[0.04]">
                        <Pill tone={tone(transfer.net_transfers_event || 0)} className="text-xs">
                          {fmtNet(transfer.net_transfers_event || 0)}
                        </Pill>
                      </td>
                      {/* GW Net% — hidden on mobile */}
                      {!isMobile && (
                        <td className="py-2 px-2 text-right bg-indigo-500/[0.04]">
                          <span className={`font-semibold text-xs tabular-nums ${
                            (transfer.net_transfers_event_percentage || 0) > 0 ? "text-emerald-700 dark:text-emerald-400" :
                            (transfer.net_transfers_event_percentage || 0) < 0 ? "text-red-700 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
                          }`}>
                            {(transfer.net_transfers_event_percentage || 0) > 0 ? "+" : ""}{(transfer.net_transfers_event_percentage || 0).toFixed(1)}%
                          </span>
                        </td>
                      )}
                      <td className="py-2 px-2 text-right bg-indigo-500/[0.04]">
                        <Pill tone={tone(transfer.price_change_event || 0)} className="text-xs font-bold">
                          {fmtPriceDelta(transfer.price_change_event || 0)}
                        </Pill>
                      </td>

                      {/* Season totals — hidden on mobile */}
                      {!isMobile && (
                        <>
                          <td className="py-2 px-2 text-right border-l border-violet-200 bg-violet-500/[0.04]">
                            <Pill tone={tone(transfer.net_transfers || 0)} className="text-xs">
                              {transfer.net_transfers ? fmtNet(transfer.net_transfers) : "0"}
                            </Pill>
                          </td>
                          <td className="py-2 px-2 text-right bg-violet-500/[0.04]">
                            <Pill tone={tone(transfer.price_change_season || 0)} className="text-xs font-bold">
                              {fmtPriceDelta(transfer.price_change_season || 0)}
                            </Pill>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              <EmptyNote icon={Search}>No transfer data found matching your filters.</EmptyNote>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
