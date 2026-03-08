"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import LoadMeter from "@/components/LoadMeter";
import TaskInput from "@/components/TaskInput";
import CalendarView from "@/components/CalendarView";
import { Sparkles, ArrowRight, Bot, Send, BrainCircuit } from "lucide-react";

const MAX_DAILY_LOAD = 10.0;
const API_URL = "http://localhost:8000/api";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<any>({});
  const [currentLoad, setCurrentLoad] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: "Hi Alyssa! I noticed you uploaded your Calculus 3 syllabus. You have a midterm coming up next week. I recommend scheduling 2 hours of high-cognitive review during your peak morning hours. Shall I add that to your pool?" }
  ]);

  // Auto-fetch data
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
      const response = await axios.get(`${API_URL}/optimize`);
      const optimizedWeek = response.data;
      setScheduledTasks(optimizedWeek.schedule);
      setCurrentLoad(optimizedWeek.max_daily_load);
    } catch (error) {
      console.error("Failed to generate schedule", error);
      alert("Failed to generate optimized schedule. Ensure backend is running.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    setChatHistory([...chatHistory, { role: 'user', content: chatMessage }]);
    setChatMessage("");

    // Mock AI response
    setTimeout(() => {
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: "I've added that to your pool! Don't forget, spacing out Deep Work sessions prevents mental burnout. Let me know when you're ready to regenerate your schedule." 
      }]);
      // Mock adding a task from chat
      handleAddTask({ id: Date.now(), title: "Calculus Review", duration: 2, type: "Deep Work" });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">
      
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 mix-blend-multiply filter blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-blue-500/10 mix-blend-multiply filter blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-140px)]">
          
          {/* LEFT COLUMN: Input & AI Chatbot Space */}
          <div className="lg:col-span-4 flex flex-col gap-6 h-full">
            
            {/* Load Meter */}
            <div className="shrink-0 bg-card border border-border rounded-3xl p-6 shadow-sm">
              <LoadMeter currentLoad={currentLoad} maxLoad={MAX_DAILY_LOAD} />
            </div>

            {/* AI Chatbot Area */}
            <div className="flex-1 bg-card border border-border rounded-3xl shadow-sm flex flex-col overflow-hidden min-h-[400px]">
              <div className="bg-secondary/50 p-4 border-b border-border flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                  <Bot size={20} />
                </div>
                <h3 className="font-semibold">Brainwidth AI Assistant</h3>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-muted text-foreground rounded-tl-sm'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-card">
                <div className="relative">
                  <input 
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ask AI to schedule or adjust..."
                    className="w-full bg-muted border border-border rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                  />
                  <button 
                    type="submit"
                    disabled={!chatMessage.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    <Send size={16} className={chatMessage.trim() ? '' : '-ml-0.5'} />
                  </button>
                </div>
              </form>
            </div>
            
          </div>

          {/* RIGHT COLUMN: Scheduler & Pool */}
          <div className="lg:col-span-8 flex flex-col gap-6 h-full">
            
            <div className="shrink-0">
               <TaskInput onAddTask={handleAddTask} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
              
              {/* Unscheduled Pool */}
              <div className="bg-card border border-border rounded-3xl shadow-sm p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg">Unscheduled Tasks</h3>
                  <span className="px-3 py-1 bg-muted rounded-full text-xs font-semibold text-muted-foreground">
                    {tasks.length} items
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar mb-6">
                  {tasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm text-center">
                      <p>Your pool is empty.</p>
                      <p>Add tasks manually or ask the AI to extract them from your syllabus.</p>
                    </div>
                  ) : (
                    tasks.map((t, idx) => (
                      <div key={t.id || idx} className="p-4 bg-muted/50 border border-border rounded-2xl flex justify-between items-center group hover:border-primary/50 transition-colors">
                        <span className="font-medium">{t.title}</span>
                        <span className="text-xs bg-card px-2 py-1 rounded-md border border-border shrink-0">{t.duration}h • {t.type}</span>
                      </div>
                    ))
                  )}
                </div>

                <button 
                  onClick={generateSchedule}
                  disabled={isGenerating || tasks.length === 0}
                  className="w-full shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-primary/20"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="animate-spin" size={18} />
                      Optimizing Cognitive Load...
                    </>
                  ) : (
                    <>
                      Generate AI Schedule
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>

              {/* The Schedule Viewer */}
              <div className="bg-card border border-border rounded-3xl shadow-sm p-6 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <h2 className="font-bold text-lg">Optimized Flow</h2>
                  {scheduledTasks && Object.keys(scheduledTasks).length > 0 && (
                    <span className="text-xs font-bold bg-green-500/20 text-green-600 dark:text-green-400 px-3 py-1 rounded-full border border-green-500/30">
                      Active
                    </span>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <CalendarView scheduleData={scheduledTasks} />
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
