"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { useState } from "react";

// Basic SQL Injection prevention regex
const SQLI_REGEX = /('|"|;|--|\/\*|\*\/|@@|@|char|nchar|varchar|nvarchar|alter|begin|cast|create|cursor|declare|delete|drop|end|exec|execute|fetch|insert|kill|open|select|sys|sysobjects|syscolumns|table|update)/i;

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    age: "",
    gender: "",
    studentYear: ""
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Deep check all string values in formData for SQLi patterns
    const hasUnsafeInput = Object.values(formData).some(
      value => typeof value === 'string' && SQLI_REGEX.test(value)
    );

    if (hasUnsafeInput) {
      setError("Invalid characters detected. Please remove special characters from your inputs to continue.");
      return;
    }

    // If safe, proceed to quiz
    window.location.href = '/quiz';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 bg-background transition-colors duration-300 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse duration-1000"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-700 duration-1000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000 duration-1000"></div>

      <div className="w-full max-w-xl bg-card text-card-foreground rounded-3xl border border-border shadow-xl p-8 z-10 glassmorphism relative">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold mb-2">Create an account</h1>
        <p className="text-muted-foreground mb-8">Start managing your time without the mental tax.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="name">
                Full Name
              </label>
              <input
                className={`flex h-12 w-full rounded-xl border ${error && SQLI_REGEX.test(formData.name) ? 'border-red-500 focus-visible:ring-red-500' : 'border-input focus-visible:ring-ring'} bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1`}
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="email">
                Email
              </label>
              <input
                className={`flex h-12 w-full rounded-xl border ${error && SQLI_REGEX.test(formData.email) ? 'border-red-500 focus-visible:ring-red-500' : 'border-input focus-visible:ring-ring'} bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1`}
                id="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="name@example.com"
                type="email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="password">
              Password
            </label>
            <input
              className={`flex h-12 w-full rounded-xl border ${error && SQLI_REGEX.test(formData.password) ? 'border-red-500 focus-visible:ring-red-500' : 'border-input focus-visible:ring-ring'} bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1`}
              id="password"
              value={formData.password}
              onChange={handleInputChange}
              type="password"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="age">
                Age Demographic
              </label>
              <select
                className="flex h-12 w-full rounded-xl border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none"
                id="age"
                value={formData.age}
                onChange={handleInputChange}
                required
              >
                <option value="" disabled>Select age group</option>
                <option value="under18">Under 18</option>
                <option value="18-24">18-24</option>
                <option value="25-34">25-34</option>
                <option value="35-44">35-44</option>
                <option value="45+">45+</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="gender">
                Gender <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <select
                className="flex h-12 w-full rounded-xl border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none"
                id="gender"
                value={formData.gender}
                onChange={handleInputChange}
              >
                <option value="" disabled>Select gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="nonbinary">Non-binary</option>
                <option value="other">Other / Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 pb-4">
            <label className="text-sm font-medium leading-none" htmlFor="studentYear">
              Student Year
            </label>
            <select
              className="flex h-12 w-full rounded-xl border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none"
              id="studentYear"
              value={formData.studentYear}
              onChange={handleInputChange}
              required
            >
              <option value="" disabled>Select your current year</option>
              <option value="highschool">High School</option>
              <option value="undergrad-freshman">Undergraduate - Freshman</option>
              <option value="undergrad-sophomore">Undergraduate - Sophomore</option>
              <option value="undergrad-junior">Undergraduate - Junior</option>
              <option value="undergrad-senior">Undergraduate - Senior</option>
              <option value="grad-master">Graduate - Master's</option>
              <option value="grad-phd">Graduate - PhD</option>
            </select>
          </div>
          
          <button
            type="submit"
            className="w-full group flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4 h-14 text-lg font-bold transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            Create Account
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
