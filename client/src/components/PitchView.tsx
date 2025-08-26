import { Badge } from "@/components/ui/badge";
import { Shield, User, Crown } from "lucide-react";

interface TeamPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

interface TeamData {
  picks: TeamPick[];
}

interface Player {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team_name: string;
  element_type: number;
  now_cost: number;
  total_points: number;
  form: string;
  selected_by_percent: string;
}

interface BootstrapData {
  elements: Player[];
  element_types: Array<{
    id: number;
    plural_name: string;
    singular_name: string;
  }>;
  teams: Array<{
    id: number;
    name: string;
    short_name: string;
  }>;
}

interface PitchViewProps {
  teamData: TeamData;
  bootstrapData: BootstrapData | undefined;
  getPlayerById: (id: number) => Player | undefined;
  getTeamName: (player: Player) => string;
  formatPrice: (price: number) => string;
}

const PlayerCard = ({ pick, player, getTeamName, formatPrice }: {
  pick: TeamPick;
  player: Player;
  getTeamName: (player: Player) => string;
  formatPrice: (price: number) => string;
}) => {
  return (
    <div className="flex flex-col items-center group">
      <div className={`
        relative w-16 h-20 rounded-lg flex flex-col items-center justify-center text-white font-bold shadow-lg transition-transform group-hover:scale-110
        ${pick.is_captain ? 'bg-amber-500 ring-4 ring-amber-300' : 
          pick.is_vice_captain ? 'bg-blue-500 ring-4 ring-blue-300' : 
          'bg-green-600'}
      `}>
        {pick.is_captain && (
          <Crown className="absolute -top-1 -right-1 h-4 w-4 text-amber-200" />
        )}
        {pick.is_vice_captain && (
          <Shield className="absolute -top-1 -right-1 h-4 w-4 text-blue-200" />
        )}
        
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-1">
          <span className="text-xs font-bold">
            {player.web_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </span>
        </div>
        
        <span className="text-xs text-center px-1 leading-tight">
          {player.web_name.length > 8 ? player.web_name.slice(0, 8) + '.' : player.web_name}
        </span>
      </div>
      
      <div className="mt-2 text-center">
        <div className="text-xs font-medium text-gray-700">{getTeamName(player)}</div>
        <div className="text-xs text-green-600 font-bold">{formatPrice(player.now_cost)}</div>
        {pick.is_captain && <Badge variant="secondary" className="text-xs px-1 py-0 mt-1">C</Badge>}
        {pick.is_vice_captain && <Badge variant="outline" className="text-xs px-1 py-0 mt-1">VC</Badge>}
      </div>
    </div>
  );
};

export default function PitchView({ teamData, bootstrapData, getPlayerById, getTeamName, formatPrice }: PitchViewProps) {
  if (!teamData || !bootstrapData) return null;

  const startingEleven = teamData.picks.filter(pick => pick.position <= 11);
  
  // Group players by position type
  const playersByPosition = {
    goalkeepers: startingEleven.filter(pick => {
      const player = getPlayerById(pick.element);
      return player?.element_type === 1;
    }),
    defenders: startingEleven.filter(pick => {
      const player = getPlayerById(pick.element);
      return player?.element_type === 2;
    }),
    midfielders: startingEleven.filter(pick => {
      const player = getPlayerById(pick.element);
      return player?.element_type === 3;
    }),
    forwards: startingEleven.filter(pick => {
      const player = getPlayerById(pick.element);
      return player?.element_type === 4;
    })
  };

  return (
    <div className="relative">
      {/* Football Pitch Background */}
      <div className="relative bg-gradient-to-b from-green-400 to-green-500 rounded-lg p-6 min-h-[600px] overflow-hidden">
        {/* Pitch Lines */}
        <div className="absolute inset-4 border-2 border-white/30 rounded"></div>
        <div className="absolute left-1/2 top-4 bottom-4 w-0 border-l-2 border-white/30 transform -translate-x-1/2"></div>
        <div className="absolute left-1/2 top-1/2 w-16 h-16 border-2 border-white/30 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute left-4 top-1/2 w-16 h-20 border-2 border-white/30 transform -translate-y-1/2"></div>
        <div className="absolute right-4 top-1/2 w-16 h-20 border-2 border-white/30 transform -translate-y-1/2"></div>
        
        {/* Goal Areas */}
        <div className="absolute left-4 top-1/2 w-8 h-12 border-2 border-white/30 transform -translate-y-1/2"></div>
        <div className="absolute right-4 top-1/2 w-8 h-12 border-2 border-white/30 transform -translate-y-1/2"></div>

        {/* Players positioned on the pitch */}
        <div className="relative h-full flex flex-col justify-between py-8">
          
          {/* Forwards */}
          <div className="flex justify-center items-center gap-8 mb-12">
            {playersByPosition.forwards.map((pick) => {
              const player = getPlayerById(pick.element);
              if (!player) return null;
              return (
                <PlayerCard 
                  key={pick.element}
                  pick={pick} 
                  player={player} 
                  getTeamName={getTeamName}
                  formatPrice={formatPrice}
                />
              );
            })}
          </div>

          {/* Midfielders */}
          <div className="flex justify-center items-center gap-6 mb-12">
            {playersByPosition.midfielders.map((pick) => {
              const player = getPlayerById(pick.element);
              if (!player) return null;
              return (
                <PlayerCard 
                  key={pick.element}
                  pick={pick} 
                  player={player} 
                  getTeamName={getTeamName}
                  formatPrice={formatPrice}
                />
              );
            })}
          </div>

          {/* Defenders */}
          <div className="flex justify-center items-center gap-4 mb-12">
            {playersByPosition.defenders.map((pick) => {
              const player = getPlayerById(pick.element);
              if (!player) return null;
              return (
                <PlayerCard 
                  key={pick.element}
                  pick={pick} 
                  player={player} 
                  getTeamName={getTeamName}
                  formatPrice={formatPrice}
                />
              );
            })}
          </div>

          {/* Goalkeeper */}
          <div className="flex justify-center items-center">
            {playersByPosition.goalkeepers.map((pick) => {
              const player = getPlayerById(pick.element);
              if (!player) return null;
              return (
                <PlayerCard 
                  key={pick.element}
                  pick={pick} 
                  player={player} 
                  getTeamName={getTeamName}
                  formatPrice={formatPrice}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Formation Display */}
      <div className="text-center mt-4">
        <Badge variant="outline" className="px-4 py-2 text-lg font-bold">
          {playersByPosition.defenders.length}-{playersByPosition.midfielders.length}-{playersByPosition.forwards.length}
        </Badge>
      </div>
    </div>
  );
}