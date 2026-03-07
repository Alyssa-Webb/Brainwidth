"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import TaskInput from "@/components/TaskInput";
import LoadMeter from "@/components/LoadMeter";
import CalendarView from "@/components/CalendarView";
import { Sparkles, ArrowRight, Database } from "lucide-react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

const MAX_DAILY_LOAD = 10.0;
const API_URL = "http://localhost:8000/api";

export default function Home() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<any[]>([]);
  const [currentLoad, setCurrentLoad] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-fetch data without showing a scary DB Sync button
  useEffect(() => {
    const fetchSeededTasks = async () => {
      try {
        const response = await axios.get(`${API_URL}/tasks`);
        if (response.data && response.data.length > 0) {
          setTasks(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch tasks automatically", error);
      }
    };
    
    fetchSeededTasks();
  }, []);

  const handleAddTask = (newTask: any) => {
    setTasks([...tasks, newTask]);
  };

  const generateSchedule = async () => {
    setIsGenerating(true);
    try {
      const response = await axios.post(`${API_URL}/calculate-tax`, tasks);
      
      const processedTasks = response.data;
      setScheduledTasks(processedTasks);
      
      const totalTax = processedTasks.reduce((sum: number, t: any) => sum + t.mental_tax, 0);
      setCurrentLoad(totalTax);
    } catch (error) {
      console.error("Failed to generate schedule", error);
      alert("Attempted to reach backend. Make sure FastAPI is running on port 8000.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white transition-colors duration-300 font-sans">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-300/30 dark:bg-blue-900/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-indigo-300/30 dark:bg-indigo-900/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-3 text-gray-900 dark:text-white">
              Flux <Sparkles className="text-blue-500 dark:text-blue-400" />
            </h1>
            <p className="text-gray-600 dark:text-white/60 mt-1 max-w-md text-sm">
              Optimize your day based on cognitive load, not just time.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <LoadMeter currentLoad={currentLoad} maxLoad={MAX_DAILY_LOAD} />
            <TaskInput onAddTask={handleAddTask} />
            
            {tasks.length > 0 && (
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl w-full shadow-lg dark:shadow-xl transition-colors">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Unscheduled Pool</h3>
                  <span className="text-xs bg-gray-100 dark:bg-white/10 px-2 py-1 rounded text-gray-600 dark:text-white/70">{tasks.length} items</span>
                </div>
                <div className="space-y-2 mb-5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {tasks.map((t, idx) => (
                    <div key={t.id || idx} className="text-sm bg-gray-50 dark:bg-black/20 p-3 rounded-lg border border-gray-100 dark:border-white/5 flex justify-between items-center transition-colors">
                      <span className="text-gray-800 dark:text-white/80 font-medium truncate pr-2">{t.title}</span>
                      <span className="text-gray-500 dark:text-white/40 text-xs shrink-0 bg-gray-200 dark:bg-white/5 px-2 py-1 rounded">{t.duration}h • {t.type}</span>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={generateSchedule}
                  disabled={isGenerating}
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_20px_rgba(59,130,246,0.3)] dark:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                >
                  {isGenerating ? "Optimizing..." : "Generate AI Schedule"}
                  {!isGenerating && <ArrowRight size={18} />}
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 md:p-8 rounded-3xl min-h-[600px] shadow-lg dark:shadow-xl transition-colors">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Optimized Flow</h2>
                {scheduledTasks.length > 0 && (
                  <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-100 dark:bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-400/20">
                    Active
                  </span>
                )}
              </div>
              
              <CalendarView tasks={scheduledTasks} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
