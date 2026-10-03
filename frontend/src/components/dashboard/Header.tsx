'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Server,
  Clock,
  Radio,
  Brain,
  Volume2,
  VolumeX,
  Plane,
  Activity,
  Radar,
  Satellite,
} from 'lucide-react';

interface HeaderProps {
  isBackendLive: boolean;
  activeTimeStep: number;
  threatLevel?: 'DEFCON 1' | 'DEFCON 2' | 'DEFCON 3' | 'DEFCON 4';
  onToggleAIAdvisor?: () => void;
  isAIAdvisorOpen?: boolean;
  onTriggerSiren?: () => void;
  isSirenActive?: boolean;
  onTriggerAirlift?: () => void;
}

export default function Header({
  isBackendLive,
  activeTimeStep,
  threatLevel = 'DEFCON 1',
  onToggleAIAdvisor,
  isAIAdvisorOpen = false,
  onTriggerSiren,
  isSirenActive = false,
  onTriggerAirlift,
}: HeaderProps) {
  const [istTime, setIstTime] = useState<string>('');
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setIstTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setUtcTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'UTC',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 glass-panel-strong border-b border-cyan-500/20 px-3 md:px-6 flex items-center justify-between z-30 relative select-none shadow-2xl backdrop-blur-2xl">
      {/* 1. Title & GCC Command Center Insignia */}
      <div className="flex items-center gap-3 md:gap-4 animate-fade-in">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-950 border border-cyan-300 shadow-glow-cyan text-slate-950 font-black flex-shrink-0">
          <ShieldAlert className="w-5 h-5 text-slate-950" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-base font-extrabold tracking-wider text-slate-100 uppercase drop-shadow-md">
              Chennai Disaster Response Operations Center
            </h1>
            <span className="hidden sm:inline-flex text-[10px] font-mono font-bold bg-cyan-950/90 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-md shadow-glow-cyan">
              GCC-EOC • WAR ROOM
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] md:text-[11px] text-slate-400 font-mono mt-0.5">
            <span className="text-cyan-400 font-semibold">TNEOC Joint Task Force</span>
            <span>•</span>
            <span className="hidden md:inline">NDRF 4th Bn Arakkonam</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden lg:inline">IAF Tambaram Air Base</span>
          </div>
        </div>
      </div>

      {/* 2. Center Telemetry: Elapsed Simulation Time & Threat Condition */}
      <div className="hidden xl:flex items-center gap-4 animate-scale-in">
        <div className="flex items-center gap-2.5 bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-700/60 shadow-inner">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-glow-cyan" />
          <span className="font-mono text-slate-300 text-xs">
            SIMULATION STEP:{' '}
            <b className="text-cyan-300 text-sm ml-1">T+{activeTimeStep.toString().padStart(2, '0')}:00:00</b>
          </span>
        </div>

        <div className="flex items-center gap-2 bg-red-950/60 px-3.5 py-1.5 rounded-full border border-red-700/60 shadow-glow-red">
          <Activity className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span className="text-xs font-mono font-black text-red-300 uppercase tracking-wider">
            {threatLevel} : CRITICAL FLOOD SURGE
          </span>
        </div>
      </div>

      {/* 3. Right Tactical Action Bar: Clock, AI Advisor, Siren & Backend Status */}
      <div className="flex items-center gap-2 md:gap-3 animate-slide-right">
        {/* Dual Clocks (IST / UTC) */}
        <div className="hidden lg:flex flex-col items-end text-[11px] font-mono bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-200">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span className="font-bold">{istTime || '00:00:00'} IST</span>
          </div>
          <span className="text-[9px] text-slate-400">{utcTime || '00:00:00'} UTC</span>
        </div>

        {/* Citizen Evacuation Siren Simulator Button */}
        {onTriggerSiren && (
          <button
            onClick={onTriggerSiren}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-mono font-bold transition-all duration-200 ${
              isSirenActive
                ? 'bg-red-600 border-red-400 text-white shadow-glow-red animate-pulse'
                : 'bg-slate-900/80 hover:bg-red-950/50 border-red-800/60 text-red-300 hover:border-red-500'
            }`}
            title="Toggle Citizen Evacuation Siren Audio Alert & Warning Vignette"
          >
            {isSirenActive ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-red-400" />}
            <span className="hidden sm:inline">
              {isSirenActive ? 'Siren Active' : 'Sound Siren'}
            </span>
          </button>
        )}

        {/* Tactical AI Advisor Toggle */}
        {onToggleAIAdvisor && (
          <button
            onClick={onToggleAIAdvisor}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-mono font-bold transition-all duration-200 ${
              isAIAdvisorOpen
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-glow-cyan'
                : 'bg-slate-900/80 hover:bg-slate-800 border-cyan-700/60 text-cyan-300 hover:shadow-glow-cyan'
            }`}
            title="Toggle Tactical AI Advisor HUD"
          >
            <Brain className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">AI Advisor</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
          </button>
        )}

        {/* Backend Connection Status Pill */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-mono font-semibold transition-all duration-300 ${
            isBackendLive
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 shadow-glow-emerald'
              : 'bg-slate-900/60 text-slate-400 border-slate-700/60'
          }`}
          title={isBackendLive ? 'Telemetry Synced with FastAPI Backend' : 'Offline Mode (Local Synthetic Engine Active)'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <Server className="w-3 h-3 hidden sm:inline" />
          <span className="hidden sm:inline">{isBackendLive ? 'Live' : 'Standby'}</span>
        </div>
      </div>
    </header>
  );
}
