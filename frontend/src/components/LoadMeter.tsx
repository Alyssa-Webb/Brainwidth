"use client";

import { BrainCircuit, AlertTriangle } from "lucide-react";

export default function LoadMeter({ currentLoad, maxLoad }: { currentLoad: number, maxLoad: number }) {
  const percentage = Math.min((currentLoad / maxLoad) * 100, 100);
  
  const getGradient = () => {
    if (percentage < 60) return "from-emerald-400 to-teal-500";
    if (percentage < 85) return "from-amber-400 to-orange-500";
    return "from-red-500 to-rose-600";
  };
  
  const getStatus = () => {
    if (percentage < 60) return "Optimal Capacity";
    if (percentage < 85) return "Approaching Limit";
    if (percentage < 100) return "High Cognitive Load";
    return "Burnout Risk";
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl w-full">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BrainCircuit className={percentage >= 85 ? "text-red-400" : "text-indigo-400"} />
            Mental Tax
          </h2>
          <p className="text-sm text-white/60 mt-1">{getStatus()}</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
            {currentLoad.toFixed(1)}
          </span>
          <span className="text-white/50 text-sm ml-1">/ {maxLoad} u</span>
        </div>
      </div>
      
      <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
        <div 
          className={`h-full bg-gradient-to-r ${getGradient()} transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
        {/* Safe limit indicator at 85% */}
        <div className="absolute top-0 bottom-0 left-[85%] w-px bg-white/30 border-l border-dashed z-10" title="Safe Limit" />
      </div>

      {percentage >= 85 && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-red-200">
            You are reaching your cognitive capacity for the day. Consider deferring high-focus tasks to tomorrow.
          </p>
        </div>
      )}
    </div>
  );
}
