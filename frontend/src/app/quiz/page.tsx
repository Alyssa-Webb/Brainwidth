"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BrainCircuit, CheckCircle2, Zap } from "lucide-react";
import { api, getToken } from "@/lib/auth";

/* ─── Quiz Questions ─────────────────────────────────────────────────────── */

const QUESTIONS = [
  {
    id: "wake_time",
    title: "Discover your Chronotype",
    subtitle: "Your chronotype determines your natural energy peaks. Brainwidth schedules deep work at exactly the right moment.",
    question: "When do you naturally wake up without an alarm?",
    options: [
      { label: "Before 6:00 AM — I'm up before dawn", signals: { chronotype: "morning", capacity: +0.5 } },
      { label: "6:00–7:30 AM — Early but not extreme", signals: { chronotype: "morning", capacity: +0.25 } },
      { label: "7:30–9:00 AM — Middle of the road", signals: { chronotype: "neutral", capacity: 0 } },
      { label: "After 9:00 AM — Night owl through and through", signals: { chronotype: "evening", capacity: -0.25 } },
    ]
  },
  {
    id: "peak_focus",
    title: "Energy Peaks",
    subtitle: "Knowing when you're sharpest lets us front-load your hardest work.",
    question: "When do you feel your sharpest and most focused?",
    options: [
      { label: "Morning (before noon) — Peak clarity in the AM", signals: { chronotype: "morning", capacity: +0.5 } },
      { label: "Early afternoon (12–3 PM)", signals: { chronotype: "neutral", capacity: +0.25 } },
      { label: "Late afternoon / evening (3–7 PM)", signals: { chronotype: "evening", capacity: +0.25 } },
      { label: "Night (after 8 PM)", signals: { chronotype: "evening", capacity: 0 } },
    ]
  },
  {
    id: "slump",
    title: "Energy Crashes",
    subtitle: "Understanding your lows is just as important as your highs.",
    question: "When is it hardest to focus on complex tasks (like Calculus)?",
    options: [
      { label: "Early morning — Brain fog before coffee", signals: { chronotype: "evening", capacity: -0.5 } },
      { label: "Post-lunch slump (1–3 PM)", signals: { chronotype: "neutral", capacity: -0.25 } },
      { label: "Late evening — brain is fried", signals: { chronotype: "morning", capacity: -0.25 } },
      { label: "I have consistent energy all day", signals: { chronotype: "neutral", capacity: +0.5 } },
    ]
  },
  {
    id: "deep_work_hours",
    title: "Daily Capacity",
    subtitle: "Everyone has a ceiling. Be honest — this helps us protect yours.",
    question: "How many hours of deep focus (studying, coding, writing) can you sustain per day?",
    options: [
      { label: "1–2 hours max before I burn out", signals: { chronotype: "neutral", capacity: -2.0 } },
      { label: "3–4 hours — average day", signals: { chronotype: "neutral", capacity: -1.0 } },
      { label: "5–6 hours — I'm pretty focused", signals: { chronotype: "neutral", capacity: 0 } },
      { label: "7+ hours — I can grind all day", signals: { chronotype: "neutral", capacity: +1.0 } },
    ]
  },
  {
    id: "recovery",
    title: "Recovery Speed",
    subtitle: "Resilience affects how quickly we can reschedule heavy tasks.",
    question: "After a mentally draining session, how long until you feel ready for another?",
    options: [
      { label: "15–30 minutes — I bounce back fast", signals: { chronotype: "neutral", capacity: +1.0 } },
      { label: "1–2 hours with a break / walk", signals: { chronotype: "neutral", capacity: +0.5 } },
      { label: "Rest of the day — I'm done after one big session", signals: { chronotype: "neutral", capacity: -1.0 } },
      { label: "I need a full night's sleep to reset", signals: { chronotype: "neutral", capacity: -2.0 } },
    ]
  },
  {
    id: "ideal_day",
    title: "Your Ideal Day",
    subtitle: "This gives us the full picture of how you work best.",
    question: "Which schedule would feel most natural and productive for you?",
    options: [
      { label: "Deep work 7–11 AM, meetings/tasks in the afternoon", signals: { chronotype: "morning", capacity: +0.5 } },
      { label: "Meetings in the morning, deep work 2–6 PM", signals: { chronotype: "evening", capacity: +0.5 } },
      { label: "Flexible blocks throughout the day with breaks", signals: { chronotype: "neutral", capacity: 0 } },
      { label: "Intense sprint at night, sleep in the next day", signals: { chronotype: "evening", capacity: -0.25 } },
    ]
  }
];

const BASE_CAPACITY = 8.0;

/* ─── Scoring Logic ────────────────────────────────────────────────────────── */

function computeProfile(answers: Record<string, number>) {
  let morningScore = 0;
  let eveningScore = 0;
  let capacityDelta = 0;

  QUESTIONS.forEach((q) => {
    const optionIdx = answers[q.id];
    if (optionIdx === undefined) return;
    const signals = q.options[optionIdx]?.signals ?? {};
    if (signals.chronotype === "morning") morningScore++;
    if (signals.chronotype === "evening") eveningScore++;
    capacityDelta += signals.capacity ?? 0;
  });

  const chronotype = morningScore > eveningScore ? "morning" : eveningScore > morningScore ? "evening" : "neutral";
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
      await api.patch("/auth/profile", profile);
    } catch {
      // fail silently – user can update manually via Profile page
    } finally {
      setSaving(false);
    }
  };

  const CHRONOTYPE_EMOJI: Record<string, string> = {
    morning: "🌅",
    evening: "🌙",
    neutral: "☀️",
  };
  const CHRONOTYPE_LABEL: Record<string, string> = {
    morning: "Morning Person",
    evening: "Night Owl",
    neutral: "Flexible",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 bg-background transition-colors duration-300 relative overflow-hidden">
      <div className="absolute top-0 -left-4 w-[500px] h-[500px] bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-[0.15] animate-blob" />
      <div className="absolute bottom-0 -right-4 w-[500px] h-[500px] bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-[0.12] animation-delay-2000" />

      <div className="w-full max-w-2xl bg-card text-card-foreground rounded-3xl border border-border shadow-xl p-8 sm:p-12 z-10 relative">

        {/* Header nav */}
        <div className="mb-8 flex items-center justify-between">
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
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i < step ? "bg-primary w-6" : "bg-muted w-3"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Intro */}
        {step === 0 && (
          <div className="space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
              <BrainCircuit className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Cognitive Profile Quiz</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              6 quick questions to discover your <strong>chronotype</strong> and your personal <strong>daily mental capacity</strong>. 
              Brainwidth uses this to build your ideal schedule.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4">
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
          <div key={currentQ.id} className="space-y-6 animate-fade-in">
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
              <label className="text-lg font-semibold block mb-4">{currentQ.question}</label>
              <div className="grid grid-cols-1 gap-3">
                {currentQ.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className={`w-full text-left px-5 py-4 rounded-xl border transition-all hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      answers[currentQ.id] === idx
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
          <div className="space-y-6 animate-fade-in flex flex-col items-center text-center py-4">
            <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-green-500/20">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-bold">Your Profile</h1>

            <div className="grid grid-cols-2 gap-4 w-full mt-2">
              <div className="bg-muted/50 border border-border rounded-2xl p-5 text-center">
                <div className="text-4xl mb-2">{CHRONOTYPE_EMOJI[result.chronotype]}</div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Chronotype</p>
                <p className="text-xl font-bold">{CHRONOTYPE_LABEL[result.chronotype]}</p>
              </div>
              <div className="bg-muted/50 border border-border rounded-2xl p-5 text-center">
                <div className="text-4xl font-mono font-bold text-primary mb-2">{result.base_capacity}τ</div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Daily Capacity</p>
                <p className="text-sm text-muted-foreground">Mental tax units per day</p>
              </div>
            </div>

            <p className="text-muted-foreground text-base leading-relaxed max-w-md">
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
