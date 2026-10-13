'use client';

import React, { useState, useEffect } from 'react';
import MapContainer from '@/components/map/MapContainer';
import {
  Coordinates,
  DisasterParameters,
  FloodZoneInput,
  PresetScenario,
  SimulationResponse,
  TimelineStep,
  ShelterEntity,
  WarehouseEntity,
  DistributionPointEntity,
  PopulationClusterEntity,
  InventoryStatus,
  RouteInspectionData,
  AIAdvisorData,
  StagingBaseEntity,
} from '@/lib/types';
import { HISTORICAL_PRESETS } from '@/lib/constants';

import {
  Shield,
  Building2,
  PhoneCall,
  Clock,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Sliders,
  Layers,
  Tent,
  Warehouse,
  Truck,
  Droplets,
  Package,
  HeartPulse,
  Radio,
  Plane,
  Volume2,
  VolumeX,
  FileText,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  Info,
  Maximize2,
  Activity,
  Compass,
  ArrowRight,
} from 'lucide-react';

export interface ClassicDashboardProps {
  center: Coordinates;
  bounds: [Coordinates, Coordinates];
  shelters: ShelterEntity[];
  warehouses: WarehouseEntity[];
  distributionPoints: DistributionPointEntity[];
  populationClusters: PopulationClusterEntity[];
  stagingBases?: StagingBaseEntity[];
  currentStep: TimelineStep | null;
  definedZones: FloodZoneInput[];
  activeDrawingMode: 'none' | 'circle' | 'polygon';
  setActiveDrawingMode: (mode: 'none' | 'circle' | 'polygon') => void;
  circleRadiusMeters: number;
  setCircleRadiusMeters: (radius: number) => void;
  draftPolygonPoints: Coordinates[];
  draftCircleCenter: Coordinates | null;
  onMapClick: (coords: Coordinates) => void;
  onFinishPolygon: () => void;
  onClearDrawing: () => void;
  visibleLayers: {
    flood: boolean;
    evacuation: boolean;
    supply: boolean;
    shelters: boolean;
    warehouses: boolean;
    distributionPoints: boolean;
    populationHeatmap: boolean;
  };
  onToggleLayer: (layerName: keyof ClassicDashboardProps['visibleLayers']) => void;
  onSelectShelter: (shelterId: string) => void;
  onSelectDistributionPoint: (pointId: string) => void;
  onSelectRoute: (route: RouteInspectionData) => void;
  onOpenAllocateModal: (targetId: string, targetType: 'shelter' | 'point') => void;

  parameters: DisasterParameters;
  onParametersChange: (params: DisasterParameters) => void;
  activePresetId: string | null;
  onSelectPreset: (preset: PresetScenario) => void;
  onRunSimulation: () => void;
  isSimulating: boolean;
  simulationResponse: SimulationResponse | null;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;

  liveInventory: InventoryStatus;
  advisorData: AIAdvisorData | null;
  isBackendLive: boolean;

  onTriggerSiren: () => void;
  isSirenActive: boolean;
  onTriggerAirlift: () => void;

  uiMode: 'classic' | 'tactical';
  onToggleUIMode: () => void;
}

export default function ClassicDashboard({
  center,
  bounds,
  shelters,
  warehouses,
  distributionPoints,
  populationClusters,
  stagingBases,
  currentStep,
  definedZones,
  activeDrawingMode,
  setActiveDrawingMode,
  circleRadiusMeters,
  setCircleRadiusMeters,
  draftPolygonPoints,
  draftCircleCenter,
  onMapClick,
  onFinishPolygon,
  onClearDrawing,
  visibleLayers,
  onToggleLayer,
  onSelectShelter,
  onSelectDistributionPoint,
  onSelectRoute,
  onOpenAllocateModal,
  parameters,
  onParametersChange,
  activePresetId,
  onSelectPreset,
  onRunSimulation,
  isSimulating,
  simulationResponse,
  currentStepIndex,
  onStepChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onSpeedChange,
  liveInventory,
  advisorData,
  isBackendLive,
  onTriggerSiren,
  isSirenActive,
  onTriggerAirlift,
  uiMode,
  onToggleUIMode,
}: ClassicDashboardProps) {
  // Sidebar active tab
  const [activeTab, setActiveTab] = useState<
    'situation' | 'scenarios' | 'shelters' | 'logistics' | 'wards' | 'advisories' | 'layers'
  >('situation');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [advisorLang, setAdvisorLang] = useState<'en' | 'ta'>('en');
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Clocks
  const [istTime, setIstTime] = useState<string>('');
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setIstTime(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }));
      setUtcTime(now.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const metrics = currentStep?.metrics || {
    total_flooded_area_sq_km: 18.4,
    total_affected_population: 142000,
    total_evacuated_population: 92400,
    unassigned_stranded_population: 18400,
    severed_roads_count: 14,
    active_routes_count: 28,
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* ========================================================================= */}
      {/* 1. CLASSIC INSTITUTIONAL TOP BAR (Government Operations Portal)           */}
      {/* ========================================================================= */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-30 shadow-md">
        {/* Left: Official Seals & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-900/60 border border-blue-500/40 text-blue-300">
            <Building2 className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm font-bold tracking-tight text-white uppercase">
                Greater Chennai Corporation (GCC)
              </span>
              <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800 font-medium">
                TNSDMA Partner
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Integrated Flood Management & Emergency Response Portal (IFM-ROP)
            </p>
          </div>
        </div>

        {/* Center: Live Official Clocks & Emergency Helpline */}
        <div className="hidden lg:flex items-center gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>IST: <strong className="text-white font-mono">{istTime || '14:30:00'}</strong></span>
            <span className="text-slate-600">|</span>
            <span>UTC: <strong className="text-slate-400 font-mono">{utcTime || '09:00:00'}</strong></span>
          </div>

          <div className="flex items-center gap-2 text-xs bg-red-950/40 text-red-200 px-3 py-1.5 rounded-lg border border-red-900/50">
            <PhoneCall className="w-3.5 h-3.5 text-red-400" />
            <span className="font-semibold">Control Room Helpline:</span>
            <span className="font-bold font-mono text-red-300">1913</span>
            <span className="text-red-700">|</span>
            <span className="font-semibold">State Emergency:</span>
            <span className="font-bold font-mono text-red-300">1070</span>
          </div>
        </div>

        {/* Right: UI Mode Switcher & System Status */}
        <div className="flex items-center gap-2.5">
          {/* Backend Health Badge */}
          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${
              isBackendLive
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : 'bg-amber-950/80 text-amber-300 border-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline font-medium">
              {isBackendLive ? 'Server Connected' : 'Local Standby'}
            </span>
          </div>

          {/* Quick UI Mode Switcher */}
          <button
            onClick={onToggleUIMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900/40 hover:bg-blue-900/80 border border-blue-700/60 text-blue-200 text-xs font-semibold transition-all hover:scale-105"
            title="Switch between Classic Government Portal and Tactical Cyber HUD"
          >
            <Compass className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">Switch to Tactical HUD</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. EMERGENCY BANNER (If Active)                                           */}
      {/* ========================================================================= */}
      {isSirenActive && (
        <div className="bg-red-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 animate-bounce" />
            <span>
              PUBLIC EMERGENCY WARNING: Citizen Evacuation Siren Drill Activated across Chennai Basins.
            </span>
          </div>
          <button
            onClick={onTriggerSiren}
            className="bg-black/30 hover:bg-black/50 px-2.5 py-1 rounded text-xs uppercase tracking-wider"
          >
            Silence Siren
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN WORKBENCH: CLASSIC SIDEBAR + GIS MAP VIEWPORT                     */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ===================================================================== */}
        {/* A. CLASSIC SIDEBAR (Tabbed Administrative Workbench)                  */}
        {/* ===================================================================== */}
        <aside
          className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 z-20 ${
            isSidebarOpen ? 'w-full md:w-[420px] xl:w-[460px]' : 'w-12'
          }`}
        >
          {/* Sidebar Header & Toggle */}
          <div className="h-12 border-b border-slate-800 px-3 flex items-center justify-between bg-slate-950/60">
            {isSidebarOpen ? (
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                Operations Management Workbench
              </span>
            ) : null}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-auto transition-colors"
              title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {/* When expanded: show tab buttons & tab content */}
          {isSidebarOpen ? (
            <>
              {/* Tab Navigation Buttons */}
              <div className="flex items-center border-b border-slate-800 bg-slate-950/40 overflow-x-auto custom-scrollbar p-1 gap-1">
                <button
                  onClick={() => setActiveTab('situation')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeTab === 'situation'
                      ? 'bg-blue-900/60 text-blue-200 border border-blue-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  Situation Report
                </button>
                <button
                  onClick={() => setActiveTab('scenarios')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeTab === 'scenarios'
                      ? 'bg-blue-900/60 text-blue-200 border border-blue-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  Simulation Setup
                </button>
                <button
                  onClick={() => setActiveTab('shelters')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeTab === 'shelters'
                      ? 'bg-blue-900/60 text-blue-200 border border-blue-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  Shelters ({shelters.length})
                </button>
                <button
                  onClick={() => setActiveTab('logistics')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeTab === 'logistics'
                      ? 'bg-blue-900/60 text-blue-200 border border-blue-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  Relief Supplies
                </button>
                <button
                  onClick={() => setActiveTab('wards')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeTab === 'wards'
                      ? 'bg-blue-900/60 text-blue-200 border border-blue-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  15 GCC Zones
                </button>
                <button
                  onClick={() => setActiveTab('advisories')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeTab === 'advisories'
                      ? 'bg-blue-900/60 text-blue-200 border border-blue-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  Public Bulletins
                </button>
                <button
                  onClick={() => setActiveTab('layers')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeTab === 'layers'
                      ? 'bg-blue-900/60 text-blue-200 border border-blue-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  GIS Layers
                </button>
              </div>

              {/* Tab Content Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {/* ------------------------------------------------------------- */}
                {/* TAB 1: SITUATION REPORT & RAPID ASSESSMENT                   */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'situation' && (
                  <div className="space-y-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase">
                        <span>Incident Overview (T+{currentStep?.hour ?? 0}h)</span>
                        <span className="text-amber-400 font-mono">
                          {advisorData?.risk_radar_level || 'SEVERE FLOOD'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {advisorData?.tactical_summary ||
                          'Monsoon surface water accumulation has triggered elevated runoff in Velachery, Saidapet, and Adyar basin corridors.'}
                      </p>
                    </div>

                    {/* KPI Metric Cards Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Flooded Land Area</span>
                        <span className="text-lg font-bold font-mono text-cyan-300">
                          {metrics.total_flooded_area_sq_km.toFixed(1)}{' '}
                          <span className="text-xs text-slate-500 font-normal">km²</span>
                        </span>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Affected Population</span>
                        <span className="text-lg font-bold font-mono text-amber-300">
                          {metrics.total_affected_population.toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Evacuated Citizens</span>
                        <span className="text-lg font-bold font-mono text-emerald-300">
                          {metrics.total_evacuated_population.toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Severed Roadways</span>
                        <span className="text-lg font-bold font-mono text-red-300">
                          {metrics.severed_roads_count} Corridors
                        </span>
                      </div>
                    </div>

                    {/* Quick Tactical Action Triggers */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Emergency Operations Quick Triggers
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={onTriggerAirlift}
                          className="p-2.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/60 text-purple-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Plane className="w-4 h-4 text-purple-300" />
                          <span>Dispatch Helicopter</span>
                        </button>

                        <button
                          onClick={onTriggerSiren}
                          className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            isSirenActive
                              ? 'bg-red-600 text-white border-red-500 animate-pulse'
                              : 'bg-red-950/60 hover:bg-red-900/80 border-red-800 text-red-200'
                          }`}
                        >
                          {isSirenActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-red-300" />}
                          <span>{isSirenActive ? 'Silence Klaxon' : 'Sound Siren Klaxon'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Official Weather Advisory */}
                    <div className="p-3 bg-blue-950/30 rounded-lg border border-blue-900/50 text-xs text-blue-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-blue-300">
                        <Info className="w-3.5 h-3.5" />
                        <span>Meteorological Advisory</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Regional Meteorological Centre (RMC Chennai) predicts persistent monsoonal low-pressure trough over Southwest Bay of Bengal. Tidal swell peaks at +1.4m chart datum.
                      </p>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 2: HYDROLOGIC SIMULATION & SCENARIOS                      */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'scenarios' && (
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                        Historical Disaster Presets
                      </span>
                      <div className="space-y-2">
                        {HISTORICAL_PRESETS.map((preset) => {
                          const isSel = activePresetId === preset.id;
                          return (
                            <div
                              key={preset.id}
                              onClick={() => onSelectPreset(preset)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                isSel
                                  ? 'bg-blue-950/80 border-blue-500 text-blue-100 shadow-sm'
                                  : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-xs">{preset.name}</span>
                                {isSel && (
                                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-semibold">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                                {preset.description}
                              </p>
                              <div className="text-[10px] text-slate-500 flex gap-3 font-mono">
                                <span>Rainfall: {preset.default_rainfall} mm/hr</span>
                                <span>Depth: {preset.default_depth}m</span>
                                <span>Spread: {preset.default_spread}m/h</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Physics Sliders */}
                    <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-3 text-xs">
                      <span className="font-bold text-slate-300 uppercase tracking-wider block">
                        Hydrologic Physics Controls
                      </span>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400">Rainfall Torrent Intensity</span>
                          <span className="font-bold text-blue-300 font-mono">
                            {parameters.rainfall_intensity_mm_hr * 40} mm/hr
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          value={parameters.rainfall_intensity_mm_hr}
                          onChange={(e) =>
                            onParametersChange({
                              ...parameters,
                              rainfall_intensity_mm_hr: Number(e.target.value),
                            })
                          }
                          className="w-full accent-blue-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400">Flood Inundation Depth</span>
                          <span className="font-bold text-amber-300 font-mono">
                            {parameters.flood_depth_meters.toFixed(1)} m
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.2}
                          max={3.5}
                          step={0.1}
                          value={parameters.flood_depth_meters}
                          onChange={(e) =>
                            onParametersChange({
                              ...parameters,
                              flood_depth_meters: Number(e.target.value),
                            })
                          }
                          className="w-full accent-amber-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400">Radial Spread Velocity</span>
                          <span className="font-bold text-purple-300 font-mono">
                            {parameters.spread_rate_meters_hr} m/hr
                          </span>
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={500}
                          step={25}
                          value={parameters.spread_rate_meters_hr}
                          onChange={(e) =>
                            onParametersChange({
                              ...parameters,
                              spread_rate_meters_hr: Number(e.target.value),
                            })
                          }
                          className="w-full accent-purple-500"
                        />
                      </div>
                    </div>

                    {/* Run Simulation Trigger */}
                    <button
                      onClick={onRunSimulation}
                      disabled={isSimulating}
                      className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      {isSimulating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Computing Flood Simulation...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Execute Flood Simulation</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 3: VERIFIED SHELTERS DIRECTORY                           */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'shelters' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Chennai Safe Havens (12 Verified Shelters)</span>
                      <span>Total Capacity: 28,000</span>
                    </div>

                    <div className="space-y-2">
                      {shelters.map((sh) => {
                        const alloc = currentStep?.shelter_allocations.find((a) => a.shelter_id === sh.id);
                        const currentOcc = alloc ? alloc.current_occupancy + alloc.allocated_evacuees : sh.current_occupancy;
                        const pct = Math.min(100, Math.round((currentOcc / sh.capacity) * 100));
                        return (
                          <div
                            key={sh.id}
                            className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-bold text-xs text-white block">{sh.name}</span>
                                <span className="text-[10px] text-slate-400">{sh.neighborhood}</span>
                              </div>
                              <button
                                onClick={() => onOpenAllocateModal(sh.id, 'shelter')}
                                className="px-2 py-1 rounded bg-blue-950 hover:bg-blue-900 text-blue-200 border border-blue-800 text-[10px] font-semibold flex items-center gap-1"
                              >
                                <Truck className="w-3 h-3" />
                                <span>Dispatch Aid</span>
                              </button>
                            </div>

                            {/* Occupancy meter */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                                <span>Occupancy</span>
                                <span className="font-bold text-slate-200">
                                  {currentOcc.toLocaleString()} / {sh.capacity.toLocaleString()} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pct >= 85 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-400'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 4: RELIEF LOGISTICS & SPHERE STANDARDS                   */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'logistics' && (
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Sphere Humanitarian Standards Inventory Ledger
                    </span>

                    <div className="space-y-2.5">
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                            <Droplets className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">Potable Water</span>
                            <span className="text-[10px] text-slate-500">Standard: 15L / person / day</span>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-sm font-bold text-cyan-300 block">
                            {liveInventory.available_water_litres.toLocaleString()} L
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Allocated: {liveInventory.allocated_water_litres.toLocaleString()} L
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded bg-amber-950 text-amber-400 border border-amber-800">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">Food Ration Packs</span>
                            <span className="text-[10px] text-slate-500">2,100 kcal Nutritional MRE</span>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-sm font-bold text-amber-300 block">
                            {liveInventory.available_food_rations.toLocaleString()} packs
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Allocated: {liveInventory.allocated_food_rations.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded bg-red-950 text-red-400 border border-red-800">
                            <HeartPulse className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">Trauma Medical Kits</span>
                            <span className="text-[10px] text-slate-500">Sterile Dressings & Anti-Venom</span>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-sm font-bold text-red-300 block">
                            {liveInventory.available_medical_kits.toLocaleString()} kits
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Allocated: {liveInventory.allocated_medical_kits.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Warehouses list */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        5 Strategic Relief Depots
                      </span>
                      {warehouses.map((wh) => (
                        <div
                          key={wh.id}
                          className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs flex justify-between items-center"
                        >
                          <div>
                            <span className="font-semibold text-slate-200 block">{wh.name}</span>
                            <span className="text-[10px] text-slate-500">{wh.address}</span>
                          </div>
                          <span className="text-[10px] font-mono text-cyan-300">
                            {wh.supplies.water_litres.toLocaleString()}L Water
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 5: 15 GCC ZONES VULNERABILITY RANKING                    */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'wards' && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      15 Greater Chennai Corporation Zones Risk Ranking
                    </span>

                    <div className="space-y-1.5">
                      {(advisorData?.ward_rankings || []).slice(0, 15).map((w, idx) => (
                        <div
                          key={w.ward_id || idx}
                          className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-400">#{idx + 1}</span>
                            <div>
                              <span className="font-bold text-slate-200 block">
                                {w.ward_id.replace('GCC-', '')}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {idx === 0
                                  ? 'Velachery'
                                  : idx === 1
                                  ? 'Saidapet'
                                  : idx === 2
                                  ? 'Kotturpuram'
                                  : 'Metropolitan'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-amber-300 block">
                              Depth: {w.water_depth_m.toFixed(2)}m
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Risk: {Math.round(w.risk_index)}/100
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 6: PUBLIC ADVISORIES & BILINGUAL BULLETINS               */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'advisories' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Official Emergency Bulletins
                      </span>
                      <div className="flex gap-1 text-[10px]">
                        <button
                          onClick={() => setAdvisorLang('en')}
                          className={`px-2 py-0.5 rounded ${
                            advisorLang === 'en' ? 'bg-blue-800 text-white font-bold' : 'text-slate-400'
                          }`}
                        >
                          English
                        </button>
                        <button
                          onClick={() => setAdvisorLang('ta')}
                          className={`px-2 py-0.5 rounded ${
                            advisorLang === 'ta' ? 'bg-blue-800 text-white font-bold' : 'text-slate-400'
                          }`}
                        >
                          தமிழ் (Tamil)
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-300">
                        <span>CIVIL PROTECTION BROADCAST</span>
                        <button
                          onClick={() =>
                            handleCopy(
                              advisorLang === 'ta'
                                ? advisorData?.broadcast.tamil || ''
                                : advisorData?.broadcast.english || ''
                            )
                          }
                          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedText ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {advisorLang === 'ta'
                          ? advisorData?.broadcast.tamil ||
                            'அவசர பெருவெள்ள எச்சரிக்கை! பெருநகர சென்னை மாநகராட்சி சைரன் அறிவிப்பு. தாழ்வான பகுதியில் உள்ள பொதுமக்கள் உடனடியாக நிவாரண முகாம்களுக்கு செல்லவும்.'
                          : advisorData?.broadcast.english ||
                            'EMERGENCY EVACUATION ALERT: Flash flooding detected across Chennai basins. Residents in ground floors must proceed to designated shelters. Call 1913 or 1070 for rescue.'}
                      </p>
                    </div>

                    {/* Verified Helplines */}
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5">
                      <span className="font-bold text-slate-300 block">Verified Emergency Contacts</span>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400 font-mono">
                        <div>GCC Flood Helpline: <strong>1913</strong></div>
                        <div>State Emergency: <strong>1070</strong></div>
                        <div>District Control: <strong>1077</strong></div>
                        <div>Ambulance Call: <strong>108</strong></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 7: GIS LAYER TOGGLES                                     */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'layers' && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Geospatial Map Overlays
                    </span>

                    <div className="space-y-2 text-xs">
                      {[
                        { key: 'flood', label: 'Flood Inundation Polygons (Multi-Tier Depth)' },
                        { key: 'evacuation', label: 'Evacuation Routing Corridors & Road Severance' },
                        { key: 'supply', label: 'Multi-Modal Supply Logistics Routes' },
                        { key: 'shelters', label: 'GCC Relief Shelters (12 Locations)' },
                        { key: 'warehouses', label: 'Strategic Relief Depots (5 Warehouses)' },
                        { key: 'distributionPoints', label: 'Ward Distribution Points (10 Points)' },
                        { key: 'populationHeatmap', label: 'Population Vulnerability Heatmap' },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex items-center gap-2.5 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:bg-slate-800/60"
                        >
                          <input
                            type="checkbox"
                            checked={visibleLayers[key as keyof typeof visibleLayers]}
                            onChange={() => onToggleLayer(key as keyof typeof visibleLayers)}
                            className="rounded accent-blue-500"
                          />
                          <span className="text-slate-200">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Collapsed mini vertical icon toolbar */
            <div className="flex-1 py-4 flex flex-col items-center gap-3 text-slate-400">
              <button
                onClick={() => {
                  setIsSidebarOpen(true);
                  setActiveTab('situation');
                }}
                className="p-2 hover:bg-slate-800 rounded-lg hover:text-white"
                title="Situation Report"
              >
                <Activity className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsSidebarOpen(true);
                  setActiveTab('scenarios');
                }}
                className="p-2 hover:bg-slate-800 rounded-lg hover:text-white"
                title="Simulation Setup"
              >
                <Sliders className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsSidebarOpen(true);
                  setActiveTab('shelters');
                }}
                className="p-2 hover:bg-slate-800 rounded-lg hover:text-white"
                title="Shelters Directory"
              >
                <Tent className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsSidebarOpen(true);
                  setActiveTab('logistics');
                }}
                className="p-2 hover:bg-slate-800 rounded-lg hover:text-white"
                title="Relief Logistics"
              >
                <Package className="w-4 h-4" />
              </button>
            </div>
          )}
        </aside>

        {/* ===================================================================== */}
        {/* B. CENTER MAP VIEWPORT WITH CLASSIC GIS OVERLAYS                     */}
        {/* ===================================================================== */}
        <main className="flex-1 relative h-full w-full overflow-hidden">
          {/* Leaflet Map */}
          <div className="w-full h-full relative z-0">
            <MapContainer
              center={center}
              bounds={bounds}
              shelters={shelters}
              warehouses={warehouses}
              distributionPoints={distributionPoints}
              populationClusters={populationClusters}
              stagingBases={stagingBases}
              currentStep={currentStep}
              definedZones={definedZones}
              activeDrawingMode={activeDrawingMode}
              circleRadiusMeters={circleRadiusMeters}
              draftPolygonPoints={draftPolygonPoints}
              draftCircleCenter={draftCircleCenter}
              onMapClick={onMapClick}
              visibleLayers={visibleLayers}
              onSelectShelter={onSelectShelter}
              onSelectDistributionPoint={onSelectDistributionPoint}
              onSelectRoute={onSelectRoute}
            />
          </div>

          {/* Classic Floating GIS Legend (Bottom-Left) */}
          <div className="absolute bottom-16 left-4 z-20 bg-slate-900/90 backdrop-blur-md p-3 rounded-lg border border-slate-700 shadow-lg text-xs space-y-2 pointer-events-auto max-w-[220px]">
            <span className="font-bold text-slate-200 uppercase tracking-wider block text-[10px] border-b border-slate-700 pb-1">
              Inundation Depth Legend
            </span>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-yellow-400/80 border border-yellow-600" />
                <span className="text-slate-300">Advisory (&lt; 0.3m)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-orange-400/80 border border-orange-600" />
                <span className="text-slate-300">Moderate (0.3 – 0.6m)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-red-500/80 border border-red-700" />
                <span className="text-slate-300">Severe (0.6 – 1.2m)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-red-900/90 border border-red-950" />
                <span className="text-slate-300">Catastrophic (≥ 1.2m)</span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-700/80 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Road Severance:</span>
              <span className="text-red-400 font-bold">≥ 0.50m Cutoff</span>
            </div>
          </div>

          {/* Classic Bottom Timeline Playback Bar */}
          {simulationResponse && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl px-4 pointer-events-auto">
              <div className="bg-slate-900/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-700 shadow-xl flex items-center justify-between gap-3 text-xs">
                {/* Play / Pause / Step Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
                    disabled={currentStepIndex === 0}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30"
                    title="Previous step"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={onTogglePlay}
                    className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>

                  <button
                    onClick={() =>
                      onStepChange(
                        Math.min(simulationResponse.timeline.length - 1, currentStepIndex + 1)
                      )
                    }
                    disabled={currentStepIndex === simulationResponse.timeline.length - 1}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30"
                    title="Next step"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Timeline slider & label */}
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="font-bold text-blue-300">
                      Step T+{currentStep?.hour ?? 0} Hours
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {currentStep?.description || 'Timeline Progression'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={simulationResponse.timeline.length - 1}
                    value={currentStepIndex}
                    onChange={(e) => onStepChange(Number(e.target.value))}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                </div>

                {/* Speed toggle */}
                <div className="flex items-center gap-1 font-mono text-[10px] bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  <button
                    onClick={() => onSpeedChange(playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 5 : 1)}
                    className="font-bold text-blue-300 hover:text-white"
                  >
                    {playbackSpeed}x Speed
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
