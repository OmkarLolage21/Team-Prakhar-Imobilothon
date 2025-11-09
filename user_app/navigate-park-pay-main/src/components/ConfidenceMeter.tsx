import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ConfidenceMeterProps {
  percentage: number;
  confidence: number;
  trend?: "stable" | "rising" | "falling";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const ConfidenceMeter = ({
  percentage,
  confidence,
  trend = "stable",
  size = "md",
  showLabel = true,
}: ConfidenceMeterProps) => {
  const getColorClass = () => {
    if (percentage >= 75) return "text-success";
    if (percentage >= 50) return "text-warning";
    return "text-destructive";
  };

  const getBarColorClass = () => {
    if (percentage >= 75) return "bg-success";
    if (percentage >= 50) return "bg-warning";
    return "bg-destructive";
  };

  const getTrendIcon = () => {
    if (trend === "rising") return <TrendingUp className="w-3 h-3" />;
    if (trend === "falling") return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1 font-semibold ${getColorClass()} ${sizeClasses[size]}`}>
          <span>{percentage}%</span>
          <span className="text-muted-foreground text-xs">(±{confidence}%)</span>
          <span className="text-muted-foreground">{getTrendIcon()}</span>
        </div>
        {showLabel && (
          <span className="text-xs text-muted-foreground">Confidence</span>
        )}
      </div>
      <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColorClass()} transition-all duration-500 rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
