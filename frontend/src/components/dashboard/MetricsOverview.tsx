'use client';

import React from 'react';
import { TimelineStep } from '@/lib/types';
import {
  Waves,
  Users,
  Footprints,
  AlertOctagon,
  Ban,
  Warehouse,
  ShieldCheck,
  Plane,
  Anchor,
  Truck,
  Flame,
  Activity,
} from 'lucide-react';

interface MetricsOverviewProps {
  currentStep: TimelineStep | null;
}

export default function MetricsOverview({ currentStep }: MetricsOverviewProps) {
  if (!currentStep) return null;

  const metrics = currentStep.metrics;
  const fullShelters = currentStep.shelter_allocations.filter(
    (s) => s.status === 'full' || s.status === 'compromised'
  ).length;
  const activeShelters = currentStep.shelter_allocations.length;
  const totalShelterCapacity = currentStep.shelter_allocations.reduce(
    (sum, s) => sum + s.total_capacity,
    0
  );
  const totalOccupancy = currentStep.shelter_allocations.reduce(
    (sum, s) => sum + s.current_occupancy + s.allocated_evacuees,
    0
  );
  const occupancyPct = totalShelterCapacity > 0
    ? Math.min(100, Math.round((totalOccupancy / totalShelterCapacity) * 100))
    : 42;

  const evacProgressPct = metrics.total_affected_population > 0
    ? Math.min(100, Math.round((metrics.total_evacuated_population / metrics.total_affected_population) * 100))
    : 65;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 animate-slide-up select-none">
      {/* 1. Flooded Surface Area */}
      <div className="glass-panel-strong hover-lift p-3 rounded-xl border border-cyan-500/30 flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-12 h-12 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-500/15 text-cyan-400 rounded-lg border border-cyan-500/30 shadow-glow-cyan">
              <Waves className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-slate-300 font-mono uppercase tracking-wider">
              Flood Extent
            </span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        </div>
        <div className="mt-2">
          <div className="text-base sm:text-lg font-mono font-extrabold text-cyan-300 leading-tight">
            {metrics.total_flooded_area_sq_km} <span className="text-xs font-normal text-slate-400">km²</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-cyan-400/80">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Water Table Surging</span>
          </div>
        </div>
      </div>

      {/* 2. Citizens at Immediate Risk */}
      <div className="glass-panel-strong hover-lift p-3 rounded-xl border border-amber-500/30 flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-12 h-12 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded-lg border border-amber-500/30 shadow-glow-amber">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-slate-300 font-mono uppercase tracking-wider">
              At-Risk Pop
            </span>
          </div>
          <span className="text-[9px] font-mono text-amber-400 font-bold bg-amber-950/80 px-1 rounded border border-amber-800">
            SURGE
          </span>
        </div>
        <div className="mt-2">
          <div className="text-base sm:text-lg font-mono font-extrabold text-amber-300 leading-tight">
            {metrics.total_affected_population.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-amber-400/80">
            <span>Inundation Zone Inhabitants</span>
          </div>
        </div>
      </div>

      {/* 3. Relocated to High Ground */}
      <div className="glass-panel-strong hover-lift p-3 rounded-xl border border-emerald-500/30 flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-12 h-12 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/15 text-emerald-400 rounded-lg border border-emerald-500/30 shadow-glow-emerald">
              <Footprints className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-slate-300 font-mono uppercase tracking-wider">
              Safe Evacuated
            </span>
          </div>
          <span className="text-[9px] font-mono text-emerald-400 font-bold">
            {evacProgressPct}%
          </span>
        </div>
        <div className="mt-2">
          <div className="text-base sm:text-lg font-mono font-extrabold text-emerald-300 leading-tight">
            {metrics.total_evacuated_population.toLocaleString()}
          </div>
          {/* Micro progress bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${evacProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Critical Stranded Requiring Airlift / Amphibious Rescue */}
      <div className="glass-panel-strong hover-lift p-3 rounded-xl border border-red-500/40 flex flex-col justify-between relative overflow-hidden group shadow-glow-red">
        <div className="absolute -right-4 -top-4 w-12 h-12 bg-red-500/15 rounded-full blur-xl group-hover:bg-red-500/30 transition-all" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-500/20 text-red-400 rounded-lg border border-red-500/40">
              <AlertOctagon className="w-4 h-4 animate-pulse" />
            </div>
            <span className="text-[10px] text-slate-300 font-mono uppercase tracking-wider">
              Airlift / Stranded
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
        </div>
        <div className="mt-2">
          <div className="text-base sm:text-lg font-mono font-extrabold text-red-400 leading-tight">
            {metrics.unassigned_stranded_population.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-red-300/80">
            <Plane className="w-3 h-3 text-red-400" />
            <span>IAF Chetak Rescue Priority</span>
          </div>
        </div>
      </div>

      {/* 5. Submerged Arterials & Severed Bridges */}
      <div className="glass-panel-strong hover-lift p-3 rounded-xl border border-purple-500/30 flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-12 h-12 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/15 text-purple-400 rounded-lg border border-purple-500/30 shadow-glow-purple">
              <Ban className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-slate-300 font-mono uppercase tracking-wider">
              Severed Arterials
            </span>
          </div>
          <span className="text-[9px] font-mono text-purple-400 font-bold">
            BLOCKED
          </span>
        </div>
        <div className="mt-2">
          <div className="text-base sm:text-lg font-mono font-extrabold text-purple-300 leading-tight">
            {metrics.severed_roads_count} <span className="text-xs font-normal text-slate-400">corridors</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-purple-400/80">
            <span>Kathipara & Saidapet Choke</span>
          </div>
        </div>
      </div>

      {/* 6. Safe Haven Shelter Load */}
      <div className="glass-panel-strong hover-lift p-3 rounded-xl border border-blue-500/30 flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-12 h-12 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/15 text-blue-400 rounded-lg border border-blue-500/30 shadow-glow-blue">
              <Warehouse className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-slate-300 font-mono uppercase tracking-wider">
              Shelter Haven Load
            </span>
          </div>
          <span className="text-[9px] font-mono text-blue-300 font-bold">
            {occupancyPct}%
          </span>
        </div>
        <div className="mt-2">
          <div className="text-base sm:text-lg font-mono font-extrabold text-blue-300 leading-tight">
            {activeShelters - fullShelters} / {activeShelters} <span className="text-xs font-normal text-slate-400">open</span>
          </div>
          {/* Micro progress bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                occupancyPct > 85 ? 'bg-red-400' : occupancyPct > 65 ? 'bg-amber-400' : 'bg-blue-400'
              }`}
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 7. Multi-Modal Taskforce Fleet Status */}
      <div className="glass-panel-strong hover-lift p-3 rounded-xl border border-cyan-400/40 flex flex-col justify-between relative overflow-hidden group shadow-glow-cyan">
        <div className="absolute -right-4 -top-4 w-12 h-12 bg-cyan-400/15 rounded-full blur-xl group-hover:bg-cyan-400/30 transition-all" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg border border-cyan-400/40">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-slate-300 font-mono uppercase tracking-wider">
              Fleet Readiness
            </span>
          </div>
          <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-1 rounded border border-emerald-800">
            READY
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs font-mono text-slate-200">
          <div className="flex items-center gap-1" title="High-Clearance 6x6 Trucks">
            <Truck className="w-3.5 h-3.5 text-amber-400" />
            <span>18</span>
          </div>
          <div className="flex items-center gap-1" title="NDRF Gemini Amphibious Crafts">
            <Anchor className="w-3.5 h-3.5 text-cyan-400" />
            <span>24</span>
          </div>
          <div className="flex items-center gap-1" title="IAF Chetak Rescue Sorties">
            <Plane className="w-3.5 h-3.5 text-purple-400" />
            <span>8</span>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[9px] font-mono text-cyan-400/90">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Joint Tri-Service Response</span>
        </div>
      </div>
    </div>
  );
}
