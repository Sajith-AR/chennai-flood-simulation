'use client';

import React from 'react';
import {
  Layers,
  Waves,
  Footprints,
  Truck,
  Warehouse,
  Tent,
  Flame,
} from 'lucide-react';

interface LayerToggleProps {
  layers: {
    flood: boolean;
    evacuation: boolean;
    supply: boolean;
    shelters: boolean;
    warehouses: boolean;
    distributionPoints: boolean;
    populationHeatmap: boolean;
  };
  onToggleLayer: (layerName: keyof LayerToggleProps['layers']) => void;
}

export default function LayerToggle({ layers, onToggleLayer }: LayerToggleProps) {
  const layerDefs: {
    key: keyof LayerToggleProps['layers'];
    label: string;
    icon: React.ReactNode;
    colorClass: string;
    dotClass: string;
    glowClass: string;
  }[] = [
    {
      key: 'flood',
      label: 'Flood Inundation',
      icon: <Waves className="w-3.5 h-3.5" />,
      colorClass: 'text-cyan-400',
      dotClass: 'bg-cyan-400',
      glowClass: 'shadow-glow-cyan',
    },
    {
      key: 'evacuation',
      label: 'Evacuation Routes',
      icon: <Footprints className="w-3.5 h-3.5" />,
      colorClass: 'text-emerald-400',
      dotClass: 'bg-emerald-400',
      glowClass: 'shadow-glow-emerald',
    },
    {
      key: 'supply',
      label: 'Supply Logistics',
      icon: <Truck className="w-3.5 h-3.5" />,
      colorClass: 'text-orange-400',
      dotClass: 'bg-orange-400',
      glowClass: 'shadow-glow-orange',
    },
    {
      key: 'shelters',
      label: '12 Safe Shelters',
      icon: <Warehouse className="w-3.5 h-3.5" />,
      colorClass: 'text-blue-400',
      dotClass: 'bg-blue-400',
      glowClass: 'shadow-glow-blue',
    },
    {
      key: 'warehouses',
      label: '5 Supply Depots',
      icon: <Warehouse className="w-3.5 h-3.5" />,
      colorClass: 'text-indigo-400',
      dotClass: 'bg-indigo-400',
      glowClass: 'shadow-glow-indigo',
    },
    {
      key: 'distributionPoints',
      label: '10 Relief Points',
      icon: <Tent className="w-3.5 h-3.5" />,
      colorClass: 'text-amber-400',
      dotClass: 'bg-amber-400',
      glowClass: 'shadow-glow-amber',
    },
    {
      key: 'populationHeatmap',
      label: 'Ward Vulnerability Heatmap',
      icon: <Flame className="w-3.5 h-3.5" />,
      colorClass: 'text-red-400',
      dotClass: 'bg-red-400',
      glowClass: 'shadow-glow-red',
    },
  ];

  return (
    <div className="glass-panel animate-slide-up p-2.5 rounded-xl shadow-xl flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 px-1">
        <Layers className="w-3 h-3 text-cyan-400" />
        Map Layers
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar flex-nowrap">
        {layerDefs.map((l) => {
          const isActive = layers[l.key];
          return (
            <button
              key={l.key}
              onClick={() => onToggleLayer(l.key)}
              className={`group flex items-center gap-2 py-1.5 px-3 rounded-full text-xs font-medium border transition-all duration-300 ${
                isActive
                  ? 'bg-slate-800 text-slate-100 border-slate-700 shadow-md'
                  : 'bg-slate-900/40 text-slate-500 border-slate-800 hover:bg-slate-800/60'
              }`}
            >
              {/* Colored Dot Toggle indicator */}
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isActive ? `${l.dotClass} ${l.glowClass}` : 'bg-slate-600'
                }`}
              />
              <div className={`transition-colors ${isActive ? l.colorClass : 'text-slate-500 group-hover:text-slate-400'}`}>
                {l.icon}
              </div>
              <span className="text-[11px] whitespace-nowrap">{l.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
