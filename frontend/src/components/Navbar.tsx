"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, Upload, LogOut, LogIn, UserPlus } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle"; // Optional, but usually good to have

export default function Navbar() {
  const pathname = usePathname();
  
  // Simple proxy for auth state based on current route
  const isPublicPage = ["/", "/login", "/signup"].includes(pathname);
  const isLoggedIn = !isPublicPage;

  return (
    <nav className="sticky top-0 z-[100] w-full border-b border-border bg-background/80 backdrop-blur-xl transition-colors">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link href={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2 group">
              <BrainCircuit className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-bold text-lg tracking-tight text-foreground">Brainwidth</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-6">
            {isLoggedIn ? (
              <>
                <Link 
                  href="/dashboard" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/quiz" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/quiz' ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  Quiz
                </Link>
                <Link 
                  href="/upload" 
                  className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5 ${pathname === '/upload' ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </Link>
                <div className="h-4 w-px bg-border hidden sm:block"></div>
                <ThemeToggle />
                <Link 
                  href="/" 
                  className="text-sm font-medium text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Link>
              </>
            ) : (
              <>
                <ThemeToggle />
                <div className="h-4 w-px bg-border hidden sm:block"></div>
                <Link 
                  href="/login" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  Log in
                </Link>
                <Link 
                  href="/signup" 
                  className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-full transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-sm shadow-primary/20"
                >
                  <UserPlus className="w-4 h-4 hidden sm:block" />
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
