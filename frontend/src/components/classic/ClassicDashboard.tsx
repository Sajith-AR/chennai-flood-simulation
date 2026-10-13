'use client';

import React, { useState, useEffect, useMemo } from 'react';
import MapContainer from '@/components/map/MapContainer';
import ConfirmationModal from './ConfirmationModal';
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
  Building2,
  Shield,
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
  Minimize2,
  Activity,
  Compass,
  ArrowRight,
  Sun,
  Moon,
  Search,
  Filter,
  Users,
  ShieldCheck,
  MapPin,
  Navigation,
  Eye,
  AlertCircle,
  TrendingUp,
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

export type WorkbenchTab =
  | 'situation'
  | 'operations'
  | 'simulation'
  | 'forecast'
  | 'shelters'
  | 'supplies'
  | 'routes'
  | 'incidents'
  | 'field-teams'
  | 'dispatch'
  | 'layers';

export default function ClassicDashboard({
  center,
  bounds,
  shelters,
  warehouses,
  distributionPoints,
  populationClusters,
  stagingBases = [],
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
  // Navigation State
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('situation');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isLegendExpanded, setIsLegendExpanded] = useState<boolean>(true);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  // Search & Filter state for shelters
  const [shelterSearch, setShelterSearch] = useState<string>('');
  const [shelterFilter, setShelterFilter] = useState<'all' | 'available' | 'high_occupancy'>('all');

  // Broadcast language toggle
  const [broadcastLang, setBroadcastLang] = useState<'en' | 'ta'>('en');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Consequential action confirmation dialogs
  const [confirmSirenOpen, setConfirmSirenOpen] = useState<boolean>(false);
  const [confirmAirliftOpen, setConfirmAirliftOpen] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Synchronized Clocks
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

  // Sync theme class with container
  const isDark = themeMode === 'dark';

  const triggerToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(label);
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  // Real-time Metrics derived from simulation timeline or calibrated initial state
  const metrics = currentStep?.metrics || {
    total_flooded_area_sq_km: 18.4,
    total_affected_population: 142000,
    total_evacuated_population: 92400,
    unassigned_stranded_population: 18400,
    severed_roads_count: 14,
    active_routes_count: 28,
  };

  // Filtered shelters list
  const filteredShelters = useMemo(() => {
    return shelters.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(shelterSearch.toLowerCase()) ||
        s.neighborhood.toLowerCase().includes(shelterSearch.toLowerCase()) ||
        s.id.toLowerCase().includes(shelterSearch.toLowerCase());

      const simAlloc = currentStep?.shelter_allocations?.find((sa) => sa.shelter_id === s.id);
      const totalOcc = (s.current_occupancy || 0) + (simAlloc?.allocated_evacuees || 0);
      const cap = Math.max(1, s.capacity || 1);
      const pct = (totalOcc / cap) * 100;

      if (shelterFilter === 'available') return matchesSearch && pct < 85;
      if (shelterFilter === 'high_occupancy') return matchesSearch && pct >= 85;
      return matchesSearch;
    });
  }, [shelters, shelterSearch, shelterFilter, currentStep]);

  // GCC 15 Zones Data from AI Advisor or standard zones
  const wardRankings = (advisorData as any)?.ward_vulnerability_index || (advisorData as any)?.ward_rankings || [
    { zone_number: 9, zone_id: 'GCC-ZONE-09', name: 'Zone 9 - Teynampet', risk_tier: 'CRITICAL', peak_flood_depth_m: 2.15, composite_vulnerability_index: 8.8, priority_action: 'Immediate NDRF boat flotilla evacuation at Saidapet & Kotturpuram.' },
    { zone_number: 13, zone_id: 'GCC-ZONE-13', name: 'Zone 13 - Adyar', risk_tier: 'CRITICAL', peak_flood_depth_m: 1.95, composite_vulnerability_index: 8.4, priority_action: 'Deploy amphibious rescue along Besant Nagar canal basin.' },
    { zone_number: 14, zone_id: 'GCC-ZONE-14', name: 'Zone 14 - Perungudi', risk_tier: 'HIGH', peak_flood_depth_m: 1.60, composite_vulnerability_index: 7.6, priority_action: 'Velachery Lake surplus channel overflow. Clear arterial culverts.' },
    { zone_number: 4, zone_id: 'GCC-ZONE-04', name: 'Zone 4 - Tondiarpet', risk_tier: 'HIGH', peak_flood_depth_m: 1.45, composite_vulnerability_index: 7.2, priority_action: 'Buckingham Canal North backflow prevention. Distribute chlorinated water.' },
    { zone_number: 10, zone_id: 'GCC-ZONE-10', name: 'Zone 10 - Kodambakkam', risk_tier: 'MODERATE', peak_flood_depth_m: 1.10, composite_vulnerability_index: 6.4, priority_action: 'Monitor Virugambakkam drain surplus into Cooum river.' },
    { zone_number: 5, zone_id: 'GCC-ZONE-05', name: 'Zone 5 - Royapuram', risk_tier: 'MODERATE', peak_flood_depth_m: 0.95, composite_vulnerability_index: 5.8, priority_action: 'Harbor stormwater drainage operational.' },
    { zone_number: 6, zone_id: 'GCC-ZONE-06', name: 'Zone 6 - Thiru. Vi. Ka. Nagar', risk_tier: 'LOW', peak_flood_depth_m: 0.45, composite_vulnerability_index: 4.2, priority_action: 'Otteri Nullah water levels normal.' },
    { zone_number: 11, zone_id: 'GCC-ZONE-11', name: 'Zone 11 - Valasaravakkam', risk_tier: 'LOW', peak_flood_depth_m: 0.35, composite_vulnerability_index: 3.8, priority_action: 'Porur lake surplus channel clear.' },
  ];

  return (
    <div className={`flex flex-col h-screen w-full font-sans overflow-hidden select-none ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* ========================================================================= */}
      {/* 1. PREMIUM ENTERPRISE HEADER                                              */}
      {/* ========================================================================= */}
      <header className="h-16 px-4 md:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-30 shadow-sm flex-shrink-0">
        {/* Left: GCC Branding & Portal Identification */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-blue-600 shadow-sm">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                Greater Chennai Corporation
              </h1>
              <span className="hidden sm:inline-flex text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                TNSDMA Partner
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight font-medium">
              Integrated Flood Management & Emergency Response Portal (IFM-ROP)
            </p>
          </div>
        </div>

        {/* Center: Live Digital Clocks & Emergency Helpline Contacts */}
        <div className="hidden xl:flex items-center gap-5 text-xs">
          {/* Synchronized Operational Clocks */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium">
              IST: <strong className="font-mono text-slate-900 dark:text-white font-bold">{istTime || '14:30:00'}</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="font-medium text-slate-500 dark:text-slate-400">
              UTC: <strong className="font-mono text-slate-700 dark:text-slate-300">{utcTime || '09:00:00'}</strong>
            </span>
          </div>

          {/* Verified Emergency Helplines */}
          <div className="flex items-center gap-2 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/50">
            <PhoneCall className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span className="font-semibold text-[11px]">GCC Helpline:</span>
            <span className="font-mono font-bold text-red-800 dark:text-red-200">1913</span>
            <span className="text-red-300 dark:text-red-800">|</span>
            <span className="font-semibold text-[11px]">State:</span>
            <span className="font-mono font-bold text-red-800 dark:text-red-200">1070</span>
            <span className="text-red-300 dark:text-red-800">|</span>
            <span className="font-semibold text-[11px]">District:</span>
            <span className="font-mono font-bold text-red-800 dark:text-red-200">1077</span>
          </div>
        </div>

        {/* Right: Server Telemetry Status & Controls */}
        <div className="flex items-center gap-2.5">
          {/* Server Connection Status Badge */}
          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border font-medium ${
              isBackendLive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="hidden md:inline">
              {isBackendLive ? 'Live Server Connected' : 'Local Standby'}
            </span>
          </div>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={() => setThemeMode(isDark ? 'light' : 'dark')}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Switch to Cyber Tactical HUD */}
          <button
            onClick={onToggleUIMode}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-xs font-semibold shadow-sm transition-all"
            title="Switch to Cyber Tactical Command HUD"
          >
            <Compass className="w-3.5 h-3.5 text-blue-300" />
            <span>Tactical HUD</span>
          </button>
        </div>
      </header>

      {/* Emergency Audio Klaxon Alert Banner */}
      {isSirenActive && (
        <div className="bg-red-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-sm z-30">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 animate-bounce" />
            <span>
              <strong>EMERGENCY EVACUATION KLAXON ACTIVE:</strong> Civil defense alert broadcasting to all GCC regional ward stations.
            </span>
          </div>
          <button
            onClick={onTriggerSiren}
            className="px-2 py-0.5 rounded bg-white text-red-700 font-bold text-[11px] hover:bg-red-50 uppercase tracking-wide"
          >
            Silence Klaxon
          </button>
        </div>
      )}

      {/* Action Feedback Toast */}
      {feedbackToast && (
        <div className="bg-slate-900 text-white dark:bg-slate-800 border-b border-slate-700 px-4 py-2 text-xs font-medium flex items-center gap-2.5 z-30 animate-slide-down">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN APPLICATION WORKSPACE (Split Workbench & GIS Leaflet Map)          */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ======================================================================= */}
        {/* LEFT PANEL: COLLAPSIBLE OPERATIONS WORKBENCH                            */}
        {/* ======================================================================= */}
        <aside
          className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 z-20 shadow-sm ${
            isSidebarOpen ? 'w-full md:w-[460px] xl:w-[500px]' : 'w-14'
          }`}
        >
          {/* Workbench Title & Collapse Toggle Bar */}
          <div className="h-12 border-b border-slate-200 dark:border-slate-800 px-3.5 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 flex-shrink-0">
            {isSidebarOpen ? (
              <>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Operations Management Workbench</span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                  title="Collapse sidebar for full-screen map"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="w-full flex justify-center p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                title="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Workbench Content */}
          {isSidebarOpen ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Organized Segmented Navigation Groups */}
              <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 overflow-x-auto custom-scrollbar flex-shrink-0">
                <div className="flex items-center gap-1 min-w-max text-xs">
                  {/* Overview Group */}
                  <button
                    onClick={() => setActiveTab('situation')}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeTab === 'situation'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Situation Report</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('operations')}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeTab === 'operations'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Live Operations</span>
                  </button>

                  <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-1" />

                  {/* Planning Group */}
                  <button
                    onClick={() => setActiveTab('simulation')}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeTab === 'simulation'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Simulation Setup</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('forecast')}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeTab === 'forecast'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Flood Forecasting</span>
                  </button>

                  <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-1" />

                  {/* Resources Group */}
                  <button
                    onClick={() => setActiveTab('shelters')}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeTab === 'shelters'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Tent className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Shelters ({shelters.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('supplies')}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeTab === 'supplies'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Relief Supplies</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('routes')}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeTab === 'routes'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Evac Routes</span>
                  </button>

                  <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-1" />

                  {/* Emergency Response Group */}
                  <button
                    onClick={() => setActiveTab('incidents')}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeTab === 'incidents'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    <span>15 GCC Zones</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('field-teams')}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeTab === 'field-teams'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Plane className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Field Teams</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('dispatch')}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeTab === 'dispatch'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Public Bulletins</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('layers')}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeTab === 'layers'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>GIS Layers</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Tab Viewport */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {/* ------------------------------------------------------------- */}
                {/* TAB 1: SITUATION REPORT & OVERVIEW                           */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'situation' && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Header Context Card */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Chennai Metropolitan Incident Overview
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                          {advisorData?.risk_radar_level || 'DEFCON 2 — Severe Inundation'}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Velachery, Saidapet & Adyar Basin Flood Response
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Continuous precipitation in Chennai catchment zones has elevated water levels across Adyar River and Buckingham Canal corridors. 12 municipal relief centers are active with coordinated multi-modal supply chains.
                      </p>
                      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
                        <span>Time-Step: <strong>T+{currentStep?.hour ?? 0}h</strong></span>
                        <span>Status: <strong>Active Real-Time Simulation</strong></span>
                      </div>
                    </div>

                    {/* 4 Premium Stat Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* 1. Flooded Area */}
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                          <span className="text-xs font-medium">Flooded Land Area</span>
                          <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                          {metrics.total_flooded_area_sq_km} <span className="text-xs font-normal text-slate-500">km²</span>
                        </div>
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-1">
                          Adyar & Velachery Basins
                        </div>
                      </div>

                      {/* 2. Affected Population */}
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                          <span className="text-xs font-medium">Affected Population</span>
                          <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                          {(metrics.total_affected_population || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                          15 Municipal Wards At-Risk
                        </div>
                      </div>

                      {/* 3. Evacuated Population */}
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                          <span className="text-xs font-medium">Evacuated Citizens</span>
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                          {(metrics.total_evacuated_population || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                          Relocated to 12 GCC Shelters
                        </div>
                      </div>

                      {/* 4. Severed Corridors */}
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                          <span className="text-xs font-medium">Severed Roadways</span>
                          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                          {metrics.severed_roads_count} <span className="text-xs font-normal text-slate-500">Cutoffs</span>
                        </div>
                        <div className="text-[10px] text-red-600 dark:text-red-400 font-medium mt-1">
                          28 Arterial Bypasses Active
                        </div>
                      </div>
                    </div>

                    {/* Consequential Emergency Operations Action Triggers */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Emergency Operations Actions
                        </span>
                        <span className="text-[10px] text-slate-400">Confirmation Required</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          onClick={() => setConfirmAirliftOpen(true)}
                          className="p-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 dark:text-purple-300 dark:border-purple-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
                        >
                          <Plane className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span>Dispatch Helicopter</span>
                        </button>
                        <button
                          onClick={() => setConfirmSirenOpen(true)}
                          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs ${
                            isSirenActive
                              ? 'bg-red-600 text-white border-red-500'
                              : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:hover:bg-red-900/60 dark:text-red-300 dark:border-red-800'
                          }`}
                        >
                          {isSirenActive ? (
                            <>
                              <VolumeX className="w-4 h-4" />
                              <span>Silence Klaxon</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                              <span>Sound Siren Klaxon</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Meteorological Advisory Card */}
                    <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300">
                        <Info className="w-4 h-4" />
                        <span>Regional Meteorological Centre (RMC Chennai)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        Heavy to very heavy convective precipitation forecasted across Chennai, Kanchipuram, and Tiruvallur coastal plain. Coastal surge estimated at +1.2m above chart datum. Citizens in low-lying zones advised to follow official evacuation corridors.
                      </p>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 2: LIVE OPERATIONS                                       */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'operations' && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Evacuation Progress Meter Card */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                          Evacuation Progress Index
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {Math.round(((metrics.total_evacuated_population || 0) / Math.max(1, metrics.total_affected_population || 1)) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                ((metrics.total_evacuated_population || 0) /
                                  Math.max(1, metrics.total_affected_population || 1)) *
                                  100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <div>
                          Evacuated: <strong className="text-slate-900 dark:text-white font-mono">{(metrics.total_evacuated_population || 0).toLocaleString()}</strong>
                        </div>
                        <div>
                          Stranded / In-Transit: <strong className="text-amber-600 dark:text-amber-400 font-mono">{(metrics.unassigned_stranded_population || 18400).toLocaleString()}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Multi-Modal Fleet Telemetry */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block">
                        Deployed Operations Transport Fleet
                      </span>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">Ashok Leyland 4x4 Ground Convoys</div>
                              <div className="text-[10px] text-slate-500">GST Road & OMR Corridors</div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            16 Convoys Active
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs">
                          <div className="flex items-center gap-2">
                            <ShipIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">NDRF Gemini Amphibious Crafts</div>
                              <div className="text-[10px] text-slate-500">Buckingham Canal & Kotturpuram</div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                            8 Flotillas Deployed
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs">
                          <div className="flex items-center gap-2">
                            <Plane className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">IAF Chetak Helicopter Sorties</div>
                              <div className="text-[10px] text-slate-500">Tambaram AFS to Anna Univ SAR</div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            4 Sorties Staged
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 3: SIMULATION SETUP                                      */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'simulation' && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Historical Presets Picker */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block">
                        Historical Benchmark Presets
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {HISTORICAL_PRESETS.map((p) => {
                          const isSelected = activePresetId === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() => onSelectPreset(p)}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-900 border-blue-400 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-700 shadow-xs'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                              }`}
                            >
                              <div className="font-bold text-xs">{p.name}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                {p.default_rainfall} mm/hr • {p.default_depth}m Depth
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Physical Hydrologic Controls */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block">
                        Hydrologic Calibration Parameters
                      </span>

                      {/* Rainfall Intensity */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Precipitation Rate</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            {parameters.rainfall_intensity_mm_hr} mm/hr
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          step={0.5}
                          value={parameters.rainfall_intensity_mm_hr}
                          onChange={(e) =>
                            onParametersChange({
                              ...parameters,
                              rainfall_intensity_mm_hr: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-blue-600"
                        />
                      </div>

                      {/* Water Depth */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Inundation Peak Depth</span>
                          <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                            {parameters.flood_depth_meters} meters
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.2}
                          max={4.0}
                          step={0.1}
                          value={parameters.flood_depth_meters}
                          onChange={(e) =>
                            onParametersChange({
                              ...parameters,
                              flood_depth_meters: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-teal-600"
                        />
                      </div>

                      {/* Radial Spread Velocity */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Radial Spread Velocity</span>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
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
                              spread_rate_meters_hr: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-indigo-600"
                        />
                      </div>

                      {/* Simulation Duration */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Simulation Horizon</span>
                          <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                            {parameters.duration_hours} hours
                          </span>
                        </div>
                        <input
                          type="range"
                          min={3}
                          max={24}
                          step={1}
                          value={parameters.duration_hours}
                          onChange={(e) =>
                            onParametersChange({
                              ...parameters,
                              duration_hours: parseInt(e.target.value),
                            })
                          }
                          className="w-full accent-purple-600"
                        />
                      </div>
                    </div>

                    {/* Interactive GIS Drawing Controls */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block">
                        Interactive GIS Flood Polygon Drawing
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setActiveDrawingMode(activeDrawingMode === 'circle' ? 'none' : 'circle')}
                          className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                            activeDrawingMode === 'circle'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                          <span>Circle Tool</span>
                        </button>

                        <button
                          onClick={() => setActiveDrawingMode(activeDrawingMode === 'polygon' ? 'none' : 'polygon')}
                          className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                            activeDrawingMode === 'polygon'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                          <span>Polygon Tool</span>
                        </button>

                        <button
                          onClick={onClearDrawing}
                          className="p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear Tools</span>
                        </button>
                      </div>

                      {activeDrawingMode === 'polygon' && draftPolygonPoints.length >= 3 && (
                        <button
                          onClick={onFinishPolygon}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
                        >
                          Close Polygon ({draftPolygonPoints.length} vertices)
                        </button>
                      )}
                    </div>

                    {/* Master Simulation Trigger Button */}
                    <button
                      onClick={onRunSimulation}
                      disabled={isSimulating}
                      className={`w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white transition-all shadow-md ${
                        isSimulating
                          ? 'bg-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
                      }`}
                    >
                      {isSimulating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Computing Physical Hydrology Engine...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Run Spatio-Temporal Flood Simulation</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 4: FLOOD FORECASTING                                     */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'forecast' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block">
                        Hourly Inundation Progression
                      </span>
                      <div className="space-y-2">
                        {simulationResponse?.timeline.map((step) => {
                          const isCurrent = step.hour === (currentStep?.hour ?? 0);
                          return (
                            <div
                              key={step.hour}
                              onClick={() => onStepChange(step.time_step)}
                              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                isCurrent
                                  ? 'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-200 shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono font-bold text-xs">T+{step.hour}h</span>
                                <span className="text-xs">
                                  {step.metrics.total_flooded_area_sq_km} km² flooded
                                </span>
                              </div>
                              <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {step.metrics.severed_roads_count} Roads Cutoff
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 5: SHELTERS DIRECTORY                                    */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'shelters' && (
                  <div className="space-y-3 animate-fade-in">
                    {/* Search & Filter Bar */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search shelters by ward or name..."
                          value={shelterSearch}
                          onChange={(e) => setShelterSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <select
                        value={shelterFilter}
                        onChange={(e) => setShelterFilter(e.target.value as any)}
                        className="px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                      >
                        <option value="all">All ({shelters.length})</option>
                        <option value="available">Available</option>
                        <option value="high_occupancy">&gt;85% Occupancy</option>
                      </select>
                    </div>

                    {/* Shelters List */}
                    <div className="space-y-2.5">
                      {filteredShelters.map((s) => {
                        const simAlloc = currentStep?.shelter_allocations?.find((sa) => sa.shelter_id === s.id);
                        const assignedEvacuees = simAlloc?.allocated_evacuees || 0;
                        const totalAssigned = (s.current_occupancy || 0) + assignedEvacuees;
                        const shelterCap = Math.max(1, s.capacity || 1);
                        const occupancyPct = Math.min(100, Math.round((totalAssigned / shelterCap) * 100));

                        return (
                          <div
                            key={s.id}
                            className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-bold text-xs text-slate-900 dark:text-white">{s.name}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">{s.neighborhood}</div>
                              </div>
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                  occupancyPct >= 90
                                    ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                                    : occupancyPct >= 75
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}
                              >
                                {occupancyPct}% Full
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1">
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    occupancyPct >= 90
                                      ? 'bg-red-500'
                                      : occupancyPct >= 75
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${occupancyPct}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                                <span>Occupancy: {totalAssigned.toLocaleString()} / {(s.capacity || 0).toLocaleString()}</span>
                                <span>Available: {Math.max(0, (s.capacity || 0) - totalAssigned).toLocaleString()} beds</span>
                              </div>
                            </div>

                            {/* Amenities & Action */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                              <div className="flex flex-wrap gap-1">
                                {s.amenities?.slice(0, 2).map((amenity, i) => (
                                  <span
                                    key={i}
                                    className="text-[9px] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                                  >
                                    ✓ {amenity}
                                  </span>
                                ))}
                              </div>
                              <button
                                onClick={() => onOpenAllocateModal(s.id, 'shelter')}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-all shadow-xs"
                              >
                                Allocate Supplies
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 6: RELIEF SUPPLIES                                       */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'supplies' && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Sphere Standards Ledger */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block">
                        Sphere Humanitarian Standards Reserves
                      </span>
                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-500 block text-[11px]">Potable Water</span>
                          <span className="font-mono font-bold text-base text-blue-600 dark:text-blue-400">
                            {(liveInventory?.available_water_litres ?? liveInventory?.total_water_litres ?? 250000).toLocaleString()} L
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-500 block text-[11px]">Food Rations</span>
                          <span className="font-mono font-bold text-base text-amber-600 dark:text-amber-400">
                            {(liveInventory?.available_food_rations ?? liveInventory?.total_food_rations ?? 50000).toLocaleString()} pk
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-500 block text-[11px]">Trauma Medical Kits</span>
                          <span className="font-mono font-bold text-base text-red-600 dark:text-red-400">
                            {(liveInventory?.available_medical_kits ?? liveInventory?.total_medical_kits ?? 1500).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-500 block text-[11px]">Life Jackets</span>
                          <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                            3,200 Units
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Warehouses Stock */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block">
                        5 Strategic Logistics Depots
                      </span>
                      <div className="space-y-2">
                        {warehouses.map((wh) => (
                          <div
                            key={wh.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1 text-xs"
                          >
                            <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                              <span>{wh.name}</span>
                              <span className="text-[10px] font-mono text-slate-500">{wh.id}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">{wh.address}</div>
                            <div className="flex justify-between text-[11px] font-mono text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700">
                              <span>Water: {(wh.supplies?.water_litres ?? 0).toLocaleString()}L</span>
                              <span>Rations: {(wh.supplies?.food_rations ?? 0).toLocaleString()}pk</span>
                              <span>Kits: {wh.supplies?.medical_kits ?? 0}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 7: EVACUATION ROUTES                                     */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'routes' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block">
                        Evacuation & Supply Corridors ({currentStep?.evacuation_routes?.features.length || 0})
                      </span>
                      <div className="space-y-2">
                        {currentStep?.evacuation_routes?.features.map((feat, idx) => {
                          const props = feat.properties;
                          const isImpassable = props.status === 'impassable';
                          const isRerouted = props.status === 'rerouted';

                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {props.source_name} ➔ {props.destination_name}
                                </span>
                                <span
                                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                    isImpassable
                                      ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                                      : isRerouted
                                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  }`}
                                >
                                  {props.status}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                                <span>Dist: {props.distance_km || 4.2} km • Evacuees: {(props.evacuee_count || 350).toLocaleString()}</span>
                                <button
                                  onClick={() => {
                                    onSelectRoute({
                                      route_id: props.route_id,
                                      route_name: `${props.source_name} ➔ ${props.destination_name}`,
                                      route_category: 'evacuation',
                                      transport_mode: isImpassable ? 'amphibious' : 'truck',
                                      vehicle_type: 'Convoy Transport',
                                      source_name: props.source_name,
                                      destination_name: props.destination_name,
                                      distance_km: props.distance_km || 4.2,
                                      transit_time_min: 20,
                                      convoy_vehicle_count: 4,
                                      water_clearance_depth_m: 0.8,
                                      max_water_depth_m: isImpassable ? 1.8 : 0.3,
                                      depth_profile: [],
                                      evacuee_or_capacity_count: props.evacuee_count || 350,
                                      manifest: { water_litres: 10000, food_rations: 2000, medical_kits: 30, life_jackets: 50, satellite_radios: 4 },
                                      status: props.status,
                                      recommendation: 'Safe route monitored.',
                                    });
                                  }}
                                  className="text-blue-600 dark:text-blue-400 underline font-sans text-xs"
                                >
                                  Inspect Profile ↗
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 8: 15 GCC ZONES INCIDENT MANAGEMENT                     */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'incidents' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                          GCC 15 Administrative Zones Vulnerability Ranking
                        </span>
                        <span className="text-[10px] text-slate-400">Ranked by Composite Risk</span>
                      </div>
                      <div className="space-y-2">
                        {wardRankings.map((ward: any, idx: number) => {
                          const isCritical = ward.risk_tier === 'CRITICAL';
                          const isHigh = ward.risk_tier === 'HIGH';

                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  #{idx + 1} {ward.name}
                                </span>
                                <span
                                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                    isCritical
                                      ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800'
                                      : isHigh
                                      ? 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  }`}
                                >
                                  {ward.risk_tier}
                                </span>
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                                <span>Peak Water Depth: <strong>{ward.peak_flood_depth_m?.toFixed(2)}m</strong></span>
                                <span>Risk Index: <strong>{ward.composite_vulnerability_index?.toFixed(1)}/10</strong></span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                                {ward.priority_action}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 9: FIELD TEAMS                                           */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'field-teams' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block">
                        Verified Joint Staging Bases ({stagingBases.length})
                      </span>
                      <div className="space-y-2.5">
                        {stagingBases.map((base) => (
                          <div
                            key={base.id}
                            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-white">{base.name}</span>
                              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                {base.callsign}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Type: {base.type === 'helicopter_base' ? 'IAF / Coast Guard Air Base' : 'Marine Amphibious Staging Base'}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1.5 border-t border-slate-200 dark:border-slate-700">
                              <div>
                                <span className="text-slate-500 block text-[9px] uppercase">Assets</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{base.stationed_assets}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[9px] uppercase">Combat Radius</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{base.operational_radius_km} km</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[9px] uppercase">Readiness</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">{base.readiness_status}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 10: PUBLIC BULLETINS (DISPATCH)                          */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'dispatch' && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Language Switcher */}
                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                        Emergency Broadcast Language
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setBroadcastLang('en')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            broadcastLang === 'en'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          English
                        </button>
                        <button
                          onClick={() => setBroadcastLang('ta')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            broadcastLang === 'ta'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          தமிழ் (Tamil)
                        </button>
                      </div>
                    </div>

                    {/* SMS Flash Broadcast Card */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                          Citizen Cellular Cell-Broadcast Preview
                        </span>
                        <button
                          onClick={() =>
                            handleCopyText(
                              broadcastLang === 'en'
                                ? `[GCC-DISASTER ALERT]: FLASH FLOOD RED ALERT for Chennai. Evacuate low-lying areas in Velachery, Adyar, and Saidapet immediately. Helplines: 1913, 1070, 1077.`
                                : `[சென்னை மாநகராட்சி பேரிடர் எச்சரிக்கை]: சென்னைக்கு அதிதீவிர வெள்ள எச்சரிக்கை (RED ALERT). தாழ்வான பகுதிகளை உடனே காலி செய்யவும். அவசர உதவி எண்கள்: 1913, 1070, 1077.`,
                              'SMS Alert'
                            )
                          }
                          className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedNotification === 'SMS Alert' ? 'Copied!' : 'Copy SMS Text'}</span>
                        </button>
                      </div>
                      <p className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                        {broadcastLang === 'en'
                          ? `[GCC-DISASTER ALERT]: FLASH FLOOD RED ALERT for Chennai. Evacuate low-lying areas in Velachery, Adyar, and Saidapet immediately. Helplines: 1913, 1070, 1077. Follow NDRF instructions.`
                          : `[சென்னை மாநகராட்சி பேரிடர் எச்சரிக்கை]: சென்னைக்கு அதிதீவிர வெள்ள எச்சரிக்கை (RED ALERT). தாழ்வான பகுதிகளை உடனே காலி செய்யவும். அவசர உதவி எண்கள்: 1913, 1070, 1077. மீட்புக் குழுவின் வழிகாட்டுதலைப் பின்பற்றவும்.`}
                      </p>
                    </div>

                    {/* Official Press Release */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-bold uppercase text-slate-900 dark:text-white block">
                        Official Disaster Control Bulletin
                      </span>
                      <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                        <li>Switch off main electricity breakers if flood water enters domestic premises.</li>
                        <li>Boil all drinking water or consume official chlorinated emergency relief supplies.</li>
                        <li>Keep essential identification documents, medicines, and torches in sealed waterproof packs.</li>
                        <li>Emergency Control Center reachable at 1913 (GCC) or 1070 (State EOC).</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 11: GIS LAYERS TOGGLE                                    */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'layers' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block">
                        Interactive GIS Layer Visibility
                      </span>
                      <div className="space-y-2.5">
                        {[
                          { key: 'flood', label: 'Flood Inundation Depth Envelopes', icon: Droplets, color: 'text-blue-600' },
                          { key: 'evacuation', label: 'Multi-Modal Evacuation Corridors', icon: Navigation, color: 'text-emerald-600' },
                          { key: 'supply', label: 'Relief Supply Logistics Routes', icon: Truck, color: 'text-indigo-600' },
                          { key: 'shelters', label: 'GCC Safe Shelters & Relief Camps', icon: Tent, color: 'text-teal-600' },
                          { key: 'warehouses', label: 'Strategic Supply Warehouses & Depots', icon: Warehouse, color: 'text-blue-600' },
                          { key: 'distributionPoints', label: 'Community Aid Distribution Points', icon: Package, color: 'text-amber-600' },
                          { key: 'populationHeatmap', label: 'Ward Population Density Heatmap', icon: Users, color: 'text-red-600' },
                        ].map((layer) => {
                          const IconComp = layer.icon;
                          const isActive = visibleLayers[layer.key as keyof typeof visibleLayers];
                          return (
                            <div
                              key={layer.key}
                              onClick={() => onToggleLayer(layer.key as any)}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <IconComp className={`w-4 h-4 ${layer.color}`} />
                                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                  {layer.label}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                  isActive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {isActive ? 'VISIBLE' : 'HIDDEN'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Collapsed Icon-Only Strip */
            <div className="flex-1 flex flex-col items-center py-4 gap-3">
              <button
                onClick={() => {
                  setIsSidebarOpen(true);
                  setActiveTab('situation');
                }}
                className={`p-2.5 rounded-xl transition-colors ${
                  activeTab === 'situation'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Situation Report"
              >
                <Activity className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setIsSidebarOpen(true);
                  setActiveTab('simulation');
                }}
                className={`p-2.5 rounded-xl transition-colors ${
                  activeTab === 'simulation'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Simulation Setup"
              >
                <Sliders className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setIsSidebarOpen(true);
                  setActiveTab('shelters');
                }}
                className={`p-2.5 rounded-xl transition-colors ${
                  activeTab === 'shelters'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Shelters Directory"
              >
                <Tent className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setIsSidebarOpen(true);
                  setActiveTab('supplies');
                }}
                className={`p-2.5 rounded-xl transition-colors ${
                  activeTab === 'supplies'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Relief Supplies"
              >
                <Package className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setIsSidebarOpen(true);
                  setActiveTab('layers');
                }}
                className={`p-2.5 rounded-xl transition-colors ${
                  activeTab === 'layers'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="GIS Layers"
              >
                <Layers className="w-5 h-5" />
              </button>
            </div>
          )}
        </aside>

        {/* ======================================================================= */}
        {/* RIGHT PANEL: LARGE INTERACTIVE GIS MAP (Highest Priority)               */}
        {/* ======================================================================= */}
        <main className="flex-1 relative h-full w-full overflow-hidden flex flex-col">
          {/* Leaflet Geospatial Canvas */}
          <div className="flex-1 relative w-full h-full min-h-[400px]">
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
              themeMode={themeMode}
            />

            {/* Drawing Mode Active Banner */}
            {activeDrawingMode !== 'none' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 animate-slide-down">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 py-2.5 rounded-full border border-blue-300 dark:border-blue-700 shadow-md flex items-center gap-3">
                  <Crosshair className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {activeDrawingMode === 'circle'
                      ? 'Click on the map to place epicenter circle'
                      : `Click on map to place polygon vertices (${draftPolygonPoints.length} placed)`}
                  </span>
                  {activeDrawingMode === 'polygon' && draftPolygonPoints.length >= 3 && (
                    <button
                      onClick={onFinishPolygon}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-[11px] font-bold"
                    >
                      Close Polygon
                    </button>
                  )}
                  <button
                    onClick={onClearDrawing}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Compact Floating GIS Inundation Legend */}
            <div className="absolute top-4 right-4 z-20">
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md p-3 max-w-[220px]">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    GIS Depth Legend
                  </span>
                  <button
                    onClick={() => setIsLegendExpanded(!isLegendExpanded)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    {isLegendExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isLegendExpanded && (
                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-blue-400/70 border border-blue-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">0.1m - 0.5m Moderate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-amber-400/80 border border-amber-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">0.5m - 1.0m Serious</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-red-500/90 border border-red-600 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">&gt;1.0m Road Cutoff</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Basemap:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">OpenStreetMap</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* BOTTOM TIMELINE PLAYBACK SCRUBBER                                     */}
          {/* ===================================================================== */}
          <div className="h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between z-20 shadow-xs flex-shrink-0">
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
                disabled={currentStepIndex <= 0}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                title="Previous step"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={onTogglePlay}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-transform active:scale-95"
                title={isPlaying ? 'Pause animation' : 'Play timeline animation'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() =>
                  onStepChange(
                    Math.min((simulationResponse?.timeline.length || 7) - 1, currentStepIndex + 1)
                  )
                }
                disabled={currentStepIndex >= (simulationResponse?.timeline.length || 7) - 1}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                title="Next step"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={() => onStepChange(0)}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Reset to T+0h"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto">
              {Array.from({ length: simulationResponse?.timeline.length || 7 }).map((_, idx) => {
                const isActive = idx === currentStepIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => onStepChange(idx)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs scale-105'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    T+{idx}h
                  </button>
                );
              })}
            </div>

            {/* Playback Speed Controls */}
            <div className="flex items-center gap-1 text-xs font-mono font-semibold">
              <span className="text-slate-400 mr-1 hidden md:inline text-[11px]">Speed:</span>
              {[1, 2, 4].map((speed) => (
                <button
                  key={speed}
                  onClick={() => onSpeedChange(speed)}
                  className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-slate-900 text-white dark:bg-blue-600 font-bold'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONSEQUENTIAL ACTION CONFIRMATION MODALS                               */}
      {/* ========================================================================= */}
      <ConfirmationModal
        isOpen={confirmSirenOpen}
        onClose={() => setConfirmSirenOpen(false)}
        onConfirm={() => {
          onTriggerSiren();
          triggerToast(
            isSirenActive
              ? 'Civil defense klaxon siren silenced.'
              : 'Civil defense klaxon alert activated across GCC operations centers.'
          );
        }}
        title={isSirenActive ? 'Silence Evacuation Siren?' : 'Activate Evacuation Klaxon Siren?'}
        description={
          isSirenActive
            ? 'This will deactivate the emergency klaxon audio alarm across all municipal stations.'
            : 'This will initiate a priority emergency warning banner across all municipal response consoles and log the evacuation siren in the official incident log.'
        }
        confirmLabel={isSirenActive ? 'Silence Klaxon' : 'Activate Siren'}
        variant="danger"
        icon={Volume2}
      />

      <ConfirmationModal
        isOpen={confirmAirliftOpen}
        onClose={() => setConfirmAirliftOpen(false)}
        onConfirm={() => {
          onTriggerAirlift();
          triggerToast('IAF Chetak helicopter sortie authorized from Tambaram AFS.');
        }}
        title="Authorize Airborne Helicopter Sortie?"
        description="This will deploy a simulated IAF Chetak search & rescue flight mission from Tambaram Air Force Base to the designated high-ground cluster with potable water and emergency medical cargo."
        confirmLabel="Authorize Sortie"
        variant="primary"
        icon={Plane}
      />
    </div>
  );
}

function ShipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.15" />
      <path d="M12 10V4" />
      <path d="m8 8 4-4 4 4" />
    </svg>
  );
}
