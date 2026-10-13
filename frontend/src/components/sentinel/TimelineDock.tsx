'use client';

import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Clock,
  Waves,
  Users,
} from 'lucide-react';
import { TimelineStep } from '@/lib/types';

interface TimelineDockProps {
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  timelineSteps: TimelineStep[];
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

export default function TimelineDock({
  currentStepIndex,
  onStepChange,
  timelineSteps,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onSpeedChange,
  onReset,
}: TimelineDockProps) {
  const stepsCount = Math.max(1, timelineSteps.length);
  const currentStep = timelineSteps[currentStepIndex] || null;

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      onStepChange(currentStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < stepsCount - 1) {
      onStepChange(currentStepIndex + 1);
    }
  };

  const floodedArea = currentStep?.metrics?.total_flooded_area_sq_km || 18.4;
  const evacuatedCount = currentStep?.metrics?.total_evacuated_population || 92400;

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl z-20 pointer-events-auto">
      <div className="bg-[#080d1a]/95 backdrop-blur-md border border-cyan-500/25 rounded-2xl p-2.5 px-4 shadow-[0_8px_32px_rgba(0,0,0,0.7)] flex flex-col md:flex-row items-center justify-between gap-3 font-mono">
        {/* Left: Playback Transport Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset Simulation to T+0h Baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Previous Time Step (T-1h)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onTogglePlay}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>PLAY</span>
              </>
            )}
          </button>
          <button
            onClick={handleNext}
            disabled={currentStepIndex >= stepsCount - 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Next Time Step (T+1h)"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Speed Toggles */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 ml-1">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => onSpeedChange(spd)}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  playbackSpeed === spd
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Center: Interactive Scrubber Timeline */}
        <div className="flex-1 w-full flex flex-col justify-center px-2">
          {/* Timeline stage track */}
          <div className="relative flex items-center justify-between w-full h-5">
            {/* Connecting baseline line */}
            <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-1 bg-slate-800 rounded-full" />

            {/* Elapsed progress highlight line */}
            <div
              className="absolute left-2 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-300"
              style={{
                width: stepsCount > 1 ? `${(currentStepIndex / (stepsCount - 1)) * 96}%` : '0%',
              }}
            />

            {/* Clickable Step Nodes */}
            {timelineSteps.map((step, idx) => {
              const isSelected = currentStepIndex === idx;
              const isPassed = idx <= currentStepIndex;

              return (
                <button
                  key={step.time_step}
                  onClick={() => onStepChange(idx)}
                  className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
                  title={`Stage T+${step.hour}h: Inundation Progression`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                      isSelected
                        ? 'bg-cyan-400 border-white shadow-[0_0_10px_#22d3ee] scale-125'
                        : isPassed
                        ? 'bg-cyan-900 border-cyan-500'
                        : 'bg-slate-900 border-slate-700 group-hover:border-slate-500'
                    }`}
                  >
                    {isSelected && <span className="w-1 h-1 rounded-full bg-slate-950" />}
                  </span>
                  <span
                    className={`text-[9px] mt-1 tracking-wider ${
                      isSelected
                        ? 'text-cyan-300 font-bold'
                        : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  >
                    T+{step.hour}h
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Stage Status & Quick Metric Badges */}
        <div className="hidden lg:flex items-center gap-3 text-xs border-l border-slate-800 pl-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Waves className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400 text-[10px]">INUNDATED:</span>
            <span className="font-bold text-cyan-300 text-xs">{floodedArea.toFixed(1)} km²</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400 text-[10px]">EVACUATED:</span>
            <span className="font-bold text-emerald-300 text-xs">{evacuatedCount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
