"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";

export default function TaskInput({ onAddTask }: { onAddTask: (task: any) => void }) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<number | string>(1);
  const [type, setType] = useState("STEM");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    // Default to 1 if duration is cleared
    const parsedDuration = duration ? parseFloat(duration.toString()) : 1;
    
    onAddTask({
      id: crypto.randomUUID(),
      title,
      duration: parsedDuration,
      type
    });
    
    setTitle("");
    // Keep duration/type same for rapid entry
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl w-full">
      <h2 className="text-xl font-bold text-white mb-4">Add Task</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Task Name</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Write Python Script" 
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Duration (hrs)</label>
            <input 
              type="number" 
              step="0.5"
              min="0.5"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Type</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
            >
              <option value="STEM">STEM (High Load)</option>
              <option value="Deep Work">Deep Work (High Load)</option>
              <option value="Creative">Creative (Med Load)</option>
              <option value="Meeting">Meeting (Med Load)</option>
              <option value="Admin">Admin (Low Load)</option>
              <option value="Shallow Work">Shallow Work (Low Load)</option>
            </select>
          </div>
        </div>

        <button 
          type="submit"
          className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25"
        >
          <PlusCircle size={20} />
          <span>Add to Flux</span>
        </button>
      </form>
    </div>
  );
}
