"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { useState } from "react";
import axios from "axios";
import { setToken, setUser } from "@/lib/auth";

// Basic SQL Injection prevention regex
const SQLI_REGEX = /('|"|;|--|\/\*|\*\/|char|nchar|varchar|nvarchar|alter|begin|cast|create|cursor|declare|delete|drop|end|exec|execute|fetch|insert|kill|open|select|sys|sysobjects|syscolumns|table|update)/i;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // SQL Injection Check
    if (SQLI_REGEX.test(email) || SQLI_REGEX.test(password)) {
      setError("Invalid characters detected. Please remove special characters.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await axios.post("http://localhost:8000/api/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      if (response.data && response.data.access_token) {
        setToken(response.data.access_token);
        // For simple demonstration, manually saving the email
        setUser({ email, name: email.split('@')[0] }); 
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to log in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background transition-colors duration-300 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse duration-1000"></div>
      <div className="absolute -bottom-8 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000 duration-1000"></div>

      <div className="w-full max-w-md bg-card text-card-foreground rounded-3xl border border-border shadow-xl p-8 z-10 glassmorphism relative">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
        <p className="text-muted-foreground mb-8">Log in to manage your cognitive load.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
              Email
            </label>
            <input
              className={`flex h-12 w-full rounded-xl border ${error ? 'border-red-500 focus-visible:ring-red-500' : 'border-input focus-visible:ring-ring'} bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1`}
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              type="email"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
              Password
            </label>
            <input
              className={`flex h-12 w-full rounded-xl border ${error ? 'border-red-500 focus-visible:ring-red-500' : 'border-input focus-visible:ring-ring'} bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1`}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full group flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4 h-12 text-md font-semibold transition-all active:scale-95 mt-4 disabled:opacity-70"
          >
            {isLoading ? "Logging In..." : "Log In"}
            {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
