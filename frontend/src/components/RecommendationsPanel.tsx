"use client";

import { AlertTriangle, CheckCircle, Info, Target, BedDouble, Zap } from "lucide-react";

interface Recommendation {
  type: string;
  title: string;
  message: string;
  severity: "high" | "medium" | "low" | "info";
}

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  chronotype?: string;
  baseCapacity?: number;
}

const ICONS: Record<string, React.ReactNode> = {
  warning: <AlertTriangle className="w-4 h-4 text-red-400" />,
  caution: <AlertTriangle className="w-4 h-4 text-orange-400" />,
  success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  chronotype: <Zap className="w-4 h-4 text-yellow-400" />,
  break: <BedDouble className="w-4 h-4 text-blue-400" />,
  goals: <Target className="w-4 h-4 text-primary" />,
  recovery: <Info className="w-4 h-4 text-muted-foreground" />,
};

const SEVERITY_STYLES: Record<string, string> = {
  high: "border-red-500/30 bg-red-500/10",
  medium: "border-orange-500/30 bg-orange-500/10",
  low: "border-emerald-500/30 bg-emerald-500/10",
  info: "border-border bg-muted/30",
};

const CHRONOTYPE_LABELS: Record<string, string> = {
  lion: "🦁 Lion",
  bear: "🐻 Bear",
  wolf: "🐺 Wolf",
  night_owl: "🦉 Night Owl",
  dolphin: "🐬 Dolphin",
};

export default function RecommendationsPanel({
  recommendations,
  chronotype = "bear",
  baseCapacity = 8.0
}: RecommendationsPanelProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="p-4 text-muted-foreground text-sm text-center">
        No recommendations yet. Generate a schedule first.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Profile summary chips */}
      <div className="flex flex-wrap gap-2 pb-2">
        <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 font-medium">
          {CHRONOTYPE_LABELS[chronotype] || "☀️ Flexible"}
        </span>
        <span className="text-xs bg-secondary text-secondary-foreground border border-border rounded-full px-3 py-1 font-medium">
          Capacity: {baseCapacity} τ/day
        </span>
      </div>

      {/* Recommendation cards */}
      {recommendations.map((rec, i) => (
        <div
          key={i}
          className={`rounded-xl border p-3 transition-all hover:scale-[1.01] ${SEVERITY_STYLES[rec.severity] || SEVERITY_STYLES.info}`}
        >
          <div className="flex items-start gap-2">
            <div className="mt-0.5 shrink-0">
              {ICONS[rec.type] || <Info className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground mb-0.5">{rec.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{rec.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
