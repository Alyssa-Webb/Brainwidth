"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BrainCircuit, CheckCircle2, Zap } from "lucide-react";
import { api, getToken, setUser } from "@/lib/auth";

/* ─── Quiz Questions ─────────────────────────────────────────────────────── */

const QUESTIONS = [
  {
    id: "wake_time",
    title: "Natural Rhythm",
    subtitle: "Your chronotype determines your natural energy peaks.",
    question: "When do you naturally wake up without an alarm?",
    options: [
      { label: "Before 6:00 AM — Early riser", signals: { lion: 3, bear: 0, wolf: 0, night_owl: 0, dolphin: 1, capacity: +0.5 } },
      { label: "7:00–8:30 AM — With the sun", signals: { lion: 0, bear: 3, wolf: 0, night_owl: 0, dolphin: 0, capacity: +0.25 } },
      { label: "9:00 AM or later — Night owl tendencies", signals: { lion: 0, bear: 0, wolf: 3, night_owl: 2, dolphin: 0, capacity: -0.25 } },
      { label: "It varies — My sleep is often restless", signals: { lion: 0, bear: 0, wolf: 0, night_owl: 0, dolphin: 3, capacity: -0.5 } },
    ]
  },
  {
    id: "peak_focus",
    title: "Energy Peaks",
    subtitle: "Knowing when you're sharpest lets us front-load your hardest work.",
    question: "When do you feel your sharpest and most focused for deep work?",
    options: [
      { label: "Morning (8 AM – 12 PM)", signals: { lion: 3, bear: 1, wolf: 0, night_owl: 0, dolphin: 0, capacity: +0.5 } },
      { label: "Mid-day (11 AM – 3 PM)", signals: { lion: 0, bear: 3, wolf: 0, night_owl: 0, dolphin: 1, capacity: +0.25 } },
      { label: "Evening (5 PM – 9 PM)", signals: { lion: 0, bear: 0, wolf: 3, night_owl: 1, dolphin: 0, capacity: +0.25 } },
      { label: "Late Night (after 10 PM)", signals: { lion: 0, bear: 0, wolf: 1, night_owl: 3, dolphin: 0, capacity: 0 } },
    ]
  },
  {
    id: "slump",
    title: "The Slump",
    subtitle: "Understanding your lows is just as important as your highs.",
    question: "When is it hardest to focus on complex tasks?",
    options: [
      { label: "Early morning — Brain fog before coffee", signals: { wolf: 2, night_owl: 2, dolphin: 1, bear: 0, lion: 0, capacity: -0.5 } },
      { label: "Post-lunch (2 PM – 4 PM)", signals: { bear: 2, lion: 1, wolf: 0, night_owl: 0, dolphin: 0, capacity: -0.25 } },
      { label: "Late evening — Brain is fried", signals: { lion: 2, bear: 0, wolf: 0, night_owl: 0, dolphin: 0, capacity: -0.25 } },
      { label: "I feel consistently alert all day", signals: { dolphin: 1, lion: 0, bear: 0, wolf: 0, night_owl: 0, capacity: +0.5 } },
    ]
  },
  {
    id: "workflow",
    title: "Preferred Workflow",
    subtitle: "How do you naturally approach a big project?",
    question: "Choose the schedule that sounds most productive for you:",
    options: [
      { label: "Attack it first thing and finish early", signals: { lion: 3, capacity: +0.5 } },
      { label: "Steady progress through the bulk of the day", signals: { bear: 3, capacity: +0.25 } },
      { label: "Build momentum and sprint in the late afternoon", signals: { wolf: 3, capacity: +0.25 } },
      { label: "Total silence at night for intense focus", signals: { night_owl: 3, capacity: 0 } },
    ]
  }
];

const BASE_CAPACITY = 8.0;

/* ─── Scoring Logic ────────────────────────────────────────────────────────── */

function computeProfile(answers: Record<string, number>) {
  const scores = { lion: 0, bear: 0, wolf: 0, dolphin: 0 };
  let capacityDelta = 0;

  QUESTIONS.forEach((q) => {
    const optionIdx = answers[q.id];
    if (optionIdx === undefined) return;
    const signals = q.options[optionIdx]?.signals as any ?? {};

    // Sum animal scores
    scores.lion += (signals.lion || 0);
    scores.bear += (signals.bear || 0);
    // Merge night owl points into wolf so previous quiz signals don't break
    scores.wolf += ((signals.wolf || 0) + (signals.night_owl || 0));
    scores.dolphin += (signals.dolphin || 0);

    capacityDelta += (signals.capacity || 0);
  });

  // Find max score
  let chronotype = "bear";
  let maxScore = -1;
  Object.entries(scores).forEach(([type, score]) => {
    if (score > maxScore) {
      maxScore = score;
      chronotype = type;
    }
  });

  const base_capacity = Math.max(4, Math.min(14, Math.round((BASE_CAPACITY + capacityDelta) * 2) / 2));

  return { chronotype, base_capacity };
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function QuizPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 = intro, 1–6 = questions, 7 = results
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ chronotype: string; base_capacity: number } | null>(null);

  const totalSteps = QUESTIONS.length;
  const currentQ = QUESTIONS[step - 1];
  const progress = step / totalSteps;

  const handleAnswer = (optionIdx: number) => {
    const newAnswers = { ...answers, [currentQ.id]: optionIdx };
    setAnswers(newAnswers);

    if (step < totalSteps) {
      setStep((s) => s + 1);
    } else {
      // Last question – compute and save
      const profile = computeProfile(newAnswers);
      setResult(profile);
      setStep(totalSteps + 1);
      saveProfile(profile);
    }
  };

  const saveProfile = async (profile: { chronotype: string; base_capacity: number }) => {
    if (!getToken()) return; // Not logged in yet – skip save, will be set at signup
    setSaving(true);
    try {
      const res = await api.patch("/auth/profile", profile);
      // Immediately reflect backend change in local UI state
      if (res.data) {
        setUser(res.data);
      }
    } catch {
      // fail silently – user can update manually via Profile page
    } finally {
      setSaving(false);
    }
  };

  const CHRONOTYPE_EMOJI: Record<string, string> = {
    lion: "🦁",
    bear: "🐻",
    wolf: "🐺",
    dolphin: "🐬",
  };
  const CHRONOTYPE_LABEL: Record<string, string> = {
    lion: "Lion",
    bear: "Bear",
    wolf: "Wolf (Night Owl)",
    dolphin: "Dolphin",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 bg-[#fffde7] dark:bg-background transition-colors duration-300 relative overflow-hidden">

      <style>{`
        /* Overrides Next.js body background. By setting this to the navbar color, the top overscroll matches the navbar! */
        html, body { background-color: #fff9c4 !important; }
        html.dark, html.dark body { background-color: #000000 !important; }

        @keyframes float-complex-1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(30px, -50px) rotate(10deg) scale(1.1); }
          66% { transform: translate(-20px, 20px) rotate(-5deg) scale(0.9); }
        }
        @keyframes float-complex-2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1.1); }
          33% { transform: translate(-40px, 40px) rotate(-10deg) scale(0.95); }
          66% { transform: translate(20px, -30px) rotate(8deg) scale(1.05); }
        }
        @keyframes float-complex-3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(0.9); }
          33% { transform: translate(50px, 20px) rotate(15deg) scale(1); }
          66% { transform: translate(-30px, -40px) rotate(-12deg) scale(1.1); }
        }
        @keyframes float-complex-4 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(-30px, -60px) rotate(-8deg) scale(1.15); }
          66% { transform: translate(40px, 30px) rotate(12deg) scale(0.95); }
        }
      `}</style>

      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-50 dark:opacity-100">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/15 mix-blend-multiply filter blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-blue-500/8 mix-blend-multiply filter blur-[120px]" />
      </div>

      {/* Bouncing Background Emojis - Hidden in dark mode to keep it "all black" */}
      <div className="absolute inset-0 pointer-events-none opacity-20 text-[6rem] md:text-[8rem] z-0 overflow-hidden select-none dark:hidden">
        <div className="absolute top-[5%] left-[5%]" style={{ animation: 'float-complex-1 12s ease-in-out infinite' }}>🦁</div>
        <div className="absolute top-[18%] right-[8%]" style={{ animation: 'float-complex-2 15s ease-in-out infinite' }}>🐺</div>
        <div className="absolute bottom-[25%] left-[8%]" style={{ animation: 'float-complex-3 14s ease-in-out infinite' }}>🐻</div>
        <div className="absolute bottom-[10%] right-[12%]" style={{ animation: 'float-complex-4 16s ease-in-out infinite' }}>🐬</div>

        <div className="absolute top-[40%] left-[2%]" style={{ animation: 'float-complex-2 18s ease-in-out infinite' }}>🐬</div>
        <div className="absolute top-[60%] right-[3%]" style={{ animation: 'float-complex-1 20s ease-in-out infinite' }}>🦁</div>
        <div className="absolute top-[6%] right-[35%]" style={{ animation: 'float-complex-3 17s ease-in-out infinite' }}>🐻</div>
        <div className="absolute bottom-[5%] left-[30%]" style={{ animation: 'float-complex-4 19s ease-in-out infinite' }}>🐺</div>
      </div>

      <div className="w-full max-w-4xl bg-card text-card-foreground rounded-3xl border border-border shadow-xl p-6 sm:p-8 z-10 relative">

        {/* Header nav */}
        <div className="mb-4 flex items-center justify-between">
          {step === 0 ? (
            <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> Exit
            </Link>
          ) : step <= totalSteps ? (
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </button>
          ) : <div />}

          {step > 0 && step <= totalSteps && (
            <div className="flex items-center gap-2">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i < step ? "bg-primary w-6" : "bg-muted w-3"
                    }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Intro */}
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
              <BrainCircuit className="w-8 h-8 text-primary rotate-90" />
            </div>
            <h1 className="text-3xl font-bold">Cognitive Profile Quiz</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              6 quick questions to discover your <strong>chronotype</strong> and your personal <strong>daily mental capacity</strong>.
              Brainwidth uses this to build your ideal schedule.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {["🌅 Chronotype", "⚡ Capacity", "📅 Schedule"].map((label) => (
                <div key={label} className="bg-muted/50 border border-border rounded-2xl p-4 text-center">
                  <p className="text-sm font-semibold">{label}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8 h-14 text-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              Start Quiz <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Questions */}
        {step >= 1 && step <= totalSteps && (
          <div key={currentQ.id} className="space-y-4 animate-fade-in">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Question {step} of {totalSteps}
                </span>
              </div>
              <h1 className="text-2xl font-bold">{currentQ.title}</h1>
              <p className="text-muted-foreground mt-1 leading-relaxed">{currentQ.subtitle}</p>
            </div>

            <div>
              <label className="text-lg font-semibold block mb-3">{currentQ.question}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentQ.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className={`w-full text-left px-5 py-4 rounded-xl border transition-all hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/50 ${answers[currentQ.id] === idx
                      ? "border-primary bg-primary/10"
                      : "border-border"
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {step === totalSteps + 1 && result && (
          <div className="space-y-4 animate-fade-in flex flex-col items-center text-center py-2">
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-1 shadow-lg shadow-green-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold">Your Profile</h1>

            <div className="grid grid-cols-2 gap-3 w-full mt-1 mb-4">
              <div className="bg-muted/50 border border-border rounded-2xl p-4 text-center">
                <div className="text-3xl mb-1">{CHRONOTYPE_EMOJI[result.chronotype]}</div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Chronotype</p>
                <p className="text-lg font-bold">{CHRONOTYPE_LABEL[result.chronotype]}</p>
              </div>
              <div className="bg-muted/50 border border-border rounded-2xl p-4 text-center">
                <div className="text-3xl font-mono font-bold text-primary mb-1">{result.base_capacity}τ</div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Daily Capacity</p>
                <p className="text-xs text-muted-foreground">Mental tax units per day</p>
              </div>
            </div>

            {/* Display all chronotypes for context */}
            <div className="w-full text-left space-y-4 mb-8">
              <h2 className="text-lg font-bold">The 4 Chronotypes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: "lion", label: "Lion", icon: "🦁", percentage: "15%", schedule: "Wake ~5:30 a.m. | Sleep ~9:30 p.m.", peak: "8 a.m. to 12 p.m.", routine: "Tackle analytical work early, as energy drops in the afternoon. Avoid complex work after 4 p.m." },
                  { value: "bear", label: "Bear", icon: "🐻", percentage: "40%", schedule: "Wake ~7 a.m. | Sleep ~11 p.m.", peak: "10 a.m. to 2 p.m.", routine: "Deep work in the morning, administrative tasks in the afternoon slump, and exercise in the early evening." },
                  { value: "wolf", label: "Wolf (Night Owl)", icon: "🐺", percentage: "35%", schedule: "Wake ~9 a.m.+ | Sleep ~1 a.m.+", peak: "4 p.m. to 8 p.m. & Late Night", routine: "Creative or deep work in the evening; ease into the morning with lighter tasks." },
                  { value: "dolphin", label: "Dolphin", icon: "🐬", percentage: "10%", schedule: "Wake ~6:30 a.m. | Sleep ~11:30 p.m.", peak: "10 a.m. to 1 p.m. & 4 p.m.-7 p.m.", routine: "Focus during midday surges; use frequent moderate breaks to manage stress and avoid over-taxing." }
                ].map((ct) => (
                  <div
                    key={ct.value}
                    className={`flex flex-col p-5 rounded-2xl border transition-all ${result.chronotype === ct.value ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20 scale-[1.02]" : "border-border bg-card hover:border-primary/30"}`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl bg-muted/50 w-12 h-12 rounded-full flex items-center justify-center">{ct.icon}</span>
                      <div>
                        <span className="font-bold text-base block">{ct.label}</span>
                        {result.chronotype === ct.value && (
                          <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block mt-1">Your Result</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 flex-1">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-0.5">Schedule</span>
                        <span className="text-xs font-medium">{ct.schedule}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-0.5">Peak Focus</span>
                        <span className="text-xs font-semibold text-primary">{ct.peak}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-0.5">Best Routine</span>
                        <span className="text-xs text-muted-foreground leading-relaxed">{ct.routine}</span>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border flex justify-between items-center text-xs text-muted-foreground font-medium">
                      <span>Population</span>
                      <span className="bg-muted px-2 py-1 rounded-md">{ct.percentage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {saving
                ? "Saving your profile..."
                : "We've saved your cognitive profile. Now let's look at your semester workload."}
            </p>

            <div className="pt-2 w-full flex flex-col sm:flex-row gap-3">
              <Link
                href="/upload"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8 h-14 text-base font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
              >
                Upload Syllabus <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/dashboard"
                className="flex-1 inline-flex items-center justify-center gap-2 border border-border bg-secondary text-secondary-foreground hover:bg-muted rounded-xl px-8 h-14 text-base font-semibold transition-all"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
