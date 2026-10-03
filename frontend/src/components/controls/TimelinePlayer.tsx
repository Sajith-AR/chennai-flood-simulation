'use client';

import React, { useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  Zap,
} from 'lucide-react';

interface TimelinePlayerProps {
  totalSteps: number;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number; // 1 or 2
  onSpeedChange: (speed: number) => void;
  stepDescription?: string;
}

export default function TimelinePlayer({
  totalSteps,
  currentStepIndex,
  onStepChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onSpeedChange,
  stepDescription,
}: TimelinePlayerProps) {
  // Autoplay ticker effect
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = playbackSpeed === 2 ? 650 : 1300;
    const timer = setInterval(() => {
      if (currentStepIndex >= totalSteps - 1) {
        onTogglePlay(); // auto-pause at end
      } else {
        onStepChange(currentStepIndex + 1);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, currentStepIndex, totalSteps, playbackSpeed, onStepChange, onTogglePlay]);

  const handlePrev = () => {
    onStepChange(Math.max(0, currentStepIndex - 1));
  };

  const handleNext = () => {
    onStepChange(Math.min(totalSteps - 1, currentStepIndex + 1));
  };

  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col gap-4 text-slate-200">
      {/* Upper Status Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20 shadow-glow-cyan">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Simulation Timeline
          </span>
          {isPlaying && (
            <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-1 rounded-md border border-emerald-800 shadow-[0_0_10px_rgba(52,211,153,0.3)] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE PLAYBACK
            </span>
          )}
        </div>

        {/* Current Time Display Badge & Speed Toggle */}
        <div className="flex items-center gap-4">
          {/* Speed Toggle */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-full border border-slate-700">
            <button
              onClick={() => onSpeedChange(1)}
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
                playbackSpeed === 1
                  ? 'bg-amber-500/20 text-amber-300 shadow-glow-amber'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1×
            </button>
            <button
              onClick={() => onSpeedChange(2)}
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
                playbackSpeed === 2
                  ? 'bg-amber-500/20 text-amber-300 shadow-glow-amber'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2×
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col text-right bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 shadow-inner">
              <span className="text-base font-mono font-extrabold text-cyan-300">
                Hour {currentStepIndex}:00
              </span>
              <span className="text-[10px] text-slate-400 font-mono -mt-1">
                t = {currentStepIndex} / {totalSteps - 1}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Playback Bar (Play, Prev, Next, Timeline) */}
      <div className="flex items-center gap-4">
        {/* Step Prev Button */}
        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-700 transition-colors hover-lift"
          title="Previous Step"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        {/* Play / Pause Toggle Button */}
        <div className="relative">
          {isPlaying && (
            <div className="absolute inset-0 rounded-full animate-pulse-glow bg-cyan-400/20" />
          )}
          <button
            onClick={onTogglePlay}
            className="w-12 h-12 flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 rounded-full shadow-glow-cyan transition-transform active:scale-95 relative z-10"
            title={isPlaying ? 'Pause simulation' : 'Play simulation'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-slate-950" />
            ) : (
              <Play className="w-5 h-5 fill-slate-950 ml-1" />
            )}
          </button>
        </div>

        {/* Step Next Button */}
        <button
          onClick={handleNext}
          disabled={currentStepIndex === totalSteps - 1}
          className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-700 transition-colors hover-lift"
          title="Next Step"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        {/* Interactive Segmented Timeline */}
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center h-4 gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const isPast = i < currentStepIndex;
              const isCurrent = i === currentStepIndex;
              
              return (
                <div
                  key={i}
                  onClick={() => onStepChange(i)}
                  className="flex-1 h-full cursor-pointer group flex items-center"
                >
                  <div
                    className={`h-2 w-full rounded-full transition-all duration-300 group-hover:h-3 ${
                      isCurrent
                        ? 'bg-cyan-400 shadow-glow-cyan h-3'
                        : isPast
                        ? 'bg-cyan-500'
                        : 'bg-slate-700'
                    }`}
                  />
                </div>
              );
            })}
          </div>
          <div className="justify-between text-[10px] text-slate-500 font-mono px-1 hidden sm:flex">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`cursor-pointer transition-colors ${
                  i === currentStepIndex
                    ? 'text-cyan-400 font-bold'
                    : 'hover:text-slate-300'
                }`}
                onClick={() => onStepChange(i)}
              >
                H{i}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Spatio-temporal state description */}
      {stepDescription && (
        <div className="mt-2 text-xs text-slate-300 bg-slate-800/40 px-3 py-2 rounded-lg border-l-2 border-cyan-500 border-y border-r border-slate-800/80 shadow-inner">
          {stepDescription}
        </div>
      )}
    </div>
  );
}
