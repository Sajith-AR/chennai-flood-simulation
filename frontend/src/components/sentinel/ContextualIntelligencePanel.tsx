'use client';

import React, { useState } from 'react';
import {
  X,
  Building2,
  Package,
  Truck,
  Waves,
  SlidersHorizontal,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Plane,
  Users,
  Compass,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Shield,
  Activity,
  Droplets,
  HeartPulse,
  Heart,
  Loader2,
  Info,
  Layers,
  MapPin,
} from 'lucide-react';
import {
  ShelterEntity,
  WarehouseEntity,
  DistributionPointEntity,
  StagingBaseEntity,
  DisasterParameters,
  PresetScenario,
  InventoryStatus,
  AIAdvisorData,
  TimelineStep,
  RouteInspectionData,
  Coordinates,
} from '@/lib/types';
import { HISTORICAL_PRESETS } from '@/lib/constants';
import { SentinelTool } from './CommandRail';

interface ContextualIntelligencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTool: SentinelTool;
  selectedEntity: {
    type: 'shelter' | 'point' | 'warehouse' | 'route' | null;
    data: any;
  } | null;
  onClearSelectedEntity: () => void;
  shelters: ShelterEntity[];
  warehouses: WarehouseEntity[];
  distributionPoints: DistributionPointEntity[];
  stagingBases: StagingBaseEntity[];
  parameters: DisasterParameters;
  onParametersChange: (params: DisasterParameters) => void;
  activePresetId: string | null;
  onSelectPreset: (preset: PresetScenario) => void;
  onRunSimulation: () => void;
  isSimulating: boolean;
  liveInventory: InventoryStatus;
  advisorData: AIAdvisorData | null;
  onOpenAllocateModal: (targetId: string, targetType: 'shelter' | 'point') => void;
  onOpenRouteInspector?: (route: RouteInspectionData) => void;
  onScrambleSortie: () => void;
  onTriggerSiren: () => void;
  currentStep: TimelineStep | null;
  onFlyToLocation?: (coords: Coordinates, zoom?: number) => void;
}

export default function ContextualIntelligencePanel({
  isOpen,
  onClose,
  activeTool,
  selectedEntity,
  onClearSelectedEntity,
  shelters,
  warehouses,
  distributionPoints,
  stagingBases,
  parameters,
  onParametersChange,
  activePresetId,
  onSelectPreset,
  onRunSimulation,
  isSimulating,
  liveInventory,
  advisorData,
  onOpenAllocateModal,
  onOpenRouteInspector,
  onScrambleSortie,
  onTriggerSiren,
  currentStep,
  onFlyToLocation,
}: ContextualIntelligencePanelProps) {
  const [shelterSearch, setShelterSearch] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Determine Title and Mode
  const isEntitySelected = Boolean(selectedEntity && selectedEntity.data);

  return (
    <aside className="fixed md:relative inset-y-0 right-0 z-40 md:z-20 w-full sm:w-[380px] md:w-[420px] xl:w-[460px] bg-[#070b14]/95 backdrop-blur-md border-l border-cyan-500/20 flex flex-col h-full shadow-[-8px_0_32px_rgba(0,0,0,0.6)] font-sans transition-all duration-300">
      {/* Panel Top Title Bar */}
      <div className="h-12 border-b border-slate-800/80 px-4 flex items-center justify-between bg-[#05080f]/90 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h2 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-widest truncate">
            {isEntitySelected
              ? `Selected ${selectedEntity?.type?.toUpperCase()}`
              : activeTool === 'simulation'
              ? 'Simulation Engine Setup'
              : activeTool === 'flood'
              ? 'Hydrology & 15 GCC Zones'
              : activeTool === 'shelters'
              ? '12 GCC Relief Shelters'
              : activeTool === 'logistics'
              ? 'Relief Supply Depots'
              : activeTool === 'field-teams'
              ? 'Rescue Squads & Staging'
              : activeTool === 'dispatch'
              ? 'Emergency Alert Broadcast'
              : activeTool === 'layers'
              ? 'Cartographic Overlays'
              : 'Situation Report (SitRep)'}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {isEntitySelected && (
            <button
              onClick={onClearSelectedEntity}
              className="px-2 py-0.5 rounded text-[10px] font-mono text-cyan-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Back to Tool
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Collapse Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Panel Content Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* ========================================================================= */}
        {/* CONTEXT A: SELECTED MAP ENTITY INSPECTION                                  */}
        {/* ========================================================================= */}
        {isEntitySelected ? (
          <div className="space-y-4">
            {/* 1. Shelter Entity Inspection */}
            {selectedEntity?.type === 'shelter' && (() => {
              const shelter: ShelterEntity = selectedEntity.data;
              const simAlloc = currentStep?.shelter_allocations?.find((sa) => sa.shelter_id === shelter.id);
              const assigned = simAlloc?.allocated_evacuees || 0;
              const totalAssigned = (shelter.current_occupancy ?? 0) + assigned;
              const cap = Math.max(1, shelter.capacity ?? 1);
              const pct = Math.min(100, Math.round((totalAssigned / cap) * 100));

              return (
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                          Municipal Relief Shelter
                        </span>
                        <h3 className="font-bold text-base text-white">{shelter.name}</h3>
                        <p className="text-xs text-slate-400">{shelter.neighborhood}</p>
                      </div>
                      <span className="text-xs font-mono font-bold bg-slate-800 text-slate-200 px-2 py-0.5 rounded border border-slate-700">
                        {shelter.id}
                      </span>
                    </div>

                    {/* Capacity Meter */}
                    <div className="pt-2 border-t border-slate-800 space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Capacity Utilization</span>
                        <span className="text-cyan-300 font-bold">{pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Occupancy: <b className="text-white">{totalAssigned.toLocaleString()}</b></span>
                        <span>Max Cap: <b className="text-white">{cap.toLocaleString()}</b></span>
                      </div>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                      Available Infrastructure
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {shelter.amenities?.map((amenity) => (
                        <span
                          key={amenity}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700"
                        >
                          ✓ {amenity}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => onOpenAllocateModal(shelter.id, 'shelter')}
                      className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      <span>ALLOCATE RELIEF SUPPLIES</span>
                    </button>
                    {onFlyToLocation && (
                      <button
                        onClick={() => onFlyToLocation(shelter.location, 15)}
                        className="w-full py-2 rounded-xl font-mono text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all flex items-center justify-center gap-2"
                      >
                        <Compass className="w-3.5 h-3.5 text-cyan-400" />
                        <span>FOCUS ON MAP EXTENT</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 2. Warehouse Entity Inspection */}
            {selectedEntity?.type === 'warehouse' && (() => {
              const wh: WarehouseEntity = selectedEntity.data;
              return (
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-2">
                    <span className="text-[10px] font-mono uppercase text-blue-400 font-bold">
                      Strategic Supply Depot
                    </span>
                    <h3 className="font-bold text-base text-white">{wh.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">{wh.address}</p>

                    <div className="pt-2 border-t border-slate-800 space-y-2 font-mono text-xs">
                      <div className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5 text-blue-400" />
                          Potable Water
                        </span>
                        <span className="font-bold text-cyan-300">
                          {(wh.supplies?.water_litres ?? 0).toLocaleString()} L
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-amber-400" />
                          Food Rations
                        </span>
                        <span className="font-bold text-amber-300">
                          {(wh.supplies?.food_rations ?? 0).toLocaleString()} pk
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <HeartPulse className="w-3.5 h-3.5 text-red-400" />
                          Medical Kits
                        </span>
                        <span className="font-bold text-red-300">
                          {(wh.supplies?.medical_kits ?? 0).toLocaleString()} kits
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3. Distribution Point Inspection */}
            {selectedEntity?.type === 'point' && (() => {
              const dp: DistributionPointEntity = selectedEntity.data;
              return (
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-2">
                    <span className="text-[10px] font-mono uppercase text-teal-400 font-bold">
                      Distribution Staging Point
                    </span>
                    <h3 className="font-bold text-base text-white">{dp.name}</h3>
                    <p className="text-xs text-slate-400">Target Ward: {dp.target_ward}</p>

                    <div className="pt-2 border-t border-slate-800 space-y-2 font-mono text-xs">
                      <div className="text-[10px] uppercase text-slate-400 font-bold">Demand Assessment</div>
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="p-2 rounded bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Water</span>
                          <span className="font-bold text-cyan-300">{dp.demand?.water_litres}L</span>
                        </div>
                        <div className="p-2 rounded bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Food</span>
                          <span className="font-bold text-amber-300">{dp.demand?.food_rations}pk</span>
                        </div>
                        <div className="p-2 rounded bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Medical</span>
                          <span className="font-bold text-red-300">{dp.demand?.medical_kits}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenAllocateModal(dp.id, 'point')}
                      className="w-full mt-3 py-2.5 rounded-xl font-mono text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      <span>DISPATCH SUPPLIES TO POINT</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 4. Route Entity Inspection */}
            {selectedEntity?.type === 'route' && (() => {
              const r: RouteInspectionData = selectedEntity.data;
              return (
                <div className="space-y-3.5 font-mono text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-2">
                    <span className="text-[10px] uppercase text-cyan-400 font-bold">
                      Corridor Telemetry: {r.route_id}
                    </span>
                    <h3 className="font-bold text-sm text-white font-sans">{r.route_name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        Mode: {r.transport_mode?.toUpperCase()}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                        Status: {r.status?.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-slate-300">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Distance</span>
                        <span className="font-bold text-white">{r.distance_km} km</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Transit Time</span>
                        <span className="font-bold text-white">{r.transit_time_min} mins</span>
                      </div>
                    </div>
                  </div>

                  {onOpenRouteInspector && (
                    <button
                      onClick={() => onOpenRouteInspector(r)}
                      className="w-full py-2.5 rounded-xl font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>OPEN FULL ROUTE INSPECTOR HUD</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          /* ========================================================================= */
          /* CONTEXT B: TOOL PANELS FROM COMMAND RAIL                                  */
          /* ========================================================================= */
          <div className="space-y-4">
            {/* 1. Simulation Engine Setup Tool */}
            {activeTool === 'simulation' && (
              <div className="space-y-4 font-mono text-xs">
                {/* Historical Preset Picker */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                      Calibrated Historical Scenarios
                    </span>
                    <span className="text-[10px] text-slate-500">4 Ready</span>
                  </div>

                  <div className="space-y-1.5">
                    {HISTORICAL_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => onSelectPreset(preset)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                          activePresetId === preset.id
                            ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                            : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-900'
                        }`}
                      >
                        <div className="font-bold text-xs text-white">{preset.name}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{preset.description}</div>
                        <div className="text-[9px] text-cyan-400/80 mt-1">
                          Rainfall: {preset.default_rainfall} mm/hr • Depth: {preset.default_depth} m
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hydrological Physical Sliders */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3.5">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                    Physical Disaster Parameters
                  </span>

                  {/* Rainfall Intensity Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Rainfall Intensity</span>
                      <span className="text-white font-bold">{parameters.rainfall_intensity_mm_hr} mm/hr</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={0.5}
                      value={parameters.rainfall_intensity_mm_hr}
                      onChange={(e) =>
                        onParametersChange({
                          ...parameters,
                          rainfall_intensity_mm_hr: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  {/* Flood Depth Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Flood Inundation Depth</span>
                      <span className="text-cyan-300 font-bold">{parameters.flood_depth_meters.toFixed(1)} m</span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={3.0}
                      step={0.1}
                      value={parameters.flood_depth_meters}
                      onChange={(e) =>
                        onParametersChange({
                          ...parameters,
                          flood_depth_meters: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  {/* Duration Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Simulation Horizon</span>
                      <span className="text-white font-bold">{parameters.duration_hours} Hours</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      step={1}
                      value={parameters.duration_hours}
                      onChange={(e) =>
                        onParametersChange({
                          ...parameters,
                          duration_hours: parseInt(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Primary Simulation Run Trigger */}
                <button
                  onClick={onRunSimulation}
                  disabled={isSimulating}
                  className="w-full py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>SOLVING NETWORKX & HYDROLOGY...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>EXECUTE HYDRO SIMULATION</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 2. Situation Report (SitRep Overview) */}
            {activeTool === 'overview' && (
              <div className="space-y-3.5 font-mono text-xs">
                {/* Executive Summary */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                    Executive SitRep
                  </div>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed">
                    Northeast Monsoon low-pressure depression positioned 60km East of Chennai Coast. 
                    Severe precipitation observed along Adyar and Cooum River basins. 
                    Pre-emptive citizen relocation operational across Velachery, Madipakkam, and Vyasarpadi.
                  </p>
                </div>

                {/* IMD RMC Advisory */}
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/40 space-y-1.5 text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>IMD Chennai Cyclone Warning Bulletin</span>
                  </div>
                  <p className="text-[11px] text-amber-300/90 font-sans">
                    Red Alert issued for Greater Chennai Corporation. Rainfall exceeding 200mm in 24 hours anticipated. 
                    Coastal storm surge height 1.2m above astronomical tide.
                  </p>
                </div>

                {/* AI Decision Recommendations */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                    AI Decision Recommendations
                  </div>
                  <div className="space-y-1.5">
                    {advisorData?.evacuation_advice?.slice(0, 3).map((item) => (
                      <div key={item.id} className="p-2 rounded bg-slate-950 border border-slate-800">
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 font-bold mr-1.5">
                          {item.priority}
                        </span>
                        <span className="text-slate-200 font-medium">{item.title}</span>
                      </div>
                    )) || (
                      <div className="text-slate-400">Loading tactical decision telemetry...</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. 15 GCC Zones Hydrology Risk Matrix */}
            {activeTool === 'flood' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  15 GCC Administrative Zones Vulnerability
                </div>
                <div className="space-y-1.5">
                  {[
                    { zone: 'Zone 13 Velachery', score: 0.94, tier: 'CRITICAL', elev: '3.2m', color: 'text-red-400 border-red-800 bg-red-950/40' },
                    { zone: 'Zone 14 Perungudi', score: 0.88, tier: 'CRITICAL', elev: '4.1m', color: 'text-red-400 border-red-800 bg-red-950/40' },
                    { zone: 'Zone 4 Tondiarpet', score: 0.82, tier: 'HIGH', elev: '2.8m', color: 'text-orange-400 border-orange-800 bg-orange-950/40' },
                    { zone: 'Zone 10 Kodambakkam', score: 0.76, tier: 'HIGH', elev: '6.5m', color: 'text-orange-400 border-orange-800 bg-orange-950/40' },
                    { zone: 'Zone 8 Anna Nagar', score: 0.54, tier: 'MODERATE', elev: '9.2m', color: 'text-amber-400 border-amber-800 bg-amber-950/40' },
                    { zone: 'Zone 9 Teynampet', score: 0.48, tier: 'MODERATE', elev: '7.8m', color: 'text-amber-400 border-amber-800 bg-amber-950/40' },
                    { zone: 'Zone 1 Thiruvottiyur', score: 0.42, tier: 'MODERATE', elev: '4.9m', color: 'text-amber-400 border-amber-800 bg-amber-950/40' },
                    { zone: 'Zone 5 Royapuram', score: 0.35, tier: 'LOW', elev: '8.4m', color: 'text-emerald-400 border-emerald-800 bg-emerald-950/40' },
                  ].map((z) => (
                    <div
                      key={z.zone}
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${z.color}`}
                    >
                      <div>
                        <div className="font-bold text-white text-xs">{z.zone}</div>
                        <div className="text-[10px] text-slate-400">Elevation: {z.elev}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xs">{z.tier}</span>
                        <div className="text-[10px] text-slate-400">V.I: {z.score}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Relief Shelters Directory */}
            {activeTool === 'shelters' && (
              <div className="space-y-3 font-mono text-xs">
                <input
                  type="text"
                  placeholder="Search shelters by ward or name..."
                  value={shelterSearch}
                  onChange={(e) => setShelterSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />

                <div className="space-y-2">
                  {shelters
                    .filter((s) => s.name.toLowerCase().includes(shelterSearch.toLowerCase()) || s.neighborhood.toLowerCase().includes(shelterSearch.toLowerCase()))
                    .map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-white font-sans">{s.name}</div>
                            <div className="text-[10px] text-slate-400">{s.neighborhood}</div>
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Cap: {s.capacity}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                          <button
                            onClick={() => onOpenAllocateModal(s.id, 'shelter')}
                            className="text-[10px] text-cyan-400 hover:text-white font-bold"
                          >
                            Dispatch Supplies ↗
                          </button>
                          {onFlyToLocation && (
                            <button
                              onClick={() => onFlyToLocation(s.location, 15)}
                              className="text-[10px] text-slate-400 hover:text-white"
                            >
                              Locate on Map
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 5. Relief Supply Logistics */}
            {activeTool === 'logistics' && (
              <div className="space-y-3.5 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                    Total Available Municipal Stocks
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Potable Water Reserves</span>
                      <span className="font-bold text-cyan-300">
                        {liveInventory.available_water_litres.toLocaleString()} L
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Food Rations Packets</span>
                      <span className="font-bold text-amber-300">
                        {liveInventory.available_food_rations.toLocaleString()} pk
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Emergency Medical Kits</span>
                      <span className="font-bold text-red-300">
                        {liveInventory.available_medical_kits.toLocaleString()} kits
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  5 Strategic Logistics Hubs
                </div>
                <div className="space-y-1.5">
                  {warehouses.map((wh) => (
                    <div
                      key={wh.id}
                      className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white text-xs">{wh.name}</div>
                        <div className="text-[10px] text-slate-500">{wh.address}</div>
                      </div>
                      <span className="text-[10px] text-cyan-400 font-bold">
                        {(wh.supplies?.water_litres ?? 0).toLocaleString()}L
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Rescue Field Teams & Staging */}
            {activeTool === 'field-teams' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  Active Field Staging Bases
                </div>
                <div className="space-y-2">
                  {stagingBases.map((base) => (
                    <div
                      key={base.id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{base.name}</span>
                        <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.2 rounded border border-purple-800 font-bold">
                          {base.callsign}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Assets: <b className="text-slate-200">{base.stationed_assets}</b>
                      </div>
                      <div className="flex justify-between text-[10px] pt-1 border-t border-slate-800 text-slate-400">
                        <span>Radius: <b className="text-cyan-400">{base.operational_radius_km} km</b></span>
                        <span className="text-emerald-400 font-bold uppercase">{base.readiness_status}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={onScrambleSortie}
                  className="w-full py-2.5 rounded-xl font-bold bg-purple-900 hover:bg-purple-800 text-purple-100 border border-purple-600 transition-all flex items-center justify-center gap-2"
                >
                  <Plane className="w-4 h-4 text-purple-300" />
                  <span>SCRAMBLE HELICOPTER SORTIE</span>
                </button>
              </div>
            )}

            {/* 7. Emergency Alert Dispatch Broadcast */}
            {activeTool === 'dispatch' && (
              <div className="space-y-3.5 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                    Cell Broadcast Warning (English)
                  </div>
                  <p className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs font-sans leading-relaxed">
                    "GCC CIVIL DEFENSE ALERT: Immediate evacuation warning for Velachery, Adyar basin, and low-lying wards. 
                    Proceed immediately to designated corporation relief centers. Dial 1913 for rescue assistance."
                  </p>
                  <button
                    onClick={() => handleCopy("GCC CIVIL DEFENSE ALERT: Immediate evacuation warning...", 'en')}
                    className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1.5 text-[11px]"
                  >
                    {copiedText === 'en' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText === 'en' ? 'COPIED TO CLIPBOARD' : 'COPY BROADCAST SCRIPT'}</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                    எச்சரிக்கை செய்தி (தமிழ் / Tamil)
                  </div>
                  <p className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs font-sans leading-relaxed">
                    "பெருநகர சென்னை மாநகராட்சி அவசர எச்சரிக்கை: வேளச்சேரி, அடையாறு வடிநிலப் பகுதி மக்கள் உடனடியாக நிவாரண முகாம்களுக்குச் செல்லவும். உதவிக்கு 1913 என்ற எண்ணை அழைக்கவும்."
                  </p>
                  <button
                    onClick={() => handleCopy("பெருநகர சென்னை மாநகராட்சி அவசர எச்சரிக்கை...", 'ta')}
                    className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1.5 text-[11px]"
                  >
                    {copiedText === 'ta' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText === 'ta' ? 'நகலெடுக்கப்பட்டது' : 'செய்தியை நகலெடு'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-red-950/40 border border-red-700/50 space-y-1.5">
                  <div className="text-red-300 font-bold text-xs flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-red-400" />
                    <span>Emergency Klaxon Transmitter</span>
                  </div>
                  <button
                    onClick={onTriggerSiren}
                    className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors"
                  >
                    TOGGLE EVACUATION KLAXON SIREN
                  </button>
                </div>
              </div>
            )}

            {/* 8. Layers & Basemap Engine */}
            {activeTool === 'layers' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  Geospatial Visualization Controls
                </div>
                <p className="text-slate-400 text-xs font-sans">
                  The Sentinel OS incorporates multi-spectral GIS overlays directly synchronized with the mathematical NetworkX solver.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
