"use client";

import { useState } from "react";
import { PlusCircle, Calendar, MapPin, Flag, Clock } from "lucide-react";
import { api } from "@/lib/auth";

const PRIORITY_OPTIONS = [
  { value: "low",    label: "Low",    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" },
  { value: "medium", label: "Med",    color: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
  { value: "high",   label: "High",   color: "text-red-500 bg-red-500/10 border-red-500/30" },
];

const TYPE_OPTIONS = [
  { value: "STEM",          label: "STEM (High Load)" },
  { value: "Deep Work",     label: "Deep Work (High)" },
  { value: "Creative",      label: "Creative (Med)" },
  { value: "Meeting",       label: "Meeting (Med)" },
  { value: "Admin",         label: "Admin (Low)" },
  { value: "Shallow Work",  label: "Shallow Work (Low)" },
  { value: "Physical",      label: "Physical (Low)" },
];

interface TaskInputProps {
  onAddTask: (task: any) => void;
}

export default function TaskInput({ onAddTask }: TaskInputProps) {
  const [title, setTitle]       = useState("");
  const [duration, setDuration] = useState<number | string>(1);
  const [type, setType]         = useState("STEM");
  const [date, setDate]         = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState("medium");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedDuration = duration ? parseFloat(duration.toString()) : 1;
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/tasks/create", {
        title: title.trim(),
        duration: parsedDuration,
        type,
        date: date || undefined,
        location: location.trim() || undefined,
        priority,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
      });

      onAddTask({
        id: res.data.id,
        title: res.data.title,
        duration: res.data.duration,
        type: res.data.type,
        mental_tax: res.data.mental_tax,
        date: res.data.date,
        location: res.data.location,
        priority: res.data.priority,
        gcal_event: res.data.gcal_event,
      });

      // Reset
      setTitle("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setLocation("");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to save task. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const priorityOpt = PRIORITY_OPTIONS.find(p => p.value === priority) ?? PRIORITY_OPTIONS[1];

  return (
    <div className="bg-card border border-border p-6 rounded-3xl w-full shadow-sm">
      <h2 className="text-lg font-bold mb-5">Add New Task</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Task Name *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Finish Problem Set 4"
            className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            required
          />
        </div>

        {/* Duration + Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
              <Clock className="inline w-3 h-3 mr-1" />Duration (hrs)
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Task Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none"
            >
              {TYPE_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
              <Calendar className="inline w-3 h-3 mr-1" />Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
              <Flag className="inline w-3 h-3 mr-1" />Priority
            </label>
            <div className="flex gap-2 h-10 items-center">
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`flex-1 h-full rounded-xl border text-xs font-bold transition-all ${
                    priority === opt.value ? opt.color : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Optional Time Window */}
        <div className="grid grid-cols-2 gap-3 pb-2">
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Start Time <span className="font-normal opacity-70">(opt)</span></label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">End Time <span className="font-normal opacity-70">(opt)</span></label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
        </div>

        {/* Location (optional) */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
            <MapPin className="inline w-3 h-3 mr-1" />Location <span className="normal-case font-normal text-muted-foreground/70">(optional)</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Library Room 3"
            className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="w-full mt-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 disabled:opacity-60"
        >
          {loading ? (
            <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
          ) : (
            <PlusCircle size={18} />
          )}
          {loading ? "Saving…" : "Add to Flux + Calendar"}
        </button>

        {/* Priority badge preview */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${priorityOpt.color}`}>
            {priorityOpt.label} priority
          </span>
          <span>· Will appear on your dashboard calendar</span>
        </div>
      </form>
    </div>
  );
}
