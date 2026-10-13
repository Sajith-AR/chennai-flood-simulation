'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  Waves,
  Users,
  Compass,
  ChevronUp,
  ChevronDown,
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Car,
  Eye,
  EyeOff,
  Flame,
} from 'lucide-react';
import { AIAdvisorData } from '@/lib/types';

interface FloatingWidgetsProps {
  metrics: {
    total_flooded_area_sq_km: number;
    total_affected_population: number;
    total_evacuated_population: number;
    unassigned_stranded_population: number;
    severed_roads_count: number;
    active_routes_count: number;
  };
  advisorData: AIAdvisorData | null;
  sheltersCount: number;
  shelterCapacityTotal: number;
  shelterOccupancyTotal: number;
  fieldTeamsCount: number;
  currentStepHour: number;
}

export default function FloatingWidgets({
  metrics,
  advisorData,
  sheltersCount,
  shelterCapacityTotal,
  shelterOccupancyTotal,
  fieldTeamsCount,
  currentStepHour,
}: FloatingWidgetsProps) {
  // Collapse toggles for individual widgets
  const [collapsedThreat, setCollapsedThreat] = useState(false);
  const [collapsedImpact, setCollapsedImpact] = useState(false);
  const [collapsedReadiness, setCollapsedReadiness] = useState(false);
  const [collapsedMobility, setCollapsedMobility] = useState(false);

  // Master visibility toggle
  const [isWidgetsVisible, setIsWidgetsVisible] = useState(true);

  if (!isWidgetsVisible) {
    return (
      <div className="absolute top-16 right-4 z-20">
        <button
          onClick={() => setIsWidgetsVisible(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#090e1c]/90 backdrop-blur-md border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-mono shadow-xl transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>SHOW TELEMETRY WIDGETS</span>
        </button>
      </div>
    );
  }

  const threatText = advisorData?.risk_radar_level || 'DEFCON 2 (SEVERE)';
  const isCriticalThreat = threatText.includes('CRITICAL');
  const radarScore = advisorData?.radar_score || 78;

  const evacPct = metrics.total_affected_population > 0
    ? Math.min(100, Math.round((metrics.total_evacuated_population / metrics.total_affected_population) * 100))
    : 72;

  const availableShelterSlots = Math.max(0, shelterCapacityTotal - shelterOccupancyTotal);

  return (
    <>
      {/* Quick Master Toggle Floating Action */}
      <div className="absolute top-14 right-3 z-20 pointer-events-auto">
        <button
          onClick={() => setIsWidgetsVisible(false)}
          className="p-1 rounded-lg bg-[#090e1c]/80 backdrop-blur-md border border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
          title="Hide floating widgets for clean map view"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* WIDGET 1 (Top Left): LIVE THREAT INDEX                                    */}
      {/* ========================================================================= */}
      <div className="absolute top-14 left-3 z-20 w-60 sm:w-64 pointer-events-auto">
        <div className="bg-[#080d1a]/90 backdrop-blur-md border border-cyan-500/25 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden transition-all">
          {/* Header */}
          <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 font-bold">
                Threat Classification
              </span>
            </div>
            <button
              onClick={() => setCollapsedThreat(!collapsedThreat)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              {collapsedThreat ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>

          {!collapsedThreat && (
            <div className="p-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">System Status</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    isCriticalThreat
                      ? 'bg-red-950 text-red-300 border-red-700'
                      : 'bg-amber-950 text-amber-300 border-amber-700'
                  }`}
                >
                  {threatText.split(' ')[0]} {threatText.split(' ')[1]}
                </span>
              </div>

              {/* Threat Severity Gauge Bar */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Risk Severity Score</span>
                  <span className="font-bold text-cyan-300">{radarScore}/100</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      radarScore > 75 ? 'bg-red-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${radarScore}%` }}
                  />
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                  Telemetry Freshness
                </span>
                <span className="text-slate-300">Live (1000ms)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WIDGET 2 (Top Right): FLOOD IMPACT                                        */}
      {/* ========================================================================= */}
      <div className="absolute top-14 sm:top-20 right-3 z-20 w-60 sm:w-64 pointer-events-auto hidden sm:block">
        <div className="bg-[#080d1a]/90 backdrop-blur-md border border-cyan-500/25 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden transition-all">
          {/* Header */}
          <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Waves className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 font-bold">
                Hydrological Impact
              </span>
            </div>
            <button
              onClick={() => setCollapsedImpact(!collapsedImpact)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              {collapsedImpact ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>

          {!collapsedImpact && (
            <div className="p-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Flooded Land Area</span>
                <span className="font-bold text-cyan-300 text-sm">
                  {metrics.total_flooded_area_sq_km.toFixed(1)} km²
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Affected Citizens</span>
                <span className="font-bold text-amber-300">
                  {metrics.total_affected_population.toLocaleString()}
                </span>
              </div>

              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Impacted Basin Wards</span>
                <span className="font-bold text-red-400">7 GCC Zones</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WIDGET 3 (Bottom Left): RESPONSE READINESS                                */}
      {/* ========================================================================= */}
      <div className="absolute bottom-24 left-3 z-20 w-60 sm:w-64 pointer-events-auto hidden md:block">
        <div className="bg-[#080d1a]/90 backdrop-blur-md border border-cyan-500/25 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden transition-all">
          {/* Header */}
          <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 font-bold">
                Civil Defense Readiness
              </span>
            </div>
            <button
              onClick={() => setCollapsedReadiness(!collapsedReadiness)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              {collapsedReadiness ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>

          {!collapsedReadiness && (
            <div className="p-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Active GCC Shelters</span>
                <span className="font-bold text-emerald-400">
                  {sheltersCount} Centers ({availableShelterSlots.toLocaleString()} slots)
                </span>
              </div>

              {/* Evac Progress */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Evacuated Citizens</span>
                  <span className="font-bold text-emerald-300">
                    {metrics.total_evacuated_population.toLocaleString()} ({evacPct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${evacPct}%` }}
                  />
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Active Rescue Teams</span>
                <span className="font-bold text-purple-300">{fieldTeamsCount} Air/Marine Bases</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WIDGET 4 (Bottom Right): MOBILITY INTELLIGENCE                            */}
      {/* ========================================================================= */}
      <div className="absolute bottom-24 right-3 z-20 w-60 sm:w-64 pointer-events-auto hidden md:block">
        <div className="bg-[#080d1a]/90 backdrop-blur-md border border-cyan-500/25 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden transition-all">
          {/* Header */}
          <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 font-bold">
                Mobility & Access Grid
              </span>
            </div>
            <button
              onClick={() => setCollapsedMobility(!collapsedMobility)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              {collapsedMobility ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>

          {!collapsedMobility && (
            <div className="p-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Severed Road Links</span>
                <span className="font-bold text-red-400">
                  {metrics.severed_roads_count} Impassable
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Clear Evac Corridors</span>
                <span className="font-bold text-emerald-400">
                  {metrics.active_routes_count} Corridors
                </span>
              </div>

              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Stranded In Pockets</span>
                <span className="font-bold text-amber-400">
                  {metrics.unassigned_stranded_population.toLocaleString()} Citizens
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
