"use client";

import { Clock, Tag, Calendar } from "lucide-react";
import CognitiveLoadChart from "@/components/CognitiveLoadChart";

interface TaskItem {
  source: string;
  title: string;
  mental_tax: number;
  is_fixed: boolean;
  start_hour?: number;
  location?: string;
  priority?: string;
  duration?: number;
}

interface DaySchedule {
  total_load: number;
  tasks: TaskItem[];
  hourly_load?: number[];
}

interface CalendarViewProps {
  scheduleData: Record<string, DaySchedule>;
  view?: "week" | "month";
  baseCapacity?: number;
  workStart?: number;
  workEnd?: number;
}

// Pixel height per hour slot
const HOUR_HEIGHT = 56;
const WORK_HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am–8pm

function getDateFromKey(dayKey: string): Date | null {
  const match = dayKey.match(/\((.+)\)/);
  if (!match) return null;
  return new Date(match[1] + "T12:00:00");
}

function isToday(dayKey: string): boolean {
  const d = getDateFromKey(dayKey);
  if (!d) return false;
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function getDayHeader(dayKey: string): { weekday: string; date: string } {
  const d = getDateFromKey(dayKey);
  if (!d) return { weekday: "—", date: "—" };
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

function getLoadColor(load: number, capacity: number): string {
  const r = load / capacity;
  if (r >= 0.9) return "text-red-500";
  if (r >= 0.7) return "text-orange-400";
  if (r >= 0.4) return "text-yellow-400";
  return "text-emerald-500";
}

function getTaskColor(tax: number, capacity: number): string {
  const cap = capacity / 8;
  if (tax > cap * 1.2) return "bg-red-500/20 border-red-500/40 text-red-400";
  if (tax > cap * 0.6) return "bg-orange-500/20 border-orange-500/40 text-orange-400";
  return "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
}

function getTaskBg(isFixed: boolean, tax: number, capacity: number): string {
  if (isFixed) return "bg-blue-500/15 border-blue-500/30";
  return getTaskColor(tax, capacity);
}

// ─── Weekly vertical grid ──────────────────────────────────────────────────────

function WeekGrid({
  entries,
  baseCapacity,
  workStart,
  workEnd,
}: {
  entries: [string, DaySchedule][];
  baseCapacity: number;
  workStart: number;
  workEnd: number;
}) {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  // Expand to exactly 7 slots
  const days = entries.slice(0, 7);

  return (
    <div className="flex w-full overflow-x-auto select-none">
      {/* Time axis */}
      <div className="flex flex-col shrink-0 pt-[52px]" style={{ width: 44 }}>
        {WORK_HOURS.map((h) => (
          <div
            key={h}
            className="text-[10px] text-muted-foreground text-right pr-2 font-mono"
            style={{ height: HOUR_HEIGHT }}
          >
            {h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`}
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="flex flex-1 gap-px min-w-0">
        {days.map(([dayKey, dayData]) => {
          const todayCol = isToday(dayKey);
          const { weekday, date } = getDayHeader(dayKey);
          const load = dayData?.total_load ?? 0;
          const tasks = dayData?.tasks ?? [];
          const hourlyLoad = dayData?.hourly_load ?? Array(24).fill(0);
          const loadColor = getLoadColor(load, baseCapacity);

          return (
            <div key={dayKey} className="flex-1 flex flex-col min-w-[110px]">
              {/* Column header */}
              <div
                className={`h-[52px] flex flex-col items-center justify-center rounded-t-xl border border-b-0 ${
                  todayCol
                    ? "bg-primary/15 border-primary/40"
                    : "bg-muted/40 border-border"
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${todayCol ? "text-primary" : "text-muted-foreground"}`}>
                  {weekday}
                  {todayCol && <span className="ml-1 bg-primary text-primary-foreground text-[8px] px-1 rounded">TODAY</span>}
                </span>
                <span className="text-xs font-semibold">{date}</span>
                <span className={`text-[9px] font-mono ${loadColor}`}>{load.toFixed(1)}τ</span>
              </div>

              {/* Time grid body */}
              <div
                className={`relative border rounded-b-xl overflow-hidden ${
                  todayCol ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                }`}
                style={{ height: HOUR_HEIGHT * WORK_HOURS.length }}
              >
                {/* Hour lines */}
                {WORK_HOURS.map((h, i) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-border/40"
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}

                {/* Current time indicator (today only) */}
                {todayCol && currentHour >= WORK_HOURS[0] && currentHour <= WORK_HOURS[WORK_HOURS.length - 1] && (
                  <div
                    className="absolute left-0 right-0 flex items-center z-20"
                    style={{ top: (currentHour - WORK_HOURS[0]) * HOUR_HEIGHT - 1 }}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 ml-1 shrink-0" />
                    <div className="flex-1 h-[1.5px] bg-red-500/70" />
                  </div>
                )}

                {/* Recharts sparkline overlay (bottom of column, translucent) */}
                <div className="absolute bottom-0 left-0 right-0 opacity-30 pointer-events-none" style={{ height: 60 }}>
                  <CognitiveLoadChart
                    hourlyLoad={hourlyLoad}
                    baseCapacity={baseCapacity}
                    workStart={workStart}
                    workEnd={workEnd}
                    height={60}
                  />
                </div>

                {/* Task blocks */}
                {tasks.map((task, i) => {
                  const sh = task.start_hour ?? (workStart + i);
                  const dur = task.duration ?? 1;
                  const topOffset = (sh - WORK_HOURS[0]) * HOUR_HEIGHT;
                  const blockHeight = Math.max(dur * HOUR_HEIGHT - 3, 24);

                  if (topOffset < 0 || topOffset > WORK_HOURS.length * HOUR_HEIGHT) return null;

                  return (
                    <div
                      key={i}
                      className={`absolute left-1 right-1 rounded-lg border text-[10px] leading-tight px-1.5 py-1 overflow-hidden z-10 shadow-sm cursor-default hover:z-30 hover:scale-[1.03] transition-transform ${getTaskBg(task.is_fixed, task.mental_tax, baseCapacity)}`}
                      style={{ top: topOffset, height: blockHeight }}
                      title={`${task.title}${task.location ? ` @ ${task.location}` : ""} — ${task.mental_tax}τ`}
                    >
                      <p className="font-semibold truncate">{task.title}</p>
                      {blockHeight > 35 && (
                        <>
                          {task.location && <p className="opacity-60 truncate">{task.location}</p>}
                          <p className="font-mono opacity-80">+{task.mental_tax?.toFixed(1) ?? "-"}τ</p>
                        </>
                      )}
                      {task.is_fixed && (
                        <span className="absolute top-1 right-1 text-[7px] bg-blue-500/30 text-blue-300 px-1 rounded">GCal</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Monthly list view ─────────────────────────────────────────────────────────

function MonthList({
  entries,
  baseCapacity,
  workStart,
  workEnd,
}: {
  entries: [string, DaySchedule][];
  baseCapacity: number;
  workStart: number;
  workEnd: number;
}) {
  return (
    <div className="space-y-4">
      {entries.map(([dayKey, dayData]) => {
        if (!dayData?.tasks?.length) return null;
        const todayCol = isToday(dayKey);
        const { weekday, date } = getDayHeader(dayKey);
        const load = dayData.total_load ?? 0;
        const hourlyLoad = dayData.hourly_load ?? Array(24).fill(0);

        return (
          <div
            key={dayKey}
            className={`rounded-2xl border p-4 ${todayCol ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground" />
                <h4 className="font-bold text-sm">
                  {weekday}, {date}
                  {todayCol && <span className="ml-2 bg-primary text-primary-foreground text-[9px] px-2 py-0.5 rounded-full">Today</span>}
                </h4>
              </div>
              <span className={`text-sm font-bold ${getLoadColor(load, baseCapacity)}`}>{load.toFixed(1)}τ</span>
            </div>
            <CognitiveLoadChart hourlyLoad={hourlyLoad} baseCapacity={baseCapacity} workStart={workStart} workEnd={workEnd} height={55} />
            <div className="mt-3 flex flex-wrap gap-2">
              {dayData.tasks.map((task, i) => (
                <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border ${getTaskColor(task.mental_tax, baseCapacity)}`}>
                  {task.title} (+{task.mental_tax?.toFixed(1)}τ)
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function CalendarView({
  scheduleData,
  view = "week",
  baseCapacity = 8.0,
  workStart = 7,
  workEnd = 21,
}: CalendarViewProps) {
  if (!scheduleData || Object.keys(scheduleData).length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-dashed border-border rounded-2xl bg-muted/30 transition-colors">
        <Clock className="text-muted-foreground mb-3" size={48} />
        <p className="text-foreground font-medium">Your schedule is clear</p>
        <p className="text-muted-foreground text-sm mt-1">Generate a schedule to see your optimized week</p>
      </div>
    );
  }

  const entries = Object.entries(scheduleData) as [string, DaySchedule][];

  if (view === "week") {
    return <WeekGrid entries={entries} baseCapacity={baseCapacity} workStart={workStart} workEnd={workEnd} />;
  }
  return <MonthList entries={entries} baseCapacity={baseCapacity} workStart={workStart} workEnd={workEnd} />;
}
