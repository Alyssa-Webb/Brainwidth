"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/auth";
import LoadMeter from "@/components/LoadMeter";
import CalendarView from "@/components/CalendarView";
import RecommendationsPanel from "@/components/RecommendationsPanel";
import { Sparkles, ArrowRight, BedDouble, Calendar, CalendarDays, User } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [scheduledTasks, setScheduledTasks] = useState<any>({});
  const [currentLoad, setCurrentLoad] = useState(0);
  const [todayLoad, setTodayLoad] = useState(0);
  const [baseCapacity, setBaseCapacity] = useState(8.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [decompressMode, setDecompressMode] = useState(false);
  const [view, setView] = useState<"week" | "month">("week");
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [chronotype, setChronotype] = useState("neutral");
  const [workStart, setWorkStart] = useState(7);
  const [workEnd, setWorkEnd] = useState(21);
  const [userName, setUserName] = useState("there");

  // Load user profile for capacity/chronotype, then auto-generate schedule
  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await api.get("/auth/me");
        const profile = profileRes.data;
        setBaseCapacity(profile.base_capacity ?? 8.0);
        setChronotype(profile.chronotype ?? "neutral");
        setWorkStart(profile.work_start_hour ?? 8);
        setWorkEnd(profile.work_end_hour ?? 20);
        setUserName(profile.name?.split(" ")[0] ?? "there");
      } catch {
        // Use defaults if not logged in
      }
      await generateSchedule(false);
      await loadRecommendations();
    };
    init();
  }, []);

  const generateSchedule = async (decompress: boolean = false) => {
    setIsGenerating(true);
    setDecompressMode(decompress);
    try {
      const response = await api.get(`/optimize?decompress=${decompress}`);
      const data = response.data;
      setScheduledTasks(data.schedule);
      setCurrentLoad(data.max_daily_load);
      if (data.base_capacity) setBaseCapacity(data.base_capacity);
      // Extract today's load from Day 0
      const todayKey = Object.keys(data.schedule ?? {})[0];
      if (todayKey && data.schedule[todayKey]) {
        setTodayLoad(data.schedule[todayKey].total_load ?? 0);
      }
    } catch (error) {
      console.error("Failed to generate schedule", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const res = await api.get("/recommendations");
      setRecommendations(res.data.recommendations ?? []);
      if (res.data.chronotype) setChronotype(res.data.chronotype);
      if (res.data.base_capacity) setBaseCapacity(res.data.base_capacity);
    } catch {
      // fail silently
    }
  };

  const handleDecompress = async () => {
    await generateSchedule(true);
    await loadRecommendations();
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/15 mix-blend-multiply filter blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-blue-500/8 mix-blend-multiply filter blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 py-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Good {getTimeOfDay()}, {userName} 👋</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Here's your cognitive schedule for the week.</p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
              <button
                onClick={() => setView("week")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "week" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Calendar size={12} /> Week
              </button>
              <button
                onClick={() => setView("month")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "month" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <CalendarDays size={12} /> Month
              </button>
            </div>

            {/* Decompression Mode */}
            <button
              onClick={handleDecompress}
              disabled={isGenerating}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                decompressMode
                  ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
              } disabled:opacity-50`}
            >
              <BedDouble size={14} />
              Decompression
            </button>

            {/* Optimize Button */}
            <button
              onClick={() => generateSchedule(false)}
              disabled={isGenerating}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-xl text-xs transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {isGenerating ? (
                <><Sparkles className="animate-spin" size={14} /> Optimizing...</>
              ) : (
                <><ArrowRight size={14} /> Re-Optimize</>
              )}
            </button>

            {/* Profile Link */}
            <Link
              href="/profile"
              className="flex items-center gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-2 rounded-xl text-xs font-medium transition-all border border-border"
            >
              <User size={12} /> Profile
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR */}
          <div className="xl:col-span-3 flex flex-col gap-4">
            {/* Today's Mental Tax Card */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <div className="mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today's Mental Tax</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </p>
              </div>
              <LoadMeter currentLoad={todayLoad} maxLoad={baseCapacity} />
              <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
                <span>Week peak</span>
                <span className="font-mono font-semibold text-foreground">{currentLoad.toFixed(1)}τ</span>
              </div>
            </div>


            {/* Decompression indicator */}
            {decompressMode && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BedDouble size={14} className="text-blue-400" />
                  <p className="text-xs font-bold text-blue-400">Decompression Active</p>
                </div>
                <p className="text-xs text-muted-foreground">Your schedule has been rebalanced with recovery breaks inserted between heavy tasks.</p>
              </div>
            )}

            {/* Recommendations */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm flex-1">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                AI Insights
              </h3>
              <RecommendationsPanel
                recommendations={recommendations}
                chronotype={chronotype}
                baseCapacity={baseCapacity}
              />
            </div>
          </div>

          {/* MAIN CALENDAR */}
          <div className="xl:col-span-9 bg-card border border-border rounded-3xl shadow-sm p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="font-bold text-base">
                {view === "week" ? "7-Day Optimized Flow" : "Monthly Overview"}
              </h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>Low load</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"/>Medium</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>High load</span>
                {scheduledTasks && Object.keys(scheduledTasks).length > 0 && (
                  <span className="font-bold bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full border border-green-500/30">Active</span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <CalendarView
                scheduleData={scheduledTasks}
                view={view}
                baseCapacity={baseCapacity}
                workStart={workStart}
                workEnd={workEnd}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
