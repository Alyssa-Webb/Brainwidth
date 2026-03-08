"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrainCircuit, Upload, LogOut, LogIn, UserPlus, ListTodo, UserCircle, LayoutDashboard, FileQuestion } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle"; // Optional, but usually good to have
import { useState, useEffect } from "react";
import { getToken, getUser, removeToken } from "@/lib/auth";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    setIsLoggedIn(!!token);
    if (user?.name) setUserName(user.name);
  }, [pathname]);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    removeToken();
    setIsLoggedIn(false);
    router.push("/");
  };

  return (
    <nav className={`sticky top-0 z-[100] w-full border-b border-border backdrop-blur-xl transition-colors ${['/quiz', '/upload', '/tasks', '/profile'].includes(pathname) ? 'bg-[#fff9c4]/90 dark:bg-background/80' : 'bg-background/80'}`}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              <BrainCircuit className="w-6 h-6 text-primary group-hover:scale-110 transition-transform rotate-90" />
              <span className="font-bold text-lg tracking-tight text-foreground">Brainwidth</span>
            </Link>
            <span className="hidden md:inline-block text-xs text-muted-foreground/80 font-medium italic border-l border-border pl-4">
              Stop managing your time. Start managing your brain.
            </span>
          </div>

          <div className="flex items-center gap-6">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5 ${pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  href="/quiz"
                  className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5 ${pathname === '/quiz' ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <FileQuestion className="w-4 h-4" />
                  Quiz
                </Link>
                <Link
                  href="/tasks"
                  className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5 ${pathname === '/tasks' ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <ListTodo className="w-4 h-4" />
                  Tasks
                </Link>
                <Link
                  href="/upload"
                  className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5 ${pathname === '/upload' ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </Link>
                <div className="h-4 w-px bg-border hidden sm:block"></div>
                <div className="text-sm font-medium text-foreground px-2">

                </div>
                <Link
                  href="/profile"
                  className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5 ${pathname === '/profile' ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <UserCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">{userName}'s Profile</span>
                </Link>
                <ThemeToggle />
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
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
