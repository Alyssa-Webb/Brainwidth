"use client";

"use client";

import Link from "next/link";
import { ArrowRight, BrainCircuit, CalendarClock, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 pt-24 pb-12 bg-[#fffde7] dark:bg-background transition-colors duration-300 relative overflow-x-hidden font-sans">
      <style>{`
        /* Overrides Next.js body background. By setting this to the navbar color, the top overscroll matches the navbar! */
        html, body { background-color: #fff9c4 !important; }
        html.dark, html.dark body { background-color: #000000 !important; }
      `}</style>

      {/* Background Accents - Matching Dashboard Style */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-50 dark:opacity-100">
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-primary/15 mix-blend-multiply filter blur-[140px]" />
        <div className="absolute bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 mix-blend-multiply filter blur-[140px]" />
      </div>

      <main className="flex flex-col items-center max-w-5xl w-full z-10 text-center">

        {/* Hero Section */}
        <section className="space-y-6 flex flex-col items-center mb-12">
          <h1 className="text-5xl sm:text-8xl font-black tracking-tight text-foreground leading-[1.1]">
            Welcome to
            <span className="text-primary italic"> Brainwidth</span>
          </h1>

          <p className="text-xl sm:text text-muted-foreground max-w-3xl leading-relaxed mt-4">
            The first cognitive load scheduler built for students, by students.
          </p>
        </section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-20">
          <Link
            href="/signup"
            className="group flex items-center justify-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl px-10 py-5 text-xl font-bold transition-all hover:scale-[1.03] active:scale-[0.97] shadow-2xl shadow-primary/30"
          >
            Start Your Journey
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 bg-card text-foreground hover:bg-secondary border border-border rounded-2xl px-10 py-5 text-xl font-bold transition-all hover:scale-[1.03] active:scale-[0.97] shadow-xl shadow-black/5"
          >
            Log In
          </Link>
        </div>

        {/* Core Philosophy Card */}
        <section className="relative w-full max-w-4xl px-4 mb-24">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-[4rem] -z-10" />
          <div className="bg-card/80 backdrop-blur-xl text-card-foreground p-8 sm:p-12 rounded-[2.5rem] border border-border shadow-2xl text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <BrainCircuit size={200} className="rotate-90" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-3">
              <div className="w-1.5 h-8 bg-primary rounded-full" />
              Why Brainwidth?
            </h2>

            <div className="space-y-6 text-lg leading-relaxed max-w-2xl text-muted-foreground">
              <p>
                Typical tools like Google Calendar only show time blocks, ignoring the
                <strong className="text-foreground"> energy cost</strong> of your work.
              </p>
              <p>
                An hour of deep analysis isn't the same as an hour of emails.
                Brainwidth calculates the <strong className="text-primary">"Mental Tax"</strong> of every task to protect
                your focus and prevent burnout before it starts.
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-20 px-4">
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title="Chronotype Intelligence"
            description="Align your hardest work with your biology. We find your peak focus windows."
            color="bg-orange-500/10 text-orange-500"
          />
          <FeatureCard
            icon={<BrainCircuit className="w-8 h-8 rotate-90" />}
            title="Tax-Aware Scheduling"
            description="Schedule tasks based on cognitive intensity, not just minutes available."
            color="bg-primary/10 text-primary"
          />
          <FeatureCard
            icon={<ArrowRight className="w-8 h-8" />}
            title="AI Co-Pilot"
            description="Get real-time scheduling advice from your personal AI optimizer."
            color="bg-blue-500/10 text-blue-500"
          />
        </div>

      </main>
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: string }) {
  return (
    <div className="flex flex-col items-center text-center p-8 bg-card/60 backdrop-blur-md text-card-foreground rounded-[2rem] border border-border shadow-sm hover:shadow-xl transition-all hover:-translate-y-2 group">
      <div className={`p-4 rounded-2xl mb-6 transition-transform group-hover:scale-110 ${color}`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
