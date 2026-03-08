"use client";

import { Clock, Tag } from "lucide-react";

export default function CalendarView({ scheduleData }: { scheduleData: any }) {
  if (!scheduleData || Object.keys(scheduleData).length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-dashed border-border rounded-2xl bg-muted/30 transition-colors">
        <Clock className="text-muted-foreground mb-3" size={48} />
        <p className="text-foreground font-medium">Your schedule is clear</p>
        <p className="text-muted-foreground text-sm mt-1">Add tasks to generate a flux schedule</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(scheduleData).map(([dayKey, dayData]: [string, any]) => {
        if (dayData.tasks.length === 0) return null;

        return (
          <div key={dayKey} className="space-y-4">
            <h4 className="font-bold text-lg text-foreground border-b border-border pb-2 flex items-center justify-between">
              {dayKey.split(' (')[0]}
              <span className="text-sm font-normal px-3 py-1 bg-secondary rounded-full">
                Load: {dayData.total_load.toFixed(2)}
              </span>
            </h4>
            <div className="space-y-3">
              {dayData.tasks.map((task: any, idx: number) => {
                const isHighLoad = task.mental_tax > 1.0;
                
                return (
                  <div 
                    key={task.id || idx} 
                    className={`p-4 rounded-xl border backdrop-blur-md transition-all hover:scale-[1.01] ${
                      isHighLoad 
                        ? 'bg-primary/10 border-primary/30 shadow-sm' 
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-card-foreground text-lg flex items-center gap-2">
                          {task.title}
                          {task.is_fixed && (
                            <span className="bg-blue-500/20 text-blue-500 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">Fixed</span>
                          )}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Tag size={14} />
                            {task.source}
                          </span>
                        </div>
                      </div>
                      <div className="bg-secondary/50 px-3 py-1.5 rounded-lg border border-border text-right shrink-0">
                        <span className="block text-xs text-muted-foreground mb-0.5">Tax</span>
                        <span className={`font-bold ${isHighLoad ? 'text-primary' : 'text-emerald-500'}`}>
                          +{task.mental_tax ? task.mental_tax.toFixed(2) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
