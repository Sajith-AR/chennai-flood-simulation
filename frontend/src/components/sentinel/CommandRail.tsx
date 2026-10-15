'use client';

import React from 'react';
import {
  LayoutDashboard,
  Compass,
  SlidersHorizontal,
  Waves,
  Building2,
  Package,
  Users,
  Radio,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Cpu,
} from 'lucide-react';

export type SentinelTool =
  | 'overview'
  | 'map'
  | 'pipeline'
  | 'simulation'
  | 'flood'
  | 'shelters'
  | 'logistics'
  | 'field-teams'
  | 'dispatch'
  | 'layers';

interface CommandRailProps {
  activeTool: SentinelTool;
  onSelectTool: (tool: SentinelTool) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  shelterCount?: number;
  warehouseCount?: number;
  teamsCount?: number;
}

export default function CommandRail({
  activeTool,
  onSelectTool,
  isExpanded,
  onToggleExpand,
  shelterCount = 12,
  warehouseCount = 5,
  teamsCount = 4,
}: CommandRailProps) {
  const NAV_ITEMS: {
    id: SentinelTool;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'pipeline',
      label: 'Crisis Intelligence',
      sublabel: 'NLP, Forecast & OR-Tools',
      icon: Cpu,
      badge: 'AI OR-TOOLS',
      badgeColor: 'bg-purple-950 text-purple-300 border-purple-700',
    },
    {
      id: 'overview',
      label: 'Situation Report',
      sublabel: 'Executive Brief & Feed',
      icon: LayoutDashboard,
      badge: 'LIVE',
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
    },
    {
      id: 'map',
      label: 'Geospatial Canvas',
      sublabel: 'Full-Screen GIS View',
      icon: Compass,
    },
    {
      id: 'simulation',
      label: 'Simulation Engine',
      sublabel: 'Hydrology & Presets',
      icon: SlidersHorizontal,
      badge: '4 Presets',
      badgeColor: 'bg-blue-950 text-blue-300 border-blue-700',
    },
    {
      id: 'flood',
      label: 'Flood & Wards Risk',
      sublabel: '15 GCC Zones Matrix',
      icon: Waves,
    },
    {
      id: 'shelters',
      label: 'Relief Shelters',
      sublabel: '12 Municipal Centers',
      icon: Building2,
      badge: shelterCount,
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
    },
    {
      id: 'logistics',
      label: 'Relief Logistics',
      sublabel: '5 Strategic Depots',
      icon: Package,
      badge: warehouseCount,
      badgeColor: 'bg-teal-950 text-teal-300 border-teal-700',
    },
    {
      id: 'field-teams',
      label: 'Rescue Field Teams',
      sublabel: 'IAF & Marine Amphibious',
      icon: Users,
      badge: teamsCount,
      badgeColor: 'bg-purple-950 text-purple-300 border-purple-700',
    },
    {
      id: 'dispatch',
      label: 'Emergency Dispatch',
      sublabel: 'Bilingual Audio & SMS',
      icon: Radio,
    },
    {
      id: 'layers',
      label: 'Cartographic Layers',
      sublabel: 'Overlays & Basemap',
      icon: Layers,
    },
  ];

  return (
    <aside
      className={`bg-[#070b14]/95 backdrop-blur-md border-r border-cyan-500/15 flex flex-col justify-between transition-all duration-300 z-20 select-none shadow-[4px_0_24px_rgba(0,0,0,0.5)] ${
        isExpanded ? 'w-60' : 'w-14'
      }`}
    >
      {/* Top Rail Navigation Items */}
      <div className="py-2.5 flex flex-col gap-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTool === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTool(item.id)}
              className={`relative mx-1.5 px-2.5 py-2.5 rounded-xl flex items-center gap-3 transition-all group ${
                isActive
                  ? 'bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
              title={!isExpanded ? `${item.label} (${item.sublabel})` : undefined}
            >
              {/* Active Marker Indicator Glow */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              )}

              <div className="relative flex items-center justify-center flex-shrink-0 w-6 h-6">
                <Icon
                  className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
              </div>

              {/* Expanded Label & Details */}
              {isExpanded && (
                <div className="flex-1 text-left min-w-0 flex items-center justify-between">
                  <div className="truncate">
                    <div
                      className={`text-xs font-semibold tracking-wide truncate ${
                        isActive ? 'text-white' : 'text-slate-300'
                      }`}
                    >
                      {item.label}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      {item.sublabel}
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ml-1 flex-shrink-0 ${
                        item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Rail Controls: Expand Toggle & Mission Version */}
      <div className="p-2 border-t border-slate-800/80 flex flex-col gap-1.5 bg-[#05080f]/80">
        <button
          onClick={onToggleExpand}
          className="w-full h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          title={isExpanded ? 'Collapse Command Rail' : 'Expand Command Rail'}
        >
          {isExpanded ? (
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <ChevronLeft className="w-4 h-4" />
              <span>COLLAPSE RAIL</span>
            </div>
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {isExpanded && (
          <div className="px-2 py-1 text-[10px] font-mono text-slate-500 flex items-center justify-between border-t border-slate-800/60 pt-2">
            <span>GCC SENTINEL</span>
            <span className="text-cyan-400 font-bold">SECURE // LIVE</span>
          </div>
        )}
      </div>
    </aside>
  );
}
