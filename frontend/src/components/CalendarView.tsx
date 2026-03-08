"use client";

import { useState, useEffect } from "react";
import { Clock, Calendar, X } from "lucide-react";
import CognitiveLoadChart from "@/components/CognitiveLoadChart";

interface TaskItem {
  id?: string;
  source: string;
  title: string;
  mental_tax: number;
  is_fixed: boolean;
  start_hour?: number;
  location?: string;
  priority?: string;
  duration?: number;
  is_break?: boolean;
  is_weight?: boolean;
  is_all_day?: boolean;
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
  onDeleteTask?: (taskId: string, source: string) => void;
}

const HOUR_HEIGHT = 56;
const WORK_HOURS = Array.from({ length: 24 }, (_, i) => i);

function getDateFromKey(dayKey: string): Date | null {
  const match = dayKey.match(/\((.+)\)/);
  if (!match) return null;
  return new Date(match[1] + "T12:00:00");
}

function isToday(dayKey: string): boolean {
  const d = getDateFromKey(dayKey);
  if (!d) return false;
  return d.toDateString() === new Date().toDateString();
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

function getTaskBg(
  isFixed: boolean,
  tax: number,
  capacity: number,
  isBreak: boolean = false,
  source: string = ""
): string {
  if (isBreak) return "bg-emerald-500/20 border-emerald-500/40 text-emerald-500";
  if (source === "Syllabus") return "bg-purple-500/15 border-purple-500/30 text-foreground";
  if (isFixed) return "bg-blue-500/15 border-blue-500/30 text-foreground";
  return getTaskColor(tax, capacity);
}

/**
 * Resolves overlapping tasks in a day into non-overlapping columns.
 * Returns each task annotated with { col, totalCols } for side-by-side rendering.
 */
function resolveOverlaps(
  tasks: (TaskItem & { resolvedStartHour: number })[],
): (TaskItem & { resolvedStartHour: number; col: number; totalCols: number })[] {
  // Sort by start time
  const sorted = [...tasks].map((t, originalIndex) => ({ ...t, originalIndex }))
    .sort((a, b) => a.resolvedStartHour - b.resolvedStartHour);

  const columns: number[][] = []; // each column holds end-hours of tasks in it

  const result = sorted.map((task) => {
    const taskEnd = task.resolvedStartHour + (task.duration ?? 1);
    // Find first column where this task doesn't overlap the last task
    let col = columns.findIndex((colEndHours) => {
      const lastEnd = Math.max(...colEndHours);
      return task.resolvedStartHour >= lastEnd;
    });
    if (col === -1) {
      col = columns.length;
      columns.push([]);
    }
    columns[col].push(taskEnd);
    return { ...task, col };
  });

  // Now compute totalCols for each task: how many columns overlap its time range
  return result.map((task) => {
    const taskEnd = task.resolvedStartHour + (task.duration ?? 1);
    const overlappingCols = new Set<number>();
    result.forEach((other) => {
      const otherEnd = other.resolvedStartHour + (other.duration ?? 1);
      const overlapStart = Math.max(task.resolvedStartHour, other.resolvedStartHour);
      const overlapEnd = Math.min(taskEnd, otherEnd);
      if (overlapEnd > overlapStart) {
        overlappingCols.add(other.col);
      }
    });
    return { ...task, totalCols: overlappingCols.size };
  });
}

// ─── Weekly vertical grid ──────────────────────────────────────────────────────

function WeekGrid({
  entries,
  baseCapacity,
  workStart,
  workEnd,
  onDeleteTask,
}: {
  entries: [string, DaySchedule][];
  baseCapacity: number;
  workStart: number;
  workEnd: number;
  onDeleteTask?: (taskId: string, source: string) => void;
}) {
  const [currentHour, setCurrentHour] = useState(() => {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentHour(now.getHours() + now.getMinutes() / 60);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

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
            {h === 0 ? "12a" : h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`}
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

          // Separate all-day tasks from timed tasks
          const allDayTasks = tasks.filter(t => t.is_all_day);
          const timedTasks = tasks.filter(t => !t.is_all_day);

          const tasksWithHours = timedTasks.map((task) => ({
            ...task,
            resolvedStartHour:
              typeof task.start_hour === "number" && isFinite(task.start_hour)
                ? task.start_hour
                : workStart,
          }));

          // Compute non-overlapping column layout for timed tasks only
          const layoutTasks = resolveOverlaps(tasksWithHours);

          return (
            <div key={dayKey} className="flex-1 flex flex-col min-w-[110px]">
              {/* Column header */}
              <div
                className={`h-[52px] flex flex-col items-center justify-center rounded-t-xl border border-b-0 ${todayCol
                  ? "bg-primary/15 border-primary/40"
                  : "bg-muted/40 border-border"
                  }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${todayCol ? "text-primary" : "text-muted-foreground"
                    }`}
                >
                  {weekday}
                  {todayCol && (
                    <span className="ml-1 bg-primary text-primary-foreground text-[8px] px-1 rounded">
                      TODAY
                    </span>
                  )}
                </span>
                <span className="text-xs font-semibold">{date}</span>
                <span className={`text-[9px] font-mono ${loadColor}`}>
                  {load.toFixed(2)}τ
                </span>
              </div>

              {/* All-day weights section */}
              {allDayTasks.length > 0 && (
                <div className="flex flex-col gap-1 p-1 bg-muted/20 border-x border-border min-h-[24px]">
                  {allDayTasks.map((task) => (
                    <div
                      key={task.id || task.title}
                      className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-black truncate transition-transform hover:scale-[1.03] cursor-default shadow-sm"
                      title={`${task.title} — +${task.mental_tax.toFixed(2)}τ`}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              )}

              {/* Time grid body */}
              <div
                className={`relative border rounded-b-xl overflow-hidden ${todayCol
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card"
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
                {todayCol &&
                  currentHour >= WORK_HOURS[0] &&
                  currentHour <= WORK_HOURS[WORK_HOURS.length - 1] && (
                    <div
                      className="absolute left-0 right-0 flex items-center z-40 pointer-events-none"
                      style={{
                        top: (currentHour - WORK_HOURS[0]) * HOUR_HEIGHT - 1,
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 ml-1 shrink-0" />
                      <div className="flex-1 h-[1.5px] bg-red-500/70" />
                    </div>
                  )}

                {/* Recharts sparkline overlay */}
                <div
                  className="absolute bottom-0 left-0 right-0 opacity-30 pointer-events-none"
                  style={{ height: 60 }}
                >
                  <CognitiveLoadChart
                    hourlyLoad={hourlyLoad}
                    baseCapacity={baseCapacity}
                    workStart={workStart}
                    workEnd={workEnd}
                    height={60}
                  />
                </div>

                {/* Task blocks — keyed by stable unique key, not array index */}
                {layoutTasks.map((task) => {
                  const sh = task.resolvedStartHour;
                  const dur = task.duration ?? 1;
                  const topOffset = (sh - WORK_HOURS[0]) * HOUR_HEIGHT;
                  const blockHeight = Math.max(dur * HOUR_HEIGHT - 3, 24);

                  // Skip tasks that fall entirely outside the visible grid
                  if (
                    topOffset < 0 ||
                    topOffset > WORK_HOURS.length * HOUR_HEIGHT
                  )
                    return null;

                  // Side-by-side columns for genuinely overlapping tasks
                  const colWidth = 100 / task.totalCols;
                  const leftPct = task.col * colWidth;

                  // Stable key: prefer task id, fall back to deterministic composite
                  const stableKey =
                    task.id ??
                    `${task.source}-${task.title}-${sh}-${task.col}`;

                  return (
                    <div
                      key={stableKey}
                      className={`group absolute rounded-lg border text-[10px] leading-tight px-1.5 py-1 overflow-hidden z-10 shadow-sm cursor-default hover:z-30 hover:scale-[1.03] transition-transform ${getTaskBg(
                        task.is_fixed,
                        task.mental_tax,
                        baseCapacity,
                        task.is_break,
                        task.source
                      )}`}
                      style={{
                        top: topOffset,
                        height: blockHeight,
                        left: `calc(${leftPct}% + 4px)`,
                        width: `calc(${colWidth}% - 8px)`,
                      }}
                      title={
                        (task.is_weight
                          ? "Cognitive Weight represents the passive mental load of your course commitments (assignments, prep, etc.) throughout the week.\n\n"
                          : "") +
                        `${task.title}${task.location ? ` @ ${task.location}` : ""} — Load: ${task.is_break ? "-" : "+"}${task.mental_tax.toFixed(2)}τ`
                      }
                    >
                      <p className="font-semibold line-clamp-2">{task.title}</p>
                      {blockHeight > 35 && (
                        <>
                          {task.location && (
                            <p className="opacity-60 truncate">{task.location}</p>
                          )}
                          <p className="font-mono opacity-80">
                            {task.is_break ? "-" : "+"}
                            {task.mental_tax?.toFixed(2) ?? "-"}τ
                          </p>
                        </>
                      )}

                      {/* Source badges — mutually exclusive, top-right */}
                      {task.is_fixed && !task.is_break && task.source === "Google Calendar" && (
                        <span className="absolute top-1 right-1 text-[7px] bg-blue-500/30 text-blue-300 px-1 rounded">
                          GCal
                        </span>
                      )}
                      {task.is_fixed && !task.is_break && task.source === "Default Calendar" && (
                        <span className="absolute top-1 right-1 text-[7px] bg-gray-500/30 text-gray-300 px-1 rounded">
                          Default
                        </span>
                      )}
                      {task.is_weight && (
                        <span className="absolute top-1 right-1 text-[7px] bg-purple-500/30 text-purple-300 px-1 rounded">
                          Weight
                        </span>
                      )}
                      {task.is_break && task.title.startsWith("🌟 Goal:") && (
                        <span className="absolute top-1 right-1 text-[7px] bg-yellow-500/30 text-yellow-600 px-1 rounded font-bold">
                          Goal
                        </span>
                      )}
                      {task.is_break && !task.title.startsWith("🌟 Goal:") && (
                        <span className="absolute top-1 right-1 text-[7px] bg-emerald-500/30 text-emerald-500 px-1 rounded">
                          Break
                        </span>
                      )}

                      {/* Delete button — only shown on hover when task has an id */}
                      {onDeleteTask && task.id && !task.is_break && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove "${task.title}"?`)) {
                              onDeleteTask(task.id!, task.source);
                            }
                          }}
                          className="absolute top-1 right-1 p-0.5 rounded-md hover:bg-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
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
  onDeleteTask,
}: {
  entries: [string, DaySchedule][];
  baseCapacity: number;
  workStart: number;
  workEnd: number;
  onDeleteTask?: (taskId: string, source: string) => void;
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
            className={`rounded-2xl border p-4 ${todayCol
              ? "border-primary/50 bg-primary/5"
              : "border-border bg-card"
              }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground" />
                <h4 className="font-bold text-sm">
                  {weekday}, {date}
                  {todayCol && (
                    <span className="ml-2 bg-primary text-primary-foreground text-[9px] px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </h4>
              </div>
              <span className={`text-sm font-bold ${getLoadColor(load, baseCapacity)}`}>
                {load.toFixed(2)}τ
              </span>
            </div>
            <CognitiveLoadChart
              hourlyLoad={hourlyLoad}
              baseCapacity={baseCapacity}
              workStart={workStart}
              workEnd={workEnd}
              height={55}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {dayData.tasks.map((task, i) => {
                const stableKey = task.id ?? `${task.source}-${task.title}-${i}`;
                return (
                  <span
                    key={stableKey}
                    className={`group flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${getTaskBg(
                      task.is_fixed,
                      task.mental_tax,
                      baseCapacity,
                      task.is_break,
                      task.source
                    )}`}
                  >
                    {task.title} ({task.is_break ? "-" : "+"}
                    {task.mental_tax?.toFixed(2)}τ)
                    {onDeleteTask && task.id && !task.is_break && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask(task.id!, task.source);
                        }}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X size={8} />
                      </button>
                    )}
                  </span>
                );
              })}
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
  onDeleteTask,
}: CalendarViewProps) {
  if (!scheduleData || Object.keys(scheduleData).length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-dashed border-border rounded-2xl bg-muted/30 transition-colors">
        <Clock className="text-muted-foreground mb-3" size={48} />
        <p className="text-foreground font-medium">Your schedule is clear</p>
        <p className="text-muted-foreground text-sm mt-1">
          Generate a schedule to see your optimized week
        </p>
      </div>
    );
  }

  const entries = Object.entries(scheduleData) as [string, DaySchedule][];

  if (view === "week") {
    return (
      <WeekGrid
        entries={entries}
        baseCapacity={baseCapacity}
        workStart={workStart}
        workEnd={workEnd}
        onDeleteTask={onDeleteTask}
      />
    );
  }
  return (
    <MonthList
      entries={entries}
      baseCapacity={baseCapacity}
      workStart={workStart}
      workEnd={workEnd}
      onDeleteTask={onDeleteTask}
    />
  );
}