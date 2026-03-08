"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle, BookOpen, Trash2, Zap, BedDouble, RefreshCw } from "lucide-react";

const GUIDE_ITEMS = [
  {
    icon: <HelpCircle className="w-4 h-4 text-blue-400" />,
    title: "Why take the Quiz?",
    content: "Your 'Chronotype' identifies when your brain is naturally most alert. Taking the quiz in your profile settings allows the AI to schedule heavy STEM and Deep Work tasks during your peak performance windows, reducing burnout and mistakes."
  },
  {
    icon: <Trash2 className="w-4 h-4 text-red-400" />,
    title: "Deleting a Task",
    content: "Hover over any task in the calendar view and click the 'X' in the top-right corner to remove it. Note: Only tasks created via the 'Add New Task' form can be deleted; GCal events are read-only."
  },
  {
    icon: <BedDouble className="w-4 h-4 text-emerald-400" />,
    title: "Decompression Mode",
    content: "Activating 'Decompression' instructs the AI to insert mandatory micro-breaks and recovery blocks (like 'Scheduled Rest') after high-intensity tasks to prevent your academic load from snowballing."
  },
  {
    icon: <RefreshCw className="w-4 h-4 text-orange-400" />,
    title: "Re-Optimizing",
    content: "Click 'Re-Optimize' whenever you add a new task or your plans change. The AI will reshuffle your flexible tasks to maintain a balanced weekly load while respecting your fixed commitments."
  },
  {
    icon: <BookOpen className="w-4 h-4 text-purple-400" />,
    title: "Uploading Syllabi",
    content: "Go to the Syllabi page to upload your course PDFs. The AI will extract all dates and complexity, automatically adding 'Cognitive Weight' blocks to your calendar to represent the passive background study load for each class."
  }
];

export default function SchedulerGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm shadow-primary/5 transition-all">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-secondary-foreground" />
          <h3 className="font-bold text-sm">Scheduler Guide</h3>
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
          <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
            Welcome to Brainwidth! Here's how to master your cognitive load.
          </p>
          
          {GUIDE_ITEMS.map((item, idx) => (
            <div key={idx} className="border border-border/50 rounded-2xl overflow-hidden bg-muted/20">
              <button 
                onClick={() => setExpandedItem(expandedItem === idx ? null : idx)}
                className="w-full flex items-center gap-2.5 p-3 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="shrink-0">{item.icon}</div>
                <span className="text-[11px] font-bold text-foreground flex-1">{item.title}</span>
                {expandedItem === idx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              
              {expandedItem === idx && (
                <div className="px-3 pb-3 pt-1">
                  <p className="text-[10px] text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                    {item.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
