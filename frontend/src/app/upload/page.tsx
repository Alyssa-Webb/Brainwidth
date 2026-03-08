"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, UploadCloud, FileText, CheckCircle2, X } from "lucide-react";

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const pdfs = newFiles.filter(f => f.type === "application/pdf" || f.name.endsWith('.pdf'));
    setFiles(prev => [...prev, ...pdfs]);
  };

  const removeFile = (name: string) => {
    setFiles(files.filter(f => f.name !== name));
  };

  const processUploads = () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    // Mock processing time before redirecting
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 bg-background transition-colors duration-300 relative overflow-hidden">
      <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 mix-blend-multiply filter blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-500/20 mix-blend-multiply filter blur-[100px] pointer-events-none" />

      <div className="w-full max-w-3xl bg-card text-card-foreground rounded-3xl border border-border shadow-2xl p-8 sm:p-12 z-10 glassmorphism relative">
        <Link href="/quiz" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quiz
        </Link>
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4">Upload your Syllabi</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Drag and drop your course syllabi (PDFs). Brainwidth's AI will automatically extract your assignments and compute their cognitive load.
          </p>
        </div>

        <form onDragEnter={handleDrag} onSubmit={(e) => e.preventDefault()} className="max-w-xl mx-auto">
          {/* File Dropzone */}
          <div 
            className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl transition-all ${
              dragActive ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-border bg-muted/50 hover:bg-muted/80'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              multiple 
              accept="application/pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              onChange={handleChange}
            />
            <div className="flex flex-col items-center justify-center text-center p-6 pb-6 mt-2 pointer-events-none z-0">
              <UploadCloud className={`w-12 h-12 mb-4 transition-colors ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="mb-2 text-lg font-semibold">
                <span className="text-primary font-bold">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-muted-foreground">PDFs only (Max 10MB per file)</p>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-8 space-y-3 animate-fade-in">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ready to Process</h3>
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-background border border-border rounded-xl shadow-sm group">
                  <div className="flex items-center space-x-4 overflow-hidden">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFile(file.name)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Action Button */}
          <div className="mt-8">
            <button
              onClick={processUploads}
              disabled={files.length === 0 || isProcessing}
              className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 h-14 text-lg font-bold transition-all shadow-lg ${
                files.length === 0 
                  ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                  : isProcessing
                    ? 'bg-primary/80 text-primary-foreground cursor-wait'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] shadow-primary/20'
              }`}
            >
              {isProcessing ? (
                <>
                  <UploadCloud className="w-5 h-5 animate-bounce" />
                  Extracting assignments & load...
                </>
              ) : (
                <>
                  Process {files.length} {files.length === 1 ? 'Syllabus' : 'Syllabi'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <div className="text-center mt-4">
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Skip for now and go to Dashboard
              </Link>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
