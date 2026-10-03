'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/dashboard/Header';
import MetricsOverview from '@/components/dashboard/MetricsOverview';
import MapContainer from '@/components/map/MapContainer';
import DisasterControls from '@/components/controls/DisasterControls';
import TimelinePlayer from '@/components/controls/TimelinePlayer';
import LayerToggle from '@/components/controls/LayerToggle';
import ResourcePanel from '@/components/dashboard/ResourcePanel';
import AllocationModal from '@/components/dashboard/AllocationModal';
import AIAdvisorPanel from '@/components/dashboard/AIAdvisorPanel';
import RouteInspectorModal from '@/components/map/RouteInspectorModal';

import {
  Coordinates,
  DisasterParameters,
  FloodZoneInput,
  PresetScenario,
  SimulationRequest,
  SimulationResponse,
  TimelineStep,
  ShelterEntity,
  WarehouseEntity,
  DistributionPointEntity,
  PopulationClusterEntity,
  InventoryStatus,
  ResourceAllocateRequest,
  RouteInspectionData,
  AIAdvisorData,
  StagingBaseEntity,
} from '@/lib/types';
import {
  CHENNAI_CENTER,
  CHENNAI_BOUNDS,
  CHENNAI_SHELTERS,
  CHENNAI_WAREHOUSES,
  CHENNAI_DISTRIBUTION_POINTS,
  CHENNAI_POPULATION_CLUSTERS,
  HISTORICAL_PRESETS,
  CHENNAI_STAGING_BASES,
} from '@/lib/constants';
import {
  getMapInit,
  checkHealth,
  runSimulation,
  allocateResources,
  getAIAdvisorInsights,
  dispatchAirliftSortie,
} from '@/lib/api';

import {
  SlidersHorizontal,
  Crosshair,
  X,
  Volume2,
  VolumeX,
  Plane,
  Brain,
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Flame,
  ShieldAlert,
  Compass,
} from 'lucide-react';

export default function DashboardPage() {
  // 1. Core Map Entities & Boundaries
  const [center, setCenter] = useState<Coordinates>(CHENNAI_CENTER);
  const [bounds, setBounds] = useState<[Coordinates, Coordinates]>(CHENNAI_BOUNDS);
  const [shelters, setShelters] = useState<ShelterEntity[]>(CHENNAI_SHELTERS);
  const [warehouses, setWarehouses] = useState<WarehouseEntity[]>(CHENNAI_WAREHOUSES);
  const [distributionPoints, setDistributionPoints] = useState<DistributionPointEntity[]>(
    CHENNAI_DISTRIBUTION_POINTS
  );
  const [populationClusters, setPopulationClusters] = useState<PopulationClusterEntity[]>(
    CHENNAI_POPULATION_CLUSTERS
  );
  const [stagingBases] = useState<StagingBaseEntity[]>(CHENNAI_STAGING_BASES);

  // 2. Telemetry & Backend Status
  const [isBackendLive, setIsBackendLive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 3. Disaster Parameters & Flood Zones Setup
  const [parameters, setParameters] = useState<DisasterParameters>({
    rainfall_intensity_mm_hr: 3,
    flood_depth_meters: 1.2,
    spread_rate_meters_hr: 180,
    duration_hours: 6,
  });

  const [activePresetId, setActivePresetId] = useState<string | null>(
    'preset_velachery_2015'
  );
  const [definedZones, setDefinedZones] = useState<FloodZoneInput[]>([
    {
      id: 'preset-velachery',
      type: 'polygon',
      coordinates: HISTORICAL_PRESETS[0].polygon_coordinates || [
        [12.968, 80.210],
        [12.975, 80.232],
        [12.992, 80.230],
        [12.990, 80.212],
        [12.975, 80.205],
      ],
      name: HISTORICAL_PRESETS[0].name,
    },
  ]);

  // Interactive Drawing State
  const [activeDrawingMode, setActiveDrawingMode] = useState<'none' | 'circle' | 'polygon'>('none');
  const [circleRadiusMeters, setCircleRadiusMeters] = useState<number>(2000);
  const [draftPolygonPoints, setDraftPolygonPoints] = useState<Coordinates[]>([]);
  const [draftCircleCenter, setDraftCircleCenter] = useState<Coordinates | null>(null);

  // 4. Simulation Execution & Timeline State
  const [simulationResponse, setSimulationResponse] = useState<SimulationResponse | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // 5. Layer Visibility
  const [visibleLayers, setVisibleLayers] = useState({
    flood: true,
    evacuation: true,
    supply: true,
    shelters: true,
    warehouses: true,
    distributionPoints: true,
    populationHeatmap: true,
  });

  // 6. UI Controls & Sidebars
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(true);
  const [isResourcePanelCollapsed, setIsResourcePanelCollapsed] = useState<boolean>(false);

  // 7. Allocation Modal State
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState<boolean>(false);
  const [allocateTarget, setAllocateTarget] = useState<{
    id: string;
    name: string;
    type: 'shelter' | 'point';
  } | null>(null);

  // 8. AI Tactical Advisor Panel State
  const [isAIAdvisorOpen, setIsAIAdvisorOpen] = useState<boolean>(false);
  const [advisorData, setAdvisorData] = useState<AIAdvisorData | null>(null);

  // 9. Route Inspector Modal State
  const [isRouteInspectorOpen, setIsRouteInspectorOpen] = useState<boolean>(false);
  const [inspectedRoute, setInspectedRoute] = useState<RouteInspectionData | null>(null);

  // 10. Citizen Evacuation Siren & Airlift Dispatcher Telemetry
  const [isSirenActive, setIsSirenActive] = useState<boolean>(false);
  const [airliftNotification, setAirliftNotification] = useState<string | null>(null);
  const sirenAudioContextRef = useRef<AudioContext | null>(null);
  const sirenOscillatorRef = useRef<OscillatorNode | null>(null);
  const sirenIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic Live Inventory Status
  const [liveInventory, setLiveInventory] = useState<InventoryStatus>({
    total_water_litres: 1080000,
    allocated_water_litres: 125000,
    available_water_litres: 955000,
    total_food_rations: 285000,
    allocated_food_rations: 42000,
    available_food_rations: 243000,
    total_medical_kits: 13800,
    allocated_medical_kits: 1200,
    available_medical_kits: 12600,
  });

  // Hydrate map and check health on mount
  useEffect(() => {
    async function init() {
      const [health, mapData, initialAdvisor] = await Promise.all([
        checkHealth(),
        getMapInit(),
        getAIAdvisorInsights(0, 18.4, 142000, 'preset_velachery_2015'),
      ]);
      setIsBackendLive(health.isLive);
      setAdvisorData(initialAdvisor);

      if (mapData) {
        setCenter(mapData.center);
        setBounds(mapData.bounds);
        setShelters(mapData.shelters);
        setWarehouses(mapData.warehouses);
        setDistributionPoints(mapData.distribution_points);
        setPopulationClusters(mapData.population_clusters);
      }

      if (!health.isLive) {
        setErrorMessage('FastAPI Backend Standby. Local Client Geospatial Simulator is active.');
      }

      if (mapData) {
        const stock = mapData.warehouses.reduce(
          (sum, warehouse) => ({
            water: sum.water + warehouse.supplies.water_litres,
            food: sum.food + warehouse.supplies.food_rations,
            medical: sum.medical + warehouse.supplies.medical_kits,
          }),
          { water: 0, food: 0, medical: 0 }
        );
        setLiveInventory({
          total_water_litres: stock.water,
          available_water_litres: stock.water,
          allocated_water_litres: 0,
          total_food_rations: stock.food,
          available_food_rations: stock.food,
          allocated_food_rations: 0,
          total_medical_kits: stock.medical,
          available_medical_kits: stock.medical,
          allocated_medical_kits: 0,
        });
      }
    }
    init();
  }, []);

  // Update AI Advisor when step changes
  useEffect(() => {
    if (simulationResponse) {
      const currentStep = simulationResponse.timeline[currentStepIndex];
      if (currentStep) {
        getAIAdvisorInsights(
          currentStep.hour,
          currentStep.metrics.total_flooded_area_sq_km,
          currentStep.metrics.total_affected_population,
          activePresetId
        ).then(setAdvisorData);
      }
    }
  }, [currentStepIndex, simulationResponse, activePresetId]);

  // Citizen Evacuation Siren Audio Synthesizer (Web Audio API)
  const handleToggleSiren = () => {
    if (isSirenActive) {
      // Stop siren
      if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
      if (sirenOscillatorRef.current) {
        try {
          sirenOscillatorRef.current.stop();
          sirenOscillatorRef.current.disconnect();
        } catch {}
        sirenOscillatorRef.current = null;
      }
      setIsSirenActive(false);
      return;
    }

    try {
      setIsSirenActive(true);
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        sirenAudioContextRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.18, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        let ascending = true;
        osc.frequency.setValueAtTime(550, ctx.currentTime);
        osc.start();
        sirenOscillatorRef.current = osc;

        // Modulate siren pitch every 750ms
        const interval = setInterval(() => {
          if (!sirenOscillatorRef.current) return;
          const curr = ctx.currentTime;
          if (ascending) {
            osc.frequency.linearRampToValueAtTime(950, curr + 0.7);
          } else {
            osc.frequency.linearRampToValueAtTime(550, curr + 0.7);
          }
          ascending = !ascending;
        }, 750);

        sirenIntervalRef.current = interval;

        // Auto-shutoff after 12 seconds to prevent audio fatigue
        setTimeout(() => {
          if (isSirenActive) {
            handleToggleSiren();
          }
        }, 12000);
      }
    } catch {
      setIsSirenActive(false);
    }
  };

  // One-Click Tactical Airlift Dispatch Handler
  const handleTriggerAirlift = async () => {
    // Play tactical radio transmission chime
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {}

    const res = await dispatchAirliftSortie();
    setAirliftNotification(
      `🚁 AIRLIFT SORTIE AUTHORIZED: ${res.callsign} (${res.aircraft}) airborne from AFS Tambaram. ETA: ${res.eta_mins} mins.`
    );

    setTimeout(() => {
      setAirliftNotification(null);
    }, 7000);
  };

  // Handle Map Clicks for drawing
  const handleMapClick = (coords: Coordinates) => {
    if (activeDrawingMode === 'circle') {
      setDraftCircleCenter(coords);
      const newZone: FloodZoneInput = {
        id: `circle_${Date.now()}`,
        type: 'circle',
        coordinates: [coords],
        radius_meters: circleRadiusMeters,
        name: `Custom Circle (${(circleRadiusMeters / 1000).toFixed(1)} km)`,
      };
      setDefinedZones([newZone]);
      setActiveDrawingMode('none');
      setActivePresetId(null);
    } else if (activeDrawingMode === 'polygon') {
      setDraftPolygonPoints((prev) => [...prev, coords]);
    }
  };

  const handleFinishPolygon = () => {
    if (draftPolygonPoints.length >= 3) {
      const closedCoords = [...draftPolygonPoints, draftPolygonPoints[0]];
      const newZone: FloodZoneInput = {
        id: `polygon_${Date.now()}`,
        type: 'polygon',
        coordinates: closedCoords,
        name: `Custom Polygon (${draftPolygonPoints.length} vertices)`,
      };
      setDefinedZones([newZone]);
      setDraftPolygonPoints([]);
      setActiveDrawingMode('none');
      setActivePresetId(null);
    }
  };

  const handleUndoLastPoint = () => {
    setDraftPolygonPoints((prev) => prev.slice(0, -1));
  };

  const handleClearDrawing = () => {
    setDraftPolygonPoints([]);
    setDraftCircleCenter(null);
    setActiveDrawingMode('none');
  };

  const handleSelectPreset = (preset: PresetScenario) => {
    setActivePresetId(preset.id);
    handleClearDrawing();

    setParameters({
      ...parameters,
      rainfall_intensity_mm_hr: preset.default_rainfall,
      flood_depth_meters: preset.default_depth,
      spread_rate_meters_hr: preset.default_spread,
    });

    const newZone: FloodZoneInput = {
      id: preset.id,
      type: preset.polygon_coordinates ? 'polygon' : 'circle',
      coordinates: preset.polygon_coordinates || [preset.center],
      radius_meters: preset.radius_meters,
      name: preset.name,
    };
    setDefinedZones([newZone]);

    // Recalculate AI advisor for the newly selected preset
    getAIAdvisorInsights(0, preset.radius_meters / 140, 120000, preset.id).then(setAdvisorData);
  };

  // Run Simulation Handler
  const handleRunSimulation = async () => {
    setErrorMessage('');
    setIsSimulating(true);
    setIsPlaying(false);
    try {
      const request: SimulationRequest = {
        flood_zones: definedZones,
        parameters,
      };
      const response = await runSimulation(request);
      setSimulationResponse(response);
      setIsBackendLive(true);
      setLiveInventory(response.timeline[response.timeline.length - 1].inventory_status);
      setCurrentStepIndex(0);

      // Refresh AI advisor
      getAIAdvisorInsights(
        0,
        response.timeline[0].metrics.total_flooded_area_sq_km,
        response.timeline[0].metrics.total_affected_population,
        activePresetId
      ).then(setAdvisorData);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Simulation computation failed.');
      setIsBackendLive((await checkHealth()).isLive);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleToggleLayer = (layerName: keyof typeof visibleLayers) => {
    setVisibleLayers((prev) => ({
      ...prev,
      [layerName]: !prev[layerName],
    }));
  };

  const handleOpenAllocateModal = (targetId: string, targetType: 'shelter' | 'point') => {
    let name = targetId;
    if (targetType === 'shelter') {
      const sh = shelters.find((s) => s.id === targetId);
      if (sh) name = sh.name;
    } else {
      const dp = distributionPoints.find((d) => d.id === targetId);
      if (dp) name = dp.name;
    }
    setAllocateTarget({ id: targetId, name, type: targetType });
    setIsAllocateModalOpen(true);
  };

  const handleConfirmAllocate = async (request: ResourceAllocateRequest) => {
    const res = await allocateResources(request);
    if (!res.success) throw new Error(res.message || 'Allocation failed.');
    setLiveInventory(res.updated_inventory);
  };

  // Route Inspector Handler
  const handleSelectRoute = (routeData: RouteInspectionData) => {
    setInspectedRoute(routeData);
    setIsRouteInspectorOpen(true);
  };

  const handleReroute = (routeId: string) => {
    setAirliftNotification(`Route ${routeId} successfully rerouted via High-Ground Bypass.`);
    setTimeout(() => setAirliftNotification(null), 4000);
  };

  const handleUpgradeMode = (routeId: string, newMode: 'amphibious' | 'helicopter') => {
    setAirliftNotification(
      `Route ${routeId} upgraded to ${newMode === 'helicopter' ? 'IAF Chetak Aerial Sortie' : 'NDRF Gemini Amphibious Craft'}. Clearance secured.`
    );
    setTimeout(() => setAirliftNotification(null), 4000);
  };

  const currentStep = simulationResponse?.timeline[currentStepIndex] || null;
  const isDrawingActive = activeDrawingMode !== 'none';

  return (
    <div
      className={`flex flex-col min-h-screen lg:h-screen w-full overflow-x-hidden lg:overflow-hidden bg-slate-950 ${
        isDrawingActive ? 'drawing-mode-active' : ''
      } ${isSirenActive ? 'siren-active-vignette' : ''}`}
    >
      {/* 1. Tactical Command Center Top Bar */}
      <Header
        isBackendLive={isBackendLive}
        activeTimeStep={currentStep?.hour ?? 0}
        threatLevel={advisorData?.risk_radar_level?.includes('CRITICAL') ? 'DEFCON 1' : 'DEFCON 2'}
        onToggleAIAdvisor={() => setIsAIAdvisorOpen(!isAIAdvisorOpen)}
        isAIAdvisorOpen={isAIAdvisorOpen}
        onTriggerSiren={handleToggleSiren}
        isSirenActive={isSirenActive}
        onTriggerAirlift={handleTriggerAirlift}
      />

      {/* Emergency Siren Active Warning Banner */}
      {isSirenActive && (
        <div className="bg-red-600 text-white px-4 py-2 text-xs font-mono font-bold flex items-center justify-between shadow-glow-red animate-pulse z-30">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 animate-bounce" />
            <span>
              CRITICAL CITIZEN EVACUATION SIREN ACTIVATED • AUDIO KLAXON TRANSMITTING TO 2,410 CHENNAI CELLULAR TOWERS
            </span>
          </div>
          <button
            onClick={handleToggleSiren}
            className="underline hover:text-red-200 uppercase tracking-wider"
          >
            SILENCE SIREN
          </button>
        </div>
      )}

      {/* Tactical Airlift Notification Toast */}
      {airliftNotification && (
        <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-950 text-purple-200 border-b border-purple-500/50 px-4 py-2 text-xs font-mono font-bold flex items-center gap-3 animate-slide-down z-30 shadow-glow-purple">
          <Plane className="w-4 h-4 text-purple-300 animate-pulse" />
          <span>{airliftNotification}</span>
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="bg-red-950/90 border-b border-red-800 px-4 py-2 text-xs font-mono text-red-200 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Top Telemetry Metrics Overview Strip */}
      <div className="px-3 md:px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 z-20">
        <MetricsOverview currentStep={currentStep} />
      </div>

      {/* 3. High-Tech Quick Action Bar */}
      <div className="px-3 md:px-4 py-2 bg-slate-900/90 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-2 z-20 text-xs font-mono">
        {/* Scenario Presets Quick-Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mr-1 hidden sm:inline">
            Scenarios:
          </span>
          {HISTORICAL_PRESETS.slice(0, 4).map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-glow-cyan font-bold'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>

        {/* Tactical Actions: One-Click Airlift, Evacuation Siren, Run Simulation */}
        <div className="flex items-center gap-2 ml-auto">
          {/* One-Click Airlift Dispatch */}
          <button
            onClick={handleTriggerAirlift}
            className="px-2.5 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-purple-200 flex items-center gap-1.5 font-bold transition-all hover:scale-105 shadow-glow-purple"
            title="Dispatch IAF Chetak Search & Rescue Helicopter"
          >
            <Plane className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden sm:inline">Airlift Dispatch</span>
          </button>

          {/* Citizen Evacuation Siren simulator */}
          <button
            onClick={handleToggleSiren}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 font-bold transition-all hover:scale-105 ${
              isSirenActive
                ? 'bg-red-600 text-white border-red-400 shadow-glow-red animate-pulse'
                : 'bg-red-950/80 hover:bg-red-900 border-red-700/80 text-red-200 shadow-glow-red'
            }`}
            title="Simulate Evacuation Klaxon Siren"
          >
            {isSirenActive ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-red-300" />}
            <span className="hidden sm:inline">Evac Siren</span>
          </button>

          {/* Run Hydrological Simulation Trigger */}
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-black uppercase tracking-wider transition-all shadow-glow-cyan ${
              isSimulating
                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 hover:scale-105'
            }`}
          >
            {isSimulating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Computing...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Main Geospatial Viewport */}
      <div className="flex-1 relative w-full flex flex-col lg:block gap-4 lg:min-h-0 lg:overflow-hidden">
        {/* Full-screen Leaflet Map */}
        <div className="h-[55vh] min-h-[400px] lg:h-full lg:min-h-0">
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
            onMapClick={handleMapClick}
            visibleLayers={visibleLayers}
            onSelectShelter={(id) => handleOpenAllocateModal(id, 'shelter')}
            onSelectDistributionPoint={(id) => handleOpenAllocateModal(id, 'point')}
            onSelectRoute={handleSelectRoute}
          />
        </div>

        {/* Drawing Mode Indicator Banner */}
        {isDrawingActive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 animate-slide-down">
            <div className="glass-panel rounded-full px-5 py-2.5 flex items-center gap-3 shadow-glow-cyan">
              <Crosshair className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-sm font-medium text-slate-200">
                {activeDrawingMode === 'circle'
                  ? 'Click map to place flood epicenter'
                  : `Click to add polygon points (${draftPolygonPoints.length} placed)`}
              </span>
              <button
                onClick={handleClearDrawing}
                className="p-1 hover:bg-slate-700/60 rounded-full text-slate-400 hover:text-slate-200 transition-colors"
                title="Cancel drawing"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Floating Left Drawer: Disaster Parameter Controls & Presets */}
        <div
          className={`relative mx-4 lg:mx-0 lg:absolute lg:top-4 lg:left-4 z-20 transition-all duration-300 ease-out ${
            isControlsOpen ? 'lg:w-80 xl:w-96' : 'w-10'
          }`}
        >
          {isControlsOpen ? (
            <div className="relative animate-slide-right">
              <button
                onClick={() => setIsControlsOpen(false)}
                className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700/50 transition-all duration-200 z-10 hover:scale-105"
                title="Minimize scenario setup panel"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
              <DisasterControls
                parameters={parameters}
                onParametersChange={setParameters}
                activeDrawingMode={activeDrawingMode}
                setActiveDrawingMode={setActiveDrawingMode}
                circleRadiusMeters={circleRadiusMeters}
                setCircleRadiusMeters={setCircleRadiusMeters}
                draftPolygonPoints={draftPolygonPoints}
                onFinishPolygon={handleFinishPolygon}
                onClearDrawing={handleClearDrawing}
                onUndoLastPoint={handleUndoLastPoint}
                activePresetId={activePresetId}
                onSelectPreset={handleSelectPreset}
                onRunSimulation={handleRunSimulation}
                isSimulating={isSimulating}
                definedZonesCount={definedZones.length}
              />
            </div>
          ) : (
            <button
              onClick={() => setIsControlsOpen(true)}
              className="p-3 glass-panel hover:bg-slate-800/80 text-cyan-400 rounded-xl shadow-panel flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-glow-cyan"
              title="Open disaster scenario setup panel"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Floating Bottom Center: Timeline Player & Layer Toggles */}
        <div className="relative lg:absolute lg:bottom-4 lg:left-1/2 lg:-translate-x-1/2 w-full lg:max-w-2xl px-4 z-20 flex flex-col gap-2.5">
          {simulationResponse && (
            <TimelinePlayer
              totalSteps={simulationResponse.timeline.length}
              currentStepIndex={currentStepIndex}
              onStepChange={setCurrentStepIndex}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              playbackSpeed={playbackSpeed}
              onSpeedChange={setPlaybackSpeed}
              stepDescription={currentStep?.description}
            />
          )}
          <div className="flex justify-center">
            <LayerToggle layers={visibleLayers} onToggleLayer={handleToggleLayer} />
          </div>
        </div>

        {/* Floating Right Docked Sidebar: Resource Inventory & Supply Chain */}
        <ResourcePanel
          inventory={liveInventory}
          shelters={shelters}
          distributionPoints={distributionPoints}
          shelterAllocations={currentStep?.shelter_allocations || []}
          onOpenAllocateModal={handleOpenAllocateModal}
          isCollapsed={isResourcePanelCollapsed}
          onToggleCollapse={() => setIsResourcePanelCollapsed(!isResourcePanelCollapsed)}
        />

        {/* AI Tactical Advisor Panel */}
        <AIAdvisorPanel
          isOpen={isAIAdvisorOpen}
          onClose={() => setIsAIAdvisorOpen(false)}
          advisorData={advisorData}
          onRefresh={() => {
            getAIAdvisorInsights(
              currentStep?.hour ?? 0,
              currentStep?.metrics?.total_flooded_area_sq_km ?? 18.4,
              currentStep?.metrics?.total_affected_population ?? 142000,
              activePresetId
            ).then(setAdvisorData);
          }}
          onDeployAdvice={(id) => {
            setAirliftNotification(`AI Directive ${id} dispatched to Joint Rescue Units.`);
            setTimeout(() => setAirliftNotification(null), 4000);
          }}
        />

        {/* Route Inspector HUD Modal */}
        <RouteInspectorModal
          isOpen={isRouteInspectorOpen}
          onClose={() => setIsRouteInspectorOpen(false)}
          route={inspectedRoute}
          onReroute={handleReroute}
          onUpgradeMode={handleUpgradeMode}
        />

        {/* Interactive Supply Allocation Modal */}
        {allocateTarget && (
          <AllocationModal
            isOpen={isAllocateModalOpen}
            onClose={() => setIsAllocateModalOpen(false)}
            targetId={allocateTarget.id}
            targetName={allocateTarget.name}
            targetType={allocateTarget.type}
            warehouses={warehouses}
            inventory={liveInventory}
            onConfirmAllocate={handleConfirmAllocate}
          />
        )}
      </div>
    </div>
  );
}
