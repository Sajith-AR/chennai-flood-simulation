'use client';

import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Layers,
  Crosshair,
  RotateCcw,
  Pencil,
  Circle as CircleIcon,
  Trash2,
  ChevronDown,
  Globe,
  Sliders,
  Check,
  Info,
} from 'lucide-react';
import { Coordinates } from '@/lib/types';
import { CHENNAI_CENTER } from '@/lib/constants';

interface MapToolbarProps {
  basemapType: 'dark' | 'satellite' | 'streets';
  onChangeBasemap: (type: 'dark' | 'satellite' | 'streets') => void;
  onFlyToLocation: (coords: Coordinates, zoom?: number) => void;
  onResetView: () => void;
  visibleLayers: {
    flood: boolean;
    evacuation: boolean;
    supply: boolean;
    shelters: boolean;
    warehouses: boolean;
    distributionPoints: boolean;
    populationHeatmap: boolean;
    incidents?: boolean;
  };
  onToggleLayer: (layerName: string) => void;
  activeDrawingMode: 'none' | 'circle' | 'polygon';
  onSetDrawingMode: (mode: 'none' | 'circle' | 'polygon') => void;
  onClearDrawing: () => void;
}

const SECTOR_LOCATIONS: { name: string; zone: string; coords: Coordinates; zoom: number }[] = [
  { name: 'Central Command HQ', zone: 'Zone 5', coords: CHENNAI_CENTER, zoom: 13 },
  { name: 'Velachery Low Basin', zone: 'Zone 13', coords: [12.975, 80.221], zoom: 14 },
  { name: 'Adyar River Mouth', zone: 'Zone 10', coords: [13.006, 80.257], zoom: 14 },
  { name: 'Tambaram South Node', zone: 'Suburban', coords: [12.923, 80.140], zoom: 14 },
  { name: 'Manali / Ennore Basin', zone: 'Zone 2', coords: [13.170, 80.260], zoom: 13 },
  { name: 'Perambur / Vyasarpadi', zone: 'Zone 4', coords: [13.114, 80.245], zoom: 14 },
  { name: 'Anna Nagar West', zone: 'Zone 8', coords: [13.085, 80.210], zoom: 14 },
  { name: 'Marina Coastal Strip', zone: 'Zone 9', coords: [13.050, 80.282], zoom: 14 },
];

export default function MapToolbar({
  basemapType,
  onChangeBasemap,
  onFlyToLocation,
  onResetView,
  visibleLayers,
  onToggleLayer,
  activeDrawingMode,
  onSetDrawingMode,
  onClearDrawing,
}: MapToolbarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBasemapOpen, setIsBasemapOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  return (
    <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
      {/* Left Control Cluster: Location Search & Basemap Selection */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Location Quick-Jump Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              setIsBasemapOpen(false);
              setIsLayersOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#080d1a]/90 backdrop-blur-md border border-cyan-500/30 text-xs font-mono text-slate-200 hover:text-white hover:border-cyan-400 shadow-xl transition-all"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Jump Sector</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isSearchOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-60 rounded-xl bg-[#080d1a]/95 backdrop-blur-md border border-cyan-500/30 p-2 shadow-2xl z-30 font-mono text-xs space-y-1">
              <div className="text-[10px] uppercase text-slate-400 font-bold px-2 py-1">
                Chennai Tactical Sectors
              </div>
              {SECTOR_LOCATIONS.map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => {
                    onFlyToLocation(loc.coords, loc.zoom);
                    setIsSearchOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 text-slate-300 flex items-center justify-between transition-colors"
                >
                  <span className="truncate">{loc.name}</span>
                  <span className="text-[9px] text-slate-500">{loc.zone}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Basemap Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setIsBasemapOpen(!isBasemapOpen);
              setIsSearchOpen(false);
              setIsLayersOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#080d1a]/90 backdrop-blur-md border border-cyan-500/30 text-xs font-mono text-slate-200 hover:text-white hover:border-cyan-400 shadow-xl transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline capitalize">
              {basemapType === 'dark' ? 'Sentinel Dark' : basemapType === 'satellite' ? 'Satellite Recon' : 'Vector Street'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isBasemapOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-48 rounded-xl bg-[#080d1a]/95 backdrop-blur-md border border-cyan-500/30 p-1.5 shadow-2xl z-30 font-mono text-xs space-y-1">
              {[
                { id: 'dark', label: 'Sentinel Dark', desc: 'CartoDB Dark Matter (High Res)' },
                { id: 'satellite', label: 'Satellite Recon', desc: 'ESRI World Ortho Imagery' },
                { id: 'streets', label: 'Vector Street', desc: 'CartoDB Voyager Vector' },
              ].map((map) => (
                <button
                  key={map.id}
                  onClick={() => {
                    onChangeBasemap(map.id as any);
                    setIsBasemapOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                    basemapType === map.id
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                      : 'hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-bold">{map.label}</div>
                    <div className="text-[9px] text-slate-500">{map.desc}</div>
                  </div>
                  {basemapType === map.id && <Check className="w-3 h-3 text-cyan-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Layer Visibility Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsLayersOpen(!isLayersOpen);
              setIsSearchOpen(false);
              setIsBasemapOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#080d1a]/90 backdrop-blur-md border border-cyan-500/30 text-xs font-mono text-slate-200 hover:text-white hover:border-cyan-400 shadow-xl transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden md:inline">GIS Overlays</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isLayersOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-56 rounded-xl bg-[#080d1a]/95 backdrop-blur-md border border-cyan-500/30 p-2 shadow-2xl z-30 font-mono text-xs space-y-1">
              <div className="text-[10px] uppercase text-slate-400 font-bold px-2 py-1">
                Toggle Map Layers
              </div>
              {[
                { id: 'flood', label: 'Flood Inundation' },
                { id: 'evacuation', label: 'Evacuation Corridors' },
                { id: 'supply', label: 'Relief Logistics Tracks' },
                { id: 'shelters', label: 'GCC Relief Shelters' },
                { id: 'warehouses', label: 'Strategic Warehouses' },
                { id: 'populationHeatmap', label: 'Population Risk Zones' },
                { id: 'incidents', label: 'Crisis Incidents (NLP Feed)' },
              ].map((layer) => {
                const isChecked = (visibleLayers as any)[layer.id];
                return (
                  <button
                    key={layer.id}
                    onClick={() => onToggleLayer(layer.id)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-900 text-slate-300 flex items-center justify-between transition-colors"
                  >
                    <span>{layer.label}</span>
                    <span
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                        isChecked
                          ? 'bg-cyan-600 border-cyan-400 text-white'
                          : 'border-slate-600'
                      }`}
                    >
                      {isChecked && <Check className="w-2.5 h-2.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Control Cluster: Map Reset, Drawing Tools, and Legend */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Interactive Drawing Mode Controls */}
        <div className="flex items-center gap-1 bg-[#080d1a]/90 backdrop-blur-md border border-cyan-500/30 rounded-xl p-1 shadow-xl">
          <button
            onClick={() => onSetDrawingMode(activeDrawingMode === 'circle' ? 'none' : 'circle')}
            className={`p-1.5 rounded-lg transition-colors ${
              activeDrawingMode === 'circle'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Delineate Circular Flood Surge Zone"
          >
            <CircleIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSetDrawingMode(activeDrawingMode === 'polygon' ? 'none' : 'polygon')}
            className={`p-1.5 rounded-lg transition-colors ${
              activeDrawingMode === 'polygon'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Delineate Custom Polygon Inundation Zone"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {activeDrawingMode !== 'none' && (
            <button
              onClick={onClearDrawing}
              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/60 transition-colors"
              title="Clear active drawing draft"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center / Reset View Button */}
        <button
          onClick={onResetView}
          className="p-2 rounded-xl bg-[#080d1a]/90 backdrop-blur-md border border-cyan-500/30 text-slate-300 hover:text-white hover:border-cyan-400 shadow-xl transition-all"
          title="Reset map view to Chennai Metropolitan Center"
        >
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
        </button>

        {/* Compact Depth Legend Toggle */}
        <div className="relative">
          <button
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#080d1a]/90 backdrop-blur-md border border-cyan-500/30 text-xs font-mono text-slate-300 hover:text-white shadow-xl transition-all"
          >
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Legend</span>
          </button>

          {isLegendOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-52 rounded-xl bg-[#080d1a]/95 backdrop-blur-md border border-cyan-500/30 p-2.5 shadow-2xl z-30 font-mono text-xs space-y-2">
              <div className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-800 pb-1">
                Inundation Water Depth
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-blue-500/50 border border-blue-400" />
                  <span className="text-slate-300">0.1m – 0.5m (Moderate)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-amber-500/60 border border-amber-400" />
                  <span className="text-slate-300">0.5m – 1.0m (Serious)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-red-600/70 border border-red-500" />
                  <span className="text-slate-300">&gt; 1.0m (Severe / Impassable)</span>
                </div>
              </div>
              <div className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-800 pt-1 pb-1">
                Operations Legend
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">GCC Safe Shelter</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-slate-300">Strategic Supply Depot</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="text-slate-300">IAF / Marine Rescue Base</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
