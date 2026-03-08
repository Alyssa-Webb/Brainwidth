"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/auth";
import { Save, Plus, X, Sun, FileText, CheckCircle, CalendarCheck, Loader2, RefreshCw, Book, Brain, Trash2 } from "lucide-react";
import LoadMeter from "@/components/LoadMeter";

const CHRONOTYPE_OPTIONS = [
  { value: "lion", label: "Lion", icon: "🦁", description: "Peak focus early morning. Best for tackling hard tasks first." },
  { value: "bear", label: "Bear", icon: "🐻", description: "Energy follows the sun. Peak focus mid-morning to early afternoon." },
  { value: "wolf", label: "Wolf", icon: "🐺", description: "Peak focus late afternoon and evening. Slow mornings." },
  { value: "night_owl", label: "Night Owl", icon: "🦉", description: "Peak focus late evening and night." },
  { value: "dolphin", label: "Dolphin", icon: "🐬", description: "Light sleepers. Short bursts of high energy." }
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
  const [syllabi, setSyllabi] = useState<any[]>([]);
  const [gcalStatus, setGcalStatus] = useState<"unknown" | "connected" | "disconnected">("unknown");
  const [gcalConnecting, setGcalConnecting] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profileRes, syllabiRes] = await Promise.all([
          api.get("/auth/me"),
          api.get("/syllabi").catch(() => ({ data: { syllabi: [] } })),
        ]);
        setProfile({
          name: profileRes.data.name ?? "",
          email: profileRes.data.email ?? "",
          chronotype: profileRes.data.chronotype ?? "neutral",
          work_start_hour: profileRes.data.work_start_hour ?? 8,
          work_end_hour: profileRes.data.work_end_hour ?? 20,
          base_capacity: profileRes.data.base_capacity ?? 8.0,
          goals: profileRes.data.goals ?? []
        });
        setSyllabi(syllabiRes.data.syllabi ?? []);
        // Check GCal connection status
        api.get("/auth/gcal/status")
          .then(r => setGcalStatus(r.data.connected ? "connected" : "disconnected"))
          .catch(() => setGcalStatus("disconnected"));
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setLoading(false);
      }
    };

    // Check if we just came back from Google OAuth via full-page redirect
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("gcal") === "connected") {
        setGcalStatus("connected");
        // Clean up URL without refreshing the page
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    loadProfile();
  }, []);

  const handleConnectGCal = async () => {
    setGcalConnecting(true);
    try {
      const res = await api.get("/auth/gcal/authorize");
      const authUrl = res.data.auth_url;
      // Direct redirect instead of popup to avoid connection refused/blocked issues
      window.location.href = authUrl;
    } catch (e) {
      console.error("Failed to get GCal auth URL", e);
      setGcalConnecting(false);
    }
  };


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

  const handleSyncSyllabus = async (syllabusId: string) => {
    setSyncingId(syllabusId);
    try {
      await api.post(`/sync-syllabus/${syllabusId}`);
      // Refresh the page data after a sync
      const syllabiRes = await api.get("/syllabi").catch(() => ({ data: { syllabi: [] } }));
      setSyllabi(syllabiRes.data.syllabi ?? []);
    } catch (error) {
      console.error("Failed to sync syllabus", error);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteSyllabus = async (syllabusId: string) => {
    setDeletingId(syllabusId);
    try {
      await api.delete(`/syllabi/${syllabusId}`);
      const syllabiRes = await api.get("/syllabi").catch(() => ({ data: { syllabi: [] } }));
      setSyllabi(syllabiRes.data.syllabi ?? []);
    } catch (error) {
      console.error("Failed to delete syllabus", error);
    } finally {
      setDeletingId(null);
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
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center gap-4">
              <div className="text-4xl">
                {CHRONOTYPE_OPTIONS.find(o => o.value === profile.chronotype)?.icon || "☀️"}
              </div>
              <div>
                <p className="font-bold text-lg">{CHRONOTYPE_OPTIONS.find(o => o.value === profile.chronotype)?.label || "Flexible"}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{CHRONOTYPE_OPTIONS.find(o => o.value === profile.chronotype)?.description}</p>
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

          {/* Google Calendar Connection */}
          <section className="bg-card border border-border rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck size={16} className="text-primary" />
                <h2 className="font-bold text-base">Google Calendar</h2>
              </div>
              {gcalStatus === "connected" && (
                <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                  <CheckCircle size={12} /> Connected
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Connect your Google Calendar to pull in real events, assign mental tax, and write new tasks back.
            </p>

            {gcalStatus === "connected" ? (
              <div className="flex gap-3">
                <div className="flex-1 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
                  ✅ Your calendar is synced. Events appear on the dashboard with cognitive load scores.
                </div>
                <button
                  onClick={handleConnectGCal}
                  className="px-4 py-2 rounded-xl bg-muted border border-border text-xs font-medium hover:border-primary/40 transition-colors"
                >
                  Reconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectGCal}
                disabled={gcalConnecting}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 font-semibold py-3 px-4 rounded-2xl text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-primary/20"
              >
                {gcalConnecting ? (
                  <><Loader2 size={15} className="animate-spin" /> Waiting for authorization...</>
                ) : (
                  <><CalendarCheck size={15} /> Connect Google Calendar</>
                )}
              </button>
            )}

            {gcalConnecting && (
              <p className="mt-3 text-xs text-muted-foreground text-center">
                A Google consent window should be open. Authorize Flux, then return here.
              </p>
            )}
          </section>

          {/* Uploaded Syllabi */}

          <section className="bg-card border border-border rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-primary" />
              <h2 className="font-bold text-base">Uploaded Syllabi</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Syllabi you've uploaded. Tasks are reviewed against your schedule to avoid double-counting.
            </p>

            {syllabi.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                <FileText className="mx-auto mb-2 opacity-40" size={28} />
                <p>No syllabi uploaded yet.</p>
                <p className="mt-1 text-xs">
                  Go to the <a href="/upload" className="text-primary underline">Upload</a> tab to parse your course syllabus.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {syllabi.map((s) => {
                  const date = s.uploaded_at
                    ? new Date(s.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "Unknown date";
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border hover:border-primary/30 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{s.course_name || s.filename}</p>
                        <p className="text-xs text-muted-foreground">{s.filename !== s.course_name ? s.filename : ""} • {date}</p>
                        {s.reasoning && (
                          <p className="text-[10px] text-muted-foreground/80 mt-1 truncate" title={s.reasoning}>{s.reasoning}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1 text-xs font-bold text-purple-500 bg-purple-500/10 px-2 py-1 rounded-lg">
                          <span>+{s.daily_load_penalty?.toFixed(2)}τ / day</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSyncSyllabus(s.id)}
                            disabled={syncingId === s.id || deletingId === s.id}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                            title="Re-sync and analyze syllabus with AI"
                          >
                            <RefreshCw size={10} className={syncingId === s.id ? "animate-spin" : ""} />
                            {syncingId === s.id ? "Syncing..." : "Sync AI"}
                          </button>

                          <button
                            onClick={() => handleDeleteSyllabus(s.id)}
                            disabled={deletingId === s.id || syncingId === s.id}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Remove class and its baseline daily load"
                          >
                            <Trash2 size={10} />
                            {deletingId === s.id ? "Deleting..." : "Remove"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
