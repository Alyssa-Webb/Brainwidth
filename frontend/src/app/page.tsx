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
    <div className="min-h-screen flex flex-col items-center justify-center p-8 pb-20 sm:p-20 font-sans relative overflow-hidden bg-background text-foreground transition-colors duration-300">

      {/* Background Gradients */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse duration-1000"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-700 duration-1000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000 duration-1000"></div>

      <main className="flex flex-col items-center max-w-4xl w-full gap-12 text-center z-10 mt-12">

        {/* Hero Section */}
        <section className="space-y-6 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4 border border-primary/20 backdrop-blur-sm shadow-sm">
            <SparklesIcon className="w-4 h-4" />
            <span>Manage your time. Master your Mind.</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-foreground transition-colors">
            Welcome to <span className="bg-clip-text bg-gradient-to-r from-primary to-blue-500">Brainwidth</span>
          </h1>

          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl leading-relaxed mt-4 transition-colors">
            The first cognitive load scheduler built for students balancing complex semester workloads.
          </p>
        </section>

        {/* Pitch Section */}
        <section className="bg-card text-card-foreground p-8 sm:p-10 rounded-3xl border border-border shadow-xl shadow-primary/5 max-w-3xl backdrop-blur-md bg-opacity-80 dark:bg-opacity-80 transition-all">
          <p className="text-lg leading-relaxed text-left">
            Typical tools like Google Calendar and Outlook only provide linear time blocks without considering the <strong className="text-primary font-bold">"Mental Tax"</strong> of switching between a high-level Calculus assignment and a tedious, multi-client meeting.
            <br /><br />
            Hyma and Alyssa developed Brainwidth to directly support students in managing their time and approaching rigorous tasks intelligently.
          </p>
        </section>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4">
          <Link
            href="/signup"
            className="group flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 py-4 text-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
          >
            Get Started
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border rounded-full px-8 py-4 text-lg font-semibold transition-all hover:scale-105 active:scale-95"
          >
            Log In
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full mt-12">
          <FeatureCard
            icon={<BrainCircuit className="w-8 h-8 text-primary" />}
            title="Chronotype Quiz"
            description="Discover your peak mental hours and optimize your schedule."
          />
          <FeatureCard
            icon={<CalendarClock className="w-8 h-8 text-blue-500" />}
            title="Tax-Aware Scheduling"
            description="Schedule tasks based on cognitive load, not just available minutes."
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8 text-purple-500" />}
            title="AI Chatbot Assistant"
            description="Get real-time scheduling advice from your personal AI."
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

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6 bg-card text-card-foreground rounded-2xl border border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
      <div className="p-3 bg-secondary rounded-xl mb-4 text-secondary-foreground">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
