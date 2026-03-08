"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/auth";
import TaskInput from "@/components/TaskInput";
import { Bot, Send, Calendar, MapPin, Flag, ExternalLink, ArrowLeft } from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/10 text-red-400 border-red-500/30",
  medium: "bg-orange-400/10 text-orange-400 border-orange-400/30",
  low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [gcalEvents, setGcalEvents] = useState<any[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: "assistant", content: "Hi! I'm your Brainwidth AI. I can help brainstorm tasks or analyze PDFs if you upload them in the Upload tab." }
  ]);
  const [activeTab, setActiveTab] = useState<"flux" | "gcal">("gcal");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tasksRes, gcalRes] = await Promise.all([
          api.get("/tasks"),
          api.get("/gcal/events"),
        ]);
        if (tasksRes.data?.length) setTasks(tasksRes.data);
        if (gcalRes.data?.events) setGcalEvents(gcalRes.data.events);
      } catch (error) {
        console.error("Failed to fetch tasks / gcal events", error);
      }
    };
    fetchAll();
  }, []);

  const handleAddTask = (newTask: any) => {
    setTasks(prev => [...prev, newTask]);
    // If the task has a gcal_event, add it to the gcal section too
    if (newTask.gcal_event) {
      setGcalEvents(prev => [...prev, { ...newTask.gcal_event, source: "Flux Task" }]);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setChatHistory([...chatHistory, { role: "user", content: chatMessage }]);
    setChatMessage("");
    setTimeout(() => {
      setChatHistory(prev => [...prev, {
        role: "assistant",
        content: "I've noted that! Try adding the task using the form on the right — you can set a date and priority, and it'll appear on your dashboard calendar automatically."
      }]);
    }, 900);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch { return null; }
  };

  const getTaxColor = (tax: number) => {
    if (tax > 1.5) return "text-red-400";
    if (tax > 0.8) return "text-orange-400";
    return "text-emerald-500";
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 pt-24 pb-12 bg-[#fffde7] dark:bg-background transition-colors duration-300 relative font-sans">
      <style>{`
        /* Overrides Next.js body background. By setting this to the navbar color, the top overscroll matches the navbar! */
        html, body { background-color: #fff9c4 !important; }
        html.dark, html.dark body { background-color: #000000 !important; }
      `}</style>

      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-50 dark:opacity-100">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/15 mix-blend-multiply filter blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-blue-500/8 mix-blend-multiply filter blur-[120px]" />
      </div>

      <div className="w-full max-w-6xl bg-card text-card-foreground rounded-3xl border border-border shadow-xl p-6 sm:p-8 z-10 relative">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">Task Management</h1>
        <p className="text-muted-foreground text-sm mb-8">Add tasks below — they'll appear on your dashboard calendar automatically.</p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: AI Chat */}
          <div className="lg:col-span-4 flex flex-col gap-4 min-h-[500px]">
            <div className="flex-1 bg-card border border-border rounded-3xl shadow-sm flex flex-col overflow-hidden">
              <div className="bg-secondary/50 p-4 border-b border-border flex items-center gap-3 shrink-0">
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                  <Bot size={20} />
                </div>
                <h3 className="font-semibold">Brainwidth AI</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                      }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-card shrink-0">
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
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT: Input + Task/GCal Pool */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="shrink-0">
              <TaskInput onAddTask={handleAddTask} />
            </div>

            {/* Tab: Flux Tasks vs Google Calendar */}
            <div className="bg-card border border-border rounded-3xl shadow-sm flex flex-col">
              <div className="flex border-b border-border shrink-0">
                <button
                  onClick={() => setActiveTab("gcal")}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === "gcal" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Calendar size={14} /> Google Calendar ({gcalEvents.length})
                </button>
                <button
                  onClick={() => setActiveTab("flux")}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === "flux" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Flag size={14} /> Flux Tasks ({tasks.length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {/* GCAL tab */}
                {activeTab === "gcal" && (
                  gcalEvents.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center">
                      <p>No calendar events found. Connect your Google Calendar to see events here.</p>
                    </div>
                  ) : (
                    gcalEvents.map((ev, i) => (
                      <div key={ev.id || i} className="p-3.5 bg-muted/40 border border-border rounded-2xl hover:border-blue-500/40 transition-colors">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm truncate">{ev.title}</p>
                              {ev.is_fixed !== false && (
                                <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 rounded shrink-0">GCal</span>
                              )}
                              {ev.source === "Flux Task" && (
                                <span className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-1.5 rounded shrink-0">New</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              {ev.date && <span className="flex items-center gap-1"><Calendar size={10} />{formatDate(ev.date)}</span>}
                              {ev.location && <span className="flex items-center gap-1"><MapPin size={10} />{ev.location}</span>}
                              <span>{ev.duration}h · {ev.type}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-xs font-bold font-mono ${getTaxColor(ev.mental_tax ?? 0)}`}>
                              +{(ev.mental_tax ?? 0).toFixed(2)}τ
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                )}

                {/* Flux Tasks tab */}
                {activeTab === "flux" && (
                  tasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm text-center">
                      <p>Your Flux pool is empty.</p>
                      <p className="mt-1">Add tasks using the form above.</p>
                    </div>
                  ) : (
                    tasks.map((t, idx) => (
                      <div key={t.id || idx} className="p-3.5 bg-muted/40 border border-border rounded-2xl hover:border-primary/40 transition-colors">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm truncate">{t.title}</p>
                              {t.priority && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.medium}`}>
                                  {t.priority}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              {t.date && <span className="flex items-center gap-1"><Calendar size={10} />{formatDate(t.date)}</span>}
                              {t.location && <span className="flex items-center gap-1"><MapPin size={10} />{t.location}</span>}
                              <span>{t.duration}h · {t.type}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-xs font-bold font-mono ${getTaxColor(t.mental_tax ?? t.cognitive_weight ?? 0)}`}>
                              +{(t.mental_tax ?? t.cognitive_weight ?? 0).toFixed(2)}τ
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
