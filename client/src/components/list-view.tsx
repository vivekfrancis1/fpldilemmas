import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export interface ListPlayer {
  element: number;
  element_type: number;
  position: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  multiplier?: number;
  web_name?: string;
  player_name?: string;
  team_name?: string;
  team_short_name?: string;
  team_id?: number;
  now_cost?: number;
  event_points?: number;
  total_points?: number;
  form?: string;
  selected_by_percent?: string;
  is_transferred_in?: boolean;
  custom_display?: string;
}

export interface ListViewProps {
  startingPlayers: ListPlayer[];
  benchPlayers: ListPlayer[];
  title?: string;
  subtitle?: string;
  benchTitle?: string;
  benchSubtitle?: string;
  showForm?: boolean;
  showOwnership?: boolean;
  showPrice?: boolean;
  displayMode?: "points" | "projected" | "opponent";
  getPlayerDisplay?: (player: ListPlayer) => string;
  getPositionName?: (elementType: number) => string;
  formatPrice?: (price: number) => string;
  renderPlayerActions?: (player: ListPlayer, index: number) => React.ReactNode;
  onPlayerClick?: (player: ListPlayer, index: number) => void;
  selectedPlayerId?: number | null;
}

const POSITION_NAMES: Record<number, string> = {
  1: "Goalkeeper",
  2: "Defender",
  3: "Midfielder",
  4: "Forward",
};

const POSITION_SHORT: Record<number, string> = {
  1: "GKP",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

const POSITION_COLORS: Record<number, string> = {
  1: "bg-yellow-50 border-yellow-200 text-yellow-800",
  2: "bg-blue-50 border-blue-200 text-blue-800",
  3: "bg-green-50 border-green-200 text-green-800",
  4: "bg-red-50 border-red-200 text-red-800",
};

function defaultFormatPrice(price: number): string {
  return `£${(price / 10).toFixed(1)}m`;
}

function defaultGetPositionName(elementType: number): string {
  return POSITION_NAMES[elementType] || "Unknown";
}

export function ListView({
  startingPlayers,
  benchPlayers,
  title = "Starting XI",
  subtitle = "Your team formation",
  benchTitle = "Bench",
  benchSubtitle = "Substitute players",
  showForm = true,
  showOwnership = true,
  showPrice = true,
  displayMode = "points",
  getPlayerDisplay,
  getPositionName = defaultGetPositionName,
  formatPrice = defaultFormatPrice,
  renderPlayerActions,
  onPlayerClick,
  selectedPlayerId,
}: ListViewProps) {
  const groupPlayersByPosition = (players: ListPlayer[]) => {
    const groups: Record<number, ListPlayer[]> = { 1: [], 2: [], 3: [], 4: [] };
    players.forEach((player) => {
      const posType = player.element_type;
      if (groups[posType]) {
        groups[posType].push(player);
      }
    });
    return groups;
  };

  const getDisplayValue = (player: ListPlayer): string => {
    if (getPlayerDisplay) {
      return getPlayerDisplay(player);
    }
    if (displayMode === "points") {
      const points = player.event_points || 0;
      return player.is_captain ? `${points * 2} pts` : `${points} pts`;
    }
    if (displayMode === "projected" && player.custom_display) {
      return player.custom_display;
    }
    return `${player.event_points || 0} pts`;
  };

  const renderPlayer = (player: ListPlayer, index: number, isBench: boolean = false) => {
    const isSelected = selectedPlayerId === player.element;
    
    return (
      <div
        key={player.element}
        className={`relative flex items-start md:items-center justify-between p-2 md:p-4 border-l-2 md:border-l-4 hover:bg-gray-50 transition-colors cursor-pointer ${
          isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""
        } ${
          player.is_captain
            ? "bg-amber-50 border-amber-400"
            : player.is_vice_captain
            ? "bg-blue-50 border-blue-400"
            : player.is_transferred_in
            ? "bg-green-50 border-green-400"
            : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => onPlayerClick?.(player, index)}
        data-testid={`list-player-${player.element}`}
      >
        <div className="flex items-start md:items-center gap-2 md:gap-3 flex-1 min-w-0">
          {isBench && (
            <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-200 rounded-full flex items-center justify-center text-[10px] md:text-xs font-medium text-gray-600 flex-shrink-0">
              {player.position - 11}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 md:gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-xs md:text-sm truncate">
                {player.web_name || player.player_name || "Unknown"}
              </span>
              {player.is_captain && (
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] md:text-xs px-1 md:px-2 py-0.5">
                  C
                </Badge>
              )}
              {player.is_vice_captain && (
                <Badge
                  variant="outline"
                  className="border-blue-300 text-blue-700 text-[10px] md:text-xs px-1 md:px-2 py-0.5"
                >
                  VC
                </Badge>
              )}
              {player.is_transferred_in && (
                <Badge className="bg-green-500 hover:bg-green-600 text-white text-[10px] md:text-xs px-1 md:px-2 py-0.5">
                  NEW
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap mt-0.5 md:mt-1">
              <span className="text-[10px] md:text-xs font-medium text-gray-700">
                {player.team_short_name || player.team_name || "UNK"}
              </span>
              {isBench && (
                <Badge variant="outline" className="text-[10px] md:text-xs px-1 py-0.5">
                  {POSITION_SHORT[player.element_type] || "UNK"}
                </Badge>
              )}
              {showForm && player.form && (
                <span className="text-[10px] md:text-xs text-gray-500">
                  Form: {player.form}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right space-y-0.5 ml-2 flex-shrink-0">
          {showPrice && player.now_cost && (
            <p className="font-semibold text-green-600 text-[10px] md:text-xs">
              {formatPrice(player.now_cost)}
            </p>
          )}
          <p
            className={`text-[10px] md:text-xs font-medium ${
              player.is_captain ? "text-amber-600" : "text-gray-600"
            }`}
          >
            {getDisplayValue(player)}
          </p>
          {player.is_captain && displayMode === "points" && player.event_points !== undefined && (
            <p className="text-[9px] md:text-[10px] text-gray-500 hidden md:block">
              ({player.event_points}×2)
            </p>
          )}
          {showOwnership && player.selected_by_percent && (
            <p className="text-[9px] md:text-[10px] text-gray-500">
              {parseFloat(player.selected_by_percent).toFixed(1)}%
            </p>
          )}
        </div>
        {renderPlayerActions && renderPlayerActions(player, index)}
      </div>
    );
  };

  const startingGroups = groupPlayersByPosition(startingPlayers);

  return (
    <div className="grid gap-3 md:gap-6 lg:grid-cols-2">
      <Card className="bg-white shadow-lg border border-gray-200">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-sm md:text-lg">
            <Users className="h-4 w-4 md:h-5 md:w-5" />
            {title}
          </CardTitle>
          <CardDescription className="text-emerald-50 text-[10px] md:text-sm">
            {subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {[1, 2, 3, 4].map((posType) => {
              const playersInPosition = startingGroups[posType] || [];
              if (playersInPosition.length === 0) return null;

              return (
                <div key={posType} className="border-b border-gray-100 last:border-b-0">
                  <div
                    className={`px-2 md:px-4 py-1 md:py-1.5 text-[10px] md:text-xs font-semibold uppercase tracking-wide ${POSITION_COLORS[posType]} border-l-2 md:border-l-4`}
                  >
                    {getPositionName(posType)}s ({playersInPosition.length})
                  </div>
                  {playersInPosition.map((player, idx) =>
                    renderPlayer(player, idx, false)
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-lg border border-gray-200">
        <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-t-lg p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-sm md:text-lg">
            <Users className="h-4 w-4 md:h-5 md:w-5" />
            {benchTitle}
          </CardTitle>
          <CardDescription className="text-gray-100 text-[10px] md:text-sm">
            {benchSubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {benchPlayers.map((player, idx) => renderPlayer(player, idx, true))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ListView;
