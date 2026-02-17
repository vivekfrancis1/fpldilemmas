import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, ShieldOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AvailabilityToggleProps {
  isAdjusted: boolean;
  onToggle: () => void;
  compact?: boolean;
}

export function AvailabilityToggle({
  isAdjusted,
  onToggle,
  compact = false,
}: AvailabilityToggleProps) {
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              {isAdjusted ? (
                <Shield className="h-3.5 w-3.5 text-purple-600" />
              ) : (
                <ShieldOff className="h-3.5 w-3.5 text-gray-400" />
              )}
              <Switch
                checked={isAdjusted}
                onCheckedChange={onToggle}
                className="scale-75"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs max-w-[200px]">
              {isAdjusted
                ? "Availability adjustments ON — projections reflect injury/suspension status"
                : "Availability adjustments OFF — showing raw projections"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isAdjusted ? (
        <Shield className="h-4 w-4 text-purple-600" />
      ) : (
        <ShieldOff className="h-4 w-4 text-gray-400" />
      )}
      <Label
        htmlFor="availability-toggle"
        className="text-sm font-medium cursor-pointer select-none"
      >
        Availability Adjusted
      </Label>
      <Switch
        id="availability-toggle"
        checked={isAdjusted}
        onCheckedChange={onToggle}
      />
    </div>
  );
}
