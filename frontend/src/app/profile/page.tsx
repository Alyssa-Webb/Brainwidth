"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/auth";
import { Save, Plus, X, Sun, Moon, Sunrise } from "lucide-react";
import LoadMeter from "@/components/LoadMeter";

const CHRONOTYPE_OPTIONS = [
  { value: "morning", label: "Morning Person", icon: "🌅", description: "Peak focus before noon. Ideal for deep work early." },
  { value: "neutral",  label: "Flexible",       icon: "☀️", description: "Energy distributed throughout the day." },
  { value: "evening",  label: "Night Owl",       icon: "🌙", description: "Peak focus in the afternoon and evening." }
];

const SUGGESTED_GOALS = [
  "Finish thesis by April",
  "Avoid back-to-back deep work blocks",
  "Exercise at least 3x a week",
  "Keep daily load under 6 hours",
  "Reserve Friday afternoons for review",
];

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    chronotype: "neutral",
    work_start_hour: 8,
    work_end_hour: 20,
    base_capacity: 8.0,
    goals: [] as string[]
  });
  const [newGoal, setNewGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/auth/me");
        setProfile({
          name: res.data.name ?? "",
          email: res.data.email ?? "",
          chronotype: res.data.chronotype ?? "neutral",
          work_start_hour: res.data.work_start_hour ?? 8,
          work_end_hour: res.data.work_end_hour ?? 20,
          base_capacity: res.data.base_capacity ?? 8.0,
          goals: res.data.goals ?? []
        });
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      await api.patch("/auth/profile", {
        name: profile.name,
        chronotype: profile.chronotype,
        work_start_hour: profile.work_start_hour,
        work_end_hour: profile.work_end_hour,
        base_capacity: profile.base_capacity,
        goals: profile.goals
      });
      setSaveMessage("Profile saved successfully!");
    } catch (e) {
      setSaveMessage("Failed to save. Please try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  const addGoal = () => {
    const g = newGoal.trim();
    if (g && !profile.goals.includes(g)) {
      setProfile(p => ({ ...p, goals: [...p.goals, g] }));
      setNewGoal("");
    }
  };

  const removeGoal = (g: string) => {
    setProfile(p => ({ ...p, goals: p.goals.filter(x => x !== g) }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin text-primary">
          <Sun size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-12">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-[40%] h-[40%] rounded-full bg-primary/15 filter blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[30%] h-[40%] rounded-full bg-purple-500/10 filter blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Your Profile</h1>
          <p className="text-muted-foreground mt-1 text-sm">Customize your cognitive profile for personalized scheduling.</p>
        </div>

        <div className="space-y-6">
          
          {/* Basic Info */}
          <section className="bg-card border border-border rounded-3xl p-6">
            <h2 className="font-bold text-base mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Display Name</label>
                <input
                  value={profile.name}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Email</label>
                <input
                  value={profile.email}
                  disabled
                  className="w-full h-11 rounded-xl border border-border bg-muted px-3 text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
          </section>

          {/* Chronotype */}
          <section className="bg-card border border-border rounded-3xl p-6">
            <h2 className="font-bold text-base mb-1">Chronotype</h2>
            <p className="text-xs text-muted-foreground mb-4">Your natural energy rhythm helps us schedule deep work at the right time.</p>
            <div className="grid grid-cols-3 gap-3">
              {CHRONOTYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setProfile(p => ({ ...p, chronotype: opt.value }))}
                  className={`p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] ${
                    profile.chronotype === opt.value
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                      : "border-border bg-muted/30 hover:border-primary/30"
                  }`}
                >
                  <div className="text-2xl mb-2">{opt.icon}</div>
                  <p className="text-sm font-bold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-tight">{opt.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Base Capacity */}
          <section className="bg-card border border-border rounded-3xl p-6">
            <h2 className="font-bold text-base mb-1">Daily Cognitive Capacity</h2>
            <p className="text-xs text-muted-foreground mb-6">
              The maximum total mental tax (τ) you can sustain per day. This sets your personal overload threshold.
            </p>
            
            <div className="mb-4">
              <LoadMeter currentLoad={0} maxLoad={profile.base_capacity} />
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground w-8">4 τ</span>
              <input
                type="range"
                min={4}
                max={16}
                step={0.5}
                value={profile.base_capacity}
                onChange={e => setProfile(p => ({ ...p, base_capacity: parseFloat(e.target.value) }))}
                className="flex-1 accent-primary cursor-pointer"
              />
              <span className="text-xs text-muted-foreground w-8">16 τ</span>
              <span className="w-16 text-right font-bold text-primary text-sm">{profile.base_capacity} τ</span>
            </div>
          </section>

          {/* Work Hours */}
          <section className="bg-card border border-border rounded-3xl p-6">
            <h2 className="font-bold text-base mb-4">Work Hours</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Start Hour</label>
                <select
                  value={profile.work_start_hour}
                  onChange={e => setProfile(p => ({ ...p, work_start_hour: parseInt(e.target.value) }))}
                  className="w-full h-11 rounded-xl border border-input bg-card text-foreground px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {Array.from({ length: 13 }, (_, i) => i + 5).map(h => (
                    <option key={h} value={h}>{h}:00 {h < 12 ? "AM" : "PM"}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">End Hour</label>
                <select
                  value={profile.work_end_hour}
                  onChange={e => setProfile(p => ({ ...p, work_end_hour: parseInt(e.target.value) }))}
                  className="w-full h-11 rounded-xl border border-input bg-card text-foreground px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {Array.from({ length: 13 }, (_, i) => i + 12).map(h => (
                    <option key={h} value={h}>{h > 12 ? h - 12 : h}:00 {h < 12 ? "AM" : "PM"}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Goals */}
          <section className="bg-card border border-border rounded-3xl p-6">
            <h2 className="font-bold text-base mb-1">Personal Goals</h2>
            <p className="text-xs text-muted-foreground mb-4">Goals guide our AI recommendations. Add anything from academic targets to wellness habits.</p>
            
            {/* Existing goals */}
            <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
              {profile.goals.map(g => (
                <span key={g} className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-xs font-medium">
                  {g}
                  <button onClick={() => removeGoal(g)} className="hover:text-red-400 transition-colors"><X size={10} /></button>
                </span>
              ))}
              {profile.goals.length === 0 && <p className="text-xs text-muted-foreground">No goals yet. Add some below!</p>}
            </div>

            {/* Add custom goal */}
            <div className="flex gap-2 mb-4">
              <input
                value={newGoal}
                onChange={e => setNewGoal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addGoal()}
                placeholder="Type a goal and press Enter..."
                className="flex-1 h-10 rounded-xl border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button 
                onClick={addGoal} 
                className="px-4 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {/* Suggested goals */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_GOALS.filter(g => !profile.goals.includes(g)).slice(0, 5).map(g => (
                  <button
                    key={g}
                    onClick={() => setProfile(p => ({ ...p, goals: [...p.goals, g] }))}
                    className="text-xs px-3 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                  >
                    + {g}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Save */}
          <div className="flex items-center justify-between">
            {saveMessage && (
              <p className={`text-sm font-medium ${saveMessage.includes("success") ? "text-emerald-500" : "text-red-400"}`}>
                {saveMessage}
              </p>
            )}
            <div className="ml-auto">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-6 rounded-2xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-primary/20"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
