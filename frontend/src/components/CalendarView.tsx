"use client";

import { Clock, Tag } from "lucide-react";

export default function CalendarView({ tasks }: { tasks: any[] }) {
  if (tasks.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/20 rounded-2xl bg-white/5">
        <Clock className="text-white/20 mb-3" size={48} />
        <p className="text-white/50 font-medium">Your schedule is clear</p>
        <p className="text-white/30 text-sm mt-1">Add tasks to generate a flux schedule</p>
      </div>
    );
  }

  let currentTime = 9.0; // Starts at 9:00 AM

  const formatTime = (timeInHours: number) => {
    const hours = Math.floor(timeInHours);
    const mins = Math.round((timeInHours - hours) * 60);
    const formatH = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${formatH}:${mins.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="space-y-4">
      {tasks.map((task, index) => {
        const startTime = currentTime;
        currentTime += task.duration;
        const endTime = currentTime;
        
        const isHighLoad = task.type === 'STEM' || task.type === 'Deep Work';
        
        return (
          <div 
            key={task.id || index} 
            className={`p-4 rounded-xl border backdrop-blur-md transition-all hover:scale-[1.01] ${
              isHighLoad 
                ? 'bg-blue-900/20 border-blue-500/30 auto shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-white text-lg">{task.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {formatTime(startTime)} - {formatTime(endTime)} ({task.duration}h)
                  </span>
                  <span className="flex items-center gap-1">
                    <Tag size={14} />
                    {task.type}
                  </span>
                </div>
              </div>
              <div className="bg-black/30 px-3 py-1.5 rounded-lg border border-white/5 text-right">
                <span className="block text-xs text-white/50 mb-0.5">Tax</span>
                <span className={`font-bold ${isHighLoad ? 'text-blue-400' : 'text-emerald-400'}`}>
                  +{task.mental_tax ? task.mental_tax.toFixed(2) : '-'}
                </span>
              </div>
            </div>
            {task.context_switched && (
              <div className="mt-3 text-xs bg-amber-500/10 text-amber-300 px-2 py-1 rounded inline-block">
                ⚠️ Context Switch Penalty Applied (+0.15 Tax)
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
