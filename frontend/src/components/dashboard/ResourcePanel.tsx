'use client';

import React, { useState } from 'react';
import {
  InventoryStatus,
  ShelterEntity,
  DistributionPointEntity,
  ShelterAllocation,
} from '@/lib/types';
import {
  Droplets,
  Package,
  HeartPulse,
  ChevronRight,
  ChevronLeft,
  Warehouse,
  Tent,
  PlusCircle,
  Truck,
  BrainCircuit,
} from 'lucide-react';

interface ResourcePanelProps {
  inventory: InventoryStatus;
  shelters: ShelterEntity[];
  distributionPoints: DistributionPointEntity[];
  shelterAllocations: ShelterAllocation[];
  onOpenAllocateModal: (targetId: string, targetType: 'shelter' | 'point') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// SVG Circular Gauge Component
function GaugeRing({
  pct,
  color,
  icon,
  label,
  valueText,
}: {
  pct: number;
  color: string;
  icon: React.ReactNode;
  label: string;
  valueText: string;
}) {
  const circumference = 188.5; // 2 * PI * 30
  const offset = circumference * (1 - Math.min(100, pct) / 100);
  const strokeColor =
    color === 'cyan'
      ? 'stroke-cyan-400'
      : color === 'amber'
      ? 'stroke-amber-400'
      : 'stroke-red-400';
  const textColor =
    color === 'cyan'
      ? 'text-cyan-400'
      : color === 'amber'
      ? 'text-amber-400'
      : 'text-red-400';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[64px] h-[64px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="30"
            className="gauge-bg"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="32"
            cy="32"
            r="30"
            className={`gauge-ring ${strokeColor}`}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-bold font-mono ${textColor}`}>
            {Math.round(pct)}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[11px] font-medium text-slate-300 flex items-center justify-center gap-1">
          {icon}
          {label}
        </div>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
          {valueText}
        </div>
      </div>
    </div>
  );
}

export default function ResourcePanel({
  inventory,
  shelters,
  distributionPoints,
  shelterAllocations,
  onOpenAllocateModal,
  isCollapsed,
  onToggleCollapse,
}: ResourcePanelProps) {
  const [activeTab, setActiveTab] = useState<'shelters' | 'distribution'>('shelters');

  const waterPct = Math.round(
    (inventory.allocated_water_litres / (inventory.total_water_litres || 1)) * 100
  );
  const foodPct = Math.round(
    (inventory.allocated_food_rations / (inventory.total_food_rations || 1)) * 100
  );
  const medPct = Math.round(
    (inventory.allocated_medical_kits / (inventory.total_medical_kits || 1)) * 100
  );

  return (
    <div
      className={`relative mx-4 mb-4 lg:mx-0 lg:mb-0 lg:absolute lg:top-4 lg:right-4 lg:bottom-20 z-20 flex transition-all duration-300 ease-out pointer-events-none ${
        isCollapsed ? 'translate-x-[calc(100%-2.5rem)]' : 'translate-x-0'
      }`}
    >
      {/* Collapse/Expand Toggle Tab */}
      <div className="flex items-start pt-4 pointer-events-auto">
        <button
          onClick={onToggleCollapse}
          className="glass-panel hover:bg-slate-800/80 text-cyan-400 border-r-0 p-2 rounded-l-xl shadow-panel flex flex-col items-center gap-1.5 transition-all duration-200"
          title={isCollapsed ? 'Expand Resource Dashboard' : 'Collapse Resource Dashboard'}
        >
          {isCollapsed ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <span className="text-[9px] font-bold uppercase [writing-mode:vertical-lr] tracking-widest text-slate-400 mt-1">
            Resources
          </span>
        </button>
      </div>

      {/* Main Docked Sidebar Content */}
      <div className="w-full lg:w-80 xl:w-96 glass-panel-strong rounded-r-xl rounded-bl-xl p-4 shadow-panel-lg flex flex-col gap-4 overflow-hidden pointer-events-auto animate-slide-right">
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shadow-glow-amber">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 tracking-wide">
                Resource & Supply Chain
              </h2>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                Final-step inventory • <BrainCircuit className="w-3 h-3 text-fuchsia-400" /> Demand & Allocation
              </p>
            </div>
          </div>
        </div>

        {/* Circular Gauge Rings */}
        <div className="flex justify-around py-2">
          <GaugeRing
            pct={waterPct}
            color="cyan"
            icon={<Droplets className="w-3 h-3 text-cyan-400" />}
            label="Water"
            valueText={`${(inventory.available_water_litres / 1000).toFixed(0)}k avail`}
          />
          <GaugeRing
            pct={foodPct}
            color="amber"
            icon={<Package className="w-3 h-3 text-amber-400" />}
            label="Food"
            valueText={`${(inventory.available_food_rations / 1000).toFixed(0)}k avail`}
          />
          <GaugeRing
            pct={medPct}
            color="red"
            icon={<HeartPulse className="w-3 h-3 text-red-400" />}
            label="Medical"
            valueText={`${inventory.available_medical_kits.toLocaleString()} avail`}
          />
        </div>

        {/* Tab Navigation: Shelters vs Distribution Points */}
        <div className="flex border-b border-slate-800/50">
          <button
            onClick={() => setActiveTab('shelters')}
            className={`flex-1 pb-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-all duration-200 relative ${
              activeTab === 'shelters'
                ? 'text-cyan-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Warehouse className="w-3.5 h-3.5" />
            Shelters ({shelters.length})
            {activeTab === 'shelters' && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-cyan-500 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('distribution')}
            className={`flex-1 pb-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-all duration-200 relative ${
              activeTab === 'distribution'
                ? 'text-amber-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Tent className="w-3.5 h-3.5" />
            Distribution ({distributionPoints.length})
            {activeTab === 'distribution' && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-amber-500 rounded-t-full" />
            )}
          </button>
        </div>

        {/* List of Shelters or Distribution Points */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {activeTab === 'shelters' &&
            shelters.map((shelter) => {
              const alloc = shelterAllocations.find((sa) => sa.shelter_id === shelter.id);
              const totalAssigned = shelter.current_occupancy + (alloc?.allocated_evacuees || 0);
              const occPct = Math.min(100, Math.round((totalAssigned / shelter.capacity) * 100));

              return (
                <div
                  key={shelter.id}
                  className="bg-slate-800/30 hover:bg-slate-800/60 p-3 rounded-xl border border-slate-800/50 hover-lift transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-200 leading-tight truncate">
                        {shelter.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {shelter.neighborhood}
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenAllocateModal(shelter.id, 'shelter')}
                      className="p-1.5 bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-400 hover:text-cyan-300 rounded-lg border border-cyan-800/30 transition-all hover:scale-105"
                      title="Allocate Emergency Rations"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Capacity Bar */}
                  <div className="mt-2.5">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Occupancy</span>
                      <span className="font-mono font-semibold text-slate-300">
                        {totalAssigned.toLocaleString()} / {shelter.capacity.toLocaleString()} ({occPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          occPct >= 95
                            ? 'bg-gradient-to-r from-red-600 to-red-400'
                            : occPct >= 75
                            ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                            : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                        }`}
                        style={{ width: `${occPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

          {activeTab === 'distribution' &&
            distributionPoints.map((dp) => (
              <div
                key={dp.id}
                className="bg-slate-800/30 hover:bg-slate-800/60 p-3 rounded-xl border border-slate-800/50 hover-lift transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-amber-300 leading-tight truncate">
                      {dp.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {dp.target_ward}
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenAllocateModal(dp.id, 'point')}
                    className="p-1.5 bg-amber-950/50 hover:bg-amber-900/60 text-amber-400 hover:text-amber-300 rounded-lg border border-amber-800/30 transition-all hover:scale-105"
                    title="Dispatch Supplies"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {dp.demand.is_ai_predicted && (
                  <div className="mt-2 p-2 rounded-lg bg-slate-900/50 border border-fuchsia-500/20 shadow-inner">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <BrainCircuit className="w-3 h-3 text-fuchsia-400" />
                      <span className="text-[9px] font-bold text-fuchsia-300 uppercase tracking-wider">AI Demand Reasoning (SHAP)</span>
                    </div>
                    {dp.demand.ai_explanation && (
                      <div className="flex flex-col gap-1">
                        {dp.demand.ai_explanation.map((factor, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400 w-16 truncate">{factor.feature}</span>
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-fuchsia-500 rounded-full" style={{ width: `${factor.impact_pct}%` }} />
                            </div>
                            <span className="text-[9px] text-fuchsia-400/80 font-mono w-6 text-right">{Math.round(factor.impact_pct)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-2 flex gap-2 text-[10px]">
                  <span className="bg-slate-800/60 text-slate-400 px-2 py-1 rounded-md flex items-center gap-1 font-mono">
                    <Droplets className="w-3 h-3 text-cyan-400" />
                    {dp.demand.water_litres.toLocaleString()}L
                  </span>
                  <span className="bg-slate-800/60 text-slate-400 px-2 py-1 rounded-md flex items-center gap-1 font-mono">
                    <Package className="w-3 h-3 text-amber-400" />
                    {dp.demand.food_rations.toLocaleString()}
                  </span>
                  <span className="bg-slate-800/60 text-slate-400 px-2 py-1 rounded-md flex items-center gap-1 font-mono">
                    <HeartPulse className="w-3 h-3 text-red-400" />
                    {dp.demand.medical_kits}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
