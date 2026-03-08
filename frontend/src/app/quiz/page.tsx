"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BrainCircuit, CheckCircle2 } from "lucide-react";

export default function QuizPage() {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 bg-background transition-colors duration-300 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 -left-4 w-[500px] h-[500px] bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-[0.15] animate-blob"></div>
      <div className="absolute bottom-0 -right-4 w-[500px] h-[500px] bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-[0.15] animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-2xl bg-card text-card-foreground rounded-3xl border border-border shadow-xl p-8 sm:p-12 z-10 glassmorphism relative">
        <div className="mb-8 flex items-center justify-between">
          {step === 1 ? (
             <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit Quiz
            </Link>
          ) : (
            <button onClick={prevStep} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
          )}

          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`h-2 w-8 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
              <BrainCircuit className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Discover your Chronotype</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Your chronotype determines your natural peaks in alertness and energy. 
              Brainwidth uses this to schedule your high cognitive load tasks at the exact right moment.
            </p>
            <div className="pt-8">
              <label className="text-lg font-semibold block mb-4">When do you naturally wake up if you don't have an alarm?</label>
              <div className="grid grid-cols-1 gap-3">
                {['Before 6:00 AM (Early Bird)', 'Between 6:00 AM and 8:00 AM', 'Between 8:00 AM and 10:00 AM', 'After 10:00 AM (Night Owl)'].map(opt => (
                  <button key={opt} onClick={nextStep} className="w-full text-left px-6 py-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
             <h1 className="text-3xl font-bold">Energy Peaks</h1>
             <p className="text-muted-foreground text-lg leading-relaxed">
              Understanding your energy crashes is just as important as your peaks.
            </p>
            <div className="pt-8">
              <label className="text-lg font-semibold block mb-4">When do you find it hardest to focus on complex tasks, like Calculus?</label>
              <div className="grid grid-cols-1 gap-3">
                {['Early Morning (Brain fog)', 'Mid-Afternoon (Post-lunch slump)', 'Late Evening (Brain fried)', 'I have consistent energy all day'].map(opt => (
                  <button key={opt} onClick={nextStep} className="w-full text-left px-6 py-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in flex flex-col items-center text-center py-8">
            <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-bold">Quiz Complete!</h1>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
              We've calculated your optimal cognitive hours. Now, let's look at your semester workload to build your schedule.
            </p>
            <div className="pt-8 w-full block">
              <Link 
                href="/upload" 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-12 h-14 text-lg font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
              >
                Continue to Syllabus Upload
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
