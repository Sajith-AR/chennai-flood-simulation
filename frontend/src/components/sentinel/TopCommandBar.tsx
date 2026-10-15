'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Clock,
  Radio,
  Plane,
  Activity,
  Layers,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Wifi,
  WifiOff,
  Maximize2,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { AIAdvisorData } from '@/lib/types';

interface TopCommandBarProps {
  isBackendLive: boolean;
  advisorData: AIAdvisorData | null;
  currentStepHour: number;
  alertCount?: number;
  onTriggerSiren: () => void;
  isSirenActive: boolean;
  onTriggerAirlift: () => void;
  onToggleClassicMode: () => void;
  isSimulating?: boolean;
  onOpenPipeline?: () => void;
}

export default function TopCommandBar({
  isBackendLive,
  advisorData,
  currentStepHour,
  alertCount = 3,
  onTriggerSiren,
  isSirenActive,
  onTriggerAirlift,
  onToggleClassicMode,
  isSimulating = false,
  onOpenPipeline,
}: TopCommandBarProps) {
  // Live Operational Clocks
  const [istTime, setIstTime] = useState<string>('');
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setIstTime(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }));
      setUtcTime(now.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false }));
    };
    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  const threatLevel = advisorData?.risk_radar_level?.includes('CRITICAL')
    ? 'DEFCON 1 // CRITICAL'
    : advisorData?.risk_radar_level?.includes('SEVERE')
    ? 'DEFCON 2 // SEVERE SURGE'
    : 'DEFCON 3 // ELEVATED MONITORING';

  const isCritical = threatLevel.includes('DEFCON 1');

  return (
    <header className="h-14 bg-[#070b14]/95 backdrop-blur-md border-b border-cyan-500/20 px-3 md:px-5 flex items-center justify-between z-30 select-none shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
      {/* Left: Sentinel Identity & Subtitle */}
      <div className="flex items-center gap-3.5">
        <div className="relative flex items-center justify-center">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-950 via-slate-900 to-slate-950 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-950 animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-sm tracking-[0.22em] text-white flex items-center gap-1.5">
              CHENNAI SENTINEL
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </span>
            <span className="hidden sm:inline-flex text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">
              MISSION OS v2.4
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
            <span>URBAN DISASTER INTELLIGENCE</span>
            <span className="text-cyan-500/60">•</span>
            <span className="text-cyan-400/90 font-semibold">GCC IFM-ROP</span>
          </div>
        </div>
      </div>

      {/* Center: Threat Classification & Synchronized Mission Clocks */}
      <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
        {/* Dynamic Threat Level */}
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-all ${
            isCritical
              ? 'bg-red-950/60 text-red-300 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse'
              : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isCritical ? 'bg-red-500 animate-ping' : 'bg-amber-400'
            }`}
          />
          <span className="font-bold tracking-wider">{threatLevel}</span>
        </div>

        {/* Synchronized Digital Clocks */}
        <div className="flex items-center gap-3 bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-800 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400">IST:</span>
            <strong className="text-white font-bold tracking-wider">{istTime || '14:30:00'}</strong>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">UTC:</span>
            <span className="text-slate-300 font-medium">{utcTime || '09:00:00'}</span>
          </div>
        </div>

        {/* Simulation Horizon Indicator */}
        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-800 text-slate-300">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400">HORIZON:</span>
          <span className="text-cyan-300 font-bold">
            {isSimulating ? (
              <span className="text-amber-400 animate-pulse">COMPUTING STEP...</span>
            ) : currentStepHour > 0 ? (
              `T+${currentStepHour}.0H`
            ) : (
              'T+0.0H (BASELINE)'
            )}
          </span>
        </div>
      </div>

      {/* Right: Telemetry Status, Helplines & Rapid Actions */}
      <div className="flex items-center gap-2.5 text-xs font-mono">
        {/* Backend Connectivity Status */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border ${
            isBackendLive
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
              : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
          }`}
          title={isBackendLive ? 'FastAPI Neural Network Solvers Active' : 'Local Standby Engine Active'}
        >
          {isBackendLive ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="hidden sm:inline font-bold tracking-wider text-[11px]">
            {isBackendLive ? 'API ONLINE (79 NODES)' : 'STANDBY'}
          </span>
        </div>

        {/* Active Incident Warning Count */}
        <div className="hidden xl:flex items-center gap-1.5 bg-red-950/50 text-red-300 border border-red-500/40 px-2.5 py-1 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="font-bold tracking-wider text-[11px]">{alertCount} ALERTS ACTIVE</span>
        </div>

        {/* Crisis Pipeline Quick Switcher */}
        {onOpenPipeline && (
          <button
            onClick={onOpenPipeline}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/60 text-purple-200 border border-purple-500/50 hover:bg-purple-900/70 hover:text-white hover:border-purple-400 font-bold text-[11px] tracking-wider transition-all shadow-[0_0_12px_rgba(168,85,247,0.25)]"
            title="Open AI-Driven Crisis Resource Intelligence & OR-Tools Pipeline"
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>CRISIS PIPELINE</span>
          </button>
        )}

        {/* Emergency Siren Klaxon Action */}
        <button
          onClick={onTriggerSiren}
          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] tracking-wider transition-all flex items-center gap-1.5 border ${
            isSirenActive
              ? 'bg-red-600 text-white border-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'
              : 'bg-red-950/40 text-red-300 border-red-800/60 hover:bg-red-900/50 hover:text-white'
          }`}
          title="Transmit evacuation alarm broadcast to cell towers"
        >
          <Radio className="w-3.5 h-3.5 text-red-400" />
          <span className="hidden md:inline">{isSirenActive ? 'SILENCE KLAXON' : 'ALERT KLAXON'}</span>
        </button>

        {/* Tactical Airlift Quick Dispatch */}
        <button
          onClick={onTriggerAirlift}
          className="px-2.5 py-1 rounded-lg font-bold text-[11px] tracking-wider transition-all flex items-center gap-1.5 bg-purple-950/50 text-purple-200 border border-purple-600/50 hover:bg-purple-900/60 hover:text-white hover:border-purple-400 shadow-sm"
          title="Deploy IAF Chetak search and rescue helicopter sortie"
        >
          <Plane className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">AIRLIFT SORTIE</span>
        </button>

        {/* Portal Switcher to Classic Municipal View */}
        <button
          onClick={onToggleClassicMode}
          className="px-2.5 py-1 rounded-lg font-sans font-medium text-[11px] tracking-normal transition-all flex items-center gap-1 bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white"
          title="Switch to Classic Municipal Administration Portal"
        >
          <ExternalLink className="w-3 h-3 text-cyan-400" />
          <span className="hidden sm:inline">Classic View</span>
        </button>
      </div>
    </header>
  );
}
