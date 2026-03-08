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
  generatedAt?: string;
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

const CHRONOTYPE_HOURS: Record<string, { work: string, rest: string }> = {
  lion: { work: "8 AM - 12 PM, 2 PM - 4 PM", rest: "12 PM - 2 PM, After 5 PM" },
  bear: { work: "10 AM - 2 PM, 4 PM - 6 PM", rest: "2 PM - 4 PM, After 6 PM" },
  wolf: { work: "2 PM - 6 PM, 8 PM - 10 PM", rest: "Morning, 6 PM - 8 PM" },
  night_owl: { work: "8 PM - 12 AM, 2 PM - 4 PM", rest: "Morning, 4 PM - 8 PM" },
  dolphin: { work: "10 AM - 12 PM, 4 PM - 6 PM", rest: "12 PM - 4 PM, After 6 PM" },
};

export default function RecommendationsPanel({
  recommendations,
  chronotype = "bear",
  baseCapacity = 8.0,
  generatedAt
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
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 font-medium">
            {CHRONOTYPE_LABELS[chronotype] || "☀️ Flexible"}
          </span>
          <span className="text-xs bg-secondary text-secondary-foreground border border-border rounded-full px-3 py-1 font-medium">
            Capacity: {baseCapacity} τ/day
          </span>
        </div>
        
        {generatedAt && (
          <span className="text-[10px] text-muted-foreground italic">
            Updated: {new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {CHRONOTYPE_HOURS[chronotype] && (
        <div className="bg-muted/40 border border-border rounded-xl p-3 mb-2">
          <p className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-yellow-500" /> Optimal Rhythm</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-muted-foreground block mb-0.5">Suggested Work</span>
              <span className="font-medium text-emerald-400">{CHRONOTYPE_HOURS[chronotype].work}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">Suggested Rest</span>
              <span className="font-medium text-blue-400">{CHRONOTYPE_HOURS[chronotype].rest}</span>
            </div>
          </div>
        </div>
      )}

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
