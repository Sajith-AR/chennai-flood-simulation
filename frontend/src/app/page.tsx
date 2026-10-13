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
import ClassicDashboard from '@/components/classic/ClassicDashboard';
import SentinelCommandCenter from '@/components/sentinel/SentinelCommandCenter';

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
  Waves,
  Users,
  Warehouse,
  Tent,
  Truck,
  HeartPulse,
  Droplets,
  Package,
  BarChart3,
  CloudRain,
  Layers,
  Settings2,
  Activity,
  FileText,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Maximize2,
  TrendingUp,
  Anchor,
  ChevronRight,
  Info,
  Building2,
} from 'lucide-react';

export type DashboardSection = 'map' | 'scenarios' | 'logistics' | 'ai-advisor' | 'analytics';

export default function DashboardPage() {
  // UI Mode: Sentinel Command Center (flagship) vs Classic Government Portal vs Tactical HUD
  const [uiMode, setUiMode] = useState<'sentinel' | 'classic' | 'tactical'>('sentinel');

  // 0. Active Section State (for Tactical HUD mode)
  const [activeSection, setActiveSection] = useState<DashboardSection>('map');

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

  // 6. UI Controls & Sidebars (drawers default to closed to maximize map visibility)
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(false);
  const [isResourcePanelCollapsed, setIsResourcePanelCollapsed] = useState<boolean>(true);

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
  const [advisorLanguage, setAdvisorLanguage] = useState<'english' | 'tamil'>('english');
  const [copiedBroadcast, setCopiedBroadcast] = useState<boolean>(false);

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
      const step = simulationResponse.timeline[currentStepIndex];
      if (step) {
        getAIAdvisorInsights(
          step.hour,
          step.metrics.total_flooded_area_sq_km,
          step.metrics.total_affected_population,
          activePresetId
        ).then(setAdvisorData);
      }
    }
  }, [currentStepIndex, simulationResponse, activePresetId]);

  // Citizen Evacuation Siren Audio Synthesizer (Web Audio API)
  const handleToggleSiren = () => {
    if (isSirenActive) {
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
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  const handleSelectShelter = (shelterId: string) => {
    handleOpenAllocateModal(shelterId, 'shelter');
  };

  const handleSelectDistributionPoint = (pointId: string) => {
    handleOpenAllocateModal(pointId, 'point');
  };

  const handleConfirmAllocate = async (request: ResourceAllocateRequest) => {
    const res = await allocateResources(request);
    if (!res.success) throw new Error(res.message || 'Allocation failed.');
    setLiveInventory(res.updated_inventory);
  };

  const handleSelectRoute = (data: RouteInspectionData) => {
    setInspectedRoute(data);
    setIsRouteInspectorOpen(true);
  };

  const handleReroute = (routeId: string) => {
    setAirliftNotification(
      `Route ${routeId} dynamically recalculated around submerged road sections. High elevation arterial bypass engaged.`
    );
    setTimeout(() => setAirliftNotification(null), 4000);
  };

  const handleUpgradeMode = (routeId: string, newMode: 'amphibious' | 'helicopter') => {
    setAirliftNotification(
      `Route ${routeId} upgraded to ${
        newMode === 'helicopter' ? 'IAF Chetak Aerial Sortie' : 'NDRF Gemini Amphibious Craft'
      }. Clearance secured.`
    );
    setTimeout(() => setAirliftNotification(null), 4000);
  };

  const handleCopyAlert = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBroadcast(true);
    setTimeout(() => setCopiedBroadcast(false), 2500);
  };

  const currentStep = simulationResponse?.timeline[currentStepIndex] || null;
  const isDrawingActive = activeDrawingMode !== 'none';

  // Section Navigation Definition
  const SECTIONS: {
    id: DashboardSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tag: string;
  }[] = [
    { id: 'map', label: 'Tactical Map', icon: Compass, tag: 'Live Geospatial' },
    { id: 'scenarios', label: 'Hydrology & Scenarios', icon: CloudRain, tag: `${HISTORICAL_PRESETS.length} Presets` },
    { id: 'logistics', label: 'Relief Logistics & Shelters', icon: Package, tag: `${shelters.length} Shelters` },
    { id: 'ai-advisor', label: 'AI Decision Support', icon: Brain, tag: advisorData?.risk_radar_level?.split(' ')[0] || 'DEFCON 2' },
    { id: 'analytics', label: 'Operations Analytics', icon: Activity, tag: 'Fleet & KPIs' },
  ];

  if (uiMode === 'sentinel') {
    return (
      <div className="flex flex-col min-h-screen lg:h-screen w-full overflow-hidden bg-[#05080f] text-slate-100">
        <SentinelCommandCenter
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
          setActiveDrawingMode={setActiveDrawingMode}
          circleRadiusMeters={circleRadiusMeters}
          setCircleRadiusMeters={setCircleRadiusMeters}
          draftPolygonPoints={draftPolygonPoints}
          draftCircleCenter={draftCircleCenter}
          onMapClick={handleMapClick}
          onFinishPolygon={handleFinishPolygon}
          onClearDrawing={handleClearDrawing}
          visibleLayers={visibleLayers}
          onToggleLayer={handleToggleLayer}
          onSelectShelter={handleSelectShelter}
          onSelectDistributionPoint={handleSelectDistributionPoint}
          onSelectRoute={handleSelectRoute}
          onOpenAllocateModal={handleOpenAllocateModal}
          parameters={parameters}
          onParametersChange={setParameters}
          activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset}
          onRunSimulation={handleRunSimulation}
          isSimulating={isSimulating}
          simulationResponse={simulationResponse}
          currentStepIndex={currentStepIndex}
          onStepChange={setCurrentStepIndex}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          liveInventory={liveInventory}
          advisorData={advisorData}
          isBackendLive={isBackendLive}
          onTriggerSiren={handleToggleSiren}
          isSirenActive={isSirenActive}
          onTriggerAirlift={handleTriggerAirlift}
          onToggleUIMode={() => setUiMode('classic')}
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
    );
  }

  if (uiMode === 'classic') {
    return (
      <div className="flex flex-col min-h-screen lg:h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
        <ClassicDashboard
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
          setActiveDrawingMode={setActiveDrawingMode}
          circleRadiusMeters={circleRadiusMeters}
          setCircleRadiusMeters={setCircleRadiusMeters}
          draftPolygonPoints={draftPolygonPoints}
          draftCircleCenter={draftCircleCenter}
          onMapClick={handleMapClick}
          onFinishPolygon={handleFinishPolygon}
          onClearDrawing={handleClearDrawing}
          visibleLayers={visibleLayers}
          onToggleLayer={handleToggleLayer}
          onSelectShelter={handleSelectShelter}
          onSelectDistributionPoint={handleSelectDistributionPoint}
          onSelectRoute={handleSelectRoute}
          onOpenAllocateModal={handleOpenAllocateModal}
          parameters={parameters}
          onParametersChange={setParameters}
          activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset}
          onRunSimulation={handleRunSimulation}
          isSimulating={isSimulating}
          simulationResponse={simulationResponse}
          currentStepIndex={currentStepIndex}
          onStepChange={setCurrentStepIndex}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          liveInventory={liveInventory}
          advisorData={advisorData}
          isBackendLive={isBackendLive}
          onTriggerSiren={handleToggleSiren}
          isSirenActive={isSirenActive}
          onTriggerAirlift={handleTriggerAirlift}
          uiMode={uiMode}
          onToggleUIMode={() => setUiMode('sentinel')}
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
    );
  }

  return (
    <div
      className={`flex flex-col min-h-screen lg:h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100 ${
        isDrawingActive ? 'drawing-mode-active' : ''
      } ${isSirenActive ? 'siren-active-vignette' : ''}`}
    >
      {/* 1. Tactical Command Center Top Header */}
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
            className="underline hover:text-red-200 uppercase tracking-wider font-mono text-[11px]"
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
        <div
          role="alert"
          className="bg-red-950/90 border-b border-red-800 px-4 py-2 text-xs font-mono text-red-200 flex items-center gap-2"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Structured Section Navigation Ribbon */}
      <div className="px-3 md:px-5 py-2 bg-slate-900/95 border-b border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 z-30 select-none shadow-md">
        {/* Clean Segmented Section Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 text-cyan-300 border-cyan-400 shadow-glow-cyan'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{sec.label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {sec.tag}
                </span>
              </button>
            );
          })}
        </div>

        {/* Global Tactical Action Triggers */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Quick Scenario Preset Pills */}
          <div className="hidden xl:flex items-center gap-1 text-[11px] font-mono mr-2 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-500 font-bold uppercase text-[9px] mr-1">Preset:</span>
            {HISTORICAL_PRESETS.slice(0, 3).map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  activePresetId === p.id
                    ? 'bg-cyan-900 text-cyan-200 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Airlift Dispatch Trigger */}
          <button
            onClick={handleTriggerAirlift}
            className="px-2.5 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-purple-200 flex items-center gap-1.5 font-mono text-xs font-bold transition-all hover:scale-105 shadow-glow-purple"
            title="Dispatch IAF Chetak Search & Rescue Helicopter Sortie"
          >
            <Plane className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden sm:inline">Airlift Sortie</span>
          </button>

          {/* Citizen Evacuation Klaxon Siren */}
          <button
            onClick={handleToggleSiren}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 font-mono text-xs font-bold transition-all hover:scale-105 ${
              isSirenActive
                ? 'bg-red-600 text-white border-red-400 shadow-glow-red animate-pulse'
                : 'bg-red-950/80 hover:bg-red-900 border-red-700/80 text-red-200 shadow-glow-red'
            }`}
            title="Trigger Citizen Warning Siren Klaxon"
          >
            {isSirenActive ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-red-300" />}
            <span className="hidden sm:inline">Evac Klaxon</span>
          </button>

          {/* Compute Simulation Trigger */}
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-mono text-xs font-black uppercase tracking-wider transition-all shadow-glow-cyan ${
              isSimulating
                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 hover:scale-105'
            }`}
          >
            {isSimulating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate</span>
              </>
            )}
          </button>

          {/* Toggle to Classic Institutional Portal */}
          <button
            onClick={() => setUiMode('classic')}
            className="px-2.5 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-700/80 text-blue-200 flex items-center gap-1.5 font-sans text-xs font-semibold transition-all hover:scale-105"
            title="Switch to GCC / TNSDMA Classic Government Portal"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">Classic Portal</span>
          </button>
        </div>
      </div>

      {/* 3. Section Content Viewports */}
      <div className="flex-1 relative w-full overflow-hidden flex flex-col">
        {/* ========================================================================= */}
        {/* SECTION 1: TACTICAL GEOSPATIAL MAP (Clean, Uncluttered, Maximum Area)     */}
        {/* ========================================================================= */}
        {activeSection === 'map' && (
          <div className="flex-1 relative w-full h-full min-h-[500px] overflow-hidden">
            {/* Interactive Leaflet Map */}
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
                onMapClick={handleMapClick}
                visibleLayers={visibleLayers}
                onSelectShelter={handleSelectShelter}
                onSelectDistributionPoint={handleSelectDistributionPoint}
                onSelectRoute={handleSelectRoute}
              />
            </div>

            {/* Drawing Mode Indicator Banner */}
            {isDrawingActive && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 animate-slide-down">
                <div className="glass-panel-strong rounded-full px-5 py-2.5 flex items-center gap-3 shadow-glow-cyan border border-cyan-400/50">
                  <Crosshair className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {activeDrawingMode === 'circle'
                      ? 'Click map to place flood epicenter circle'
                      : `Click map to place polygon vertices (${draftPolygonPoints.length} placed)`}
                  </span>
                  {activeDrawingMode === 'polygon' && draftPolygonPoints.length >= 3 && (
                    <button
                      onClick={handleFinishPolygon}
                      className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-[10px]"
                    >
                      Finish Polygon
                    </button>
                  )}
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

            {/* Top Tactical Floating Toolbar (Quick Dock Toggles) */}
            <div className="absolute top-3 left-4 z-20 flex items-center gap-2">
              <button
                onClick={() => setIsControlsOpen(!isControlsOpen)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-panel ${
                  isControlsOpen
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-glow-cyan'
                    : 'glass-panel text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
                title="Toggle Scenario Setup Parameters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Scenario Setup</span>
              </button>

              <button
                onClick={() => setIsResourcePanelCollapsed(!isResourcePanelCollapsed)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-panel ${
                  !isResourcePanelCollapsed
                    ? 'bg-amber-950 text-amber-300 border-amber-400 shadow-glow-amber'
                    : 'glass-panel text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
                title="Toggle Resource Logistics Panel"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Relief Supplies</span>
              </button>

              <button
                onClick={() => setIsAIAdvisorOpen(!isAIAdvisorOpen)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-panel ${
                  isAIAdvisorOpen
                    ? 'bg-purple-950 text-purple-300 border-purple-400 shadow-glow-purple'
                    : 'glass-panel text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
                title="Open AI Tactical Insights"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>AI Insights</span>
              </button>
            </div>

            {/* Slide-out Left Drawer: Disaster Parameter Controls (Only open on demand) */}
            {isControlsOpen && (
              <div className="absolute top-14 left-4 z-20 w-80 xl:w-96 animate-slide-right max-h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar">
                <div className="relative">
                  <button
                    onClick={() => setIsControlsOpen(false)}
                    className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700/50 transition-all z-10"
                    title="Close setup drawer"
                  >
                    <X className="w-3.5 h-3.5" />
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
              </div>
            )}

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

            {/* Bottom Dock: Timeline Player & Layer Toggles */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20 flex flex-col gap-2 pointer-events-none">
              <div className="pointer-events-auto">
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
              </div>
              <div className="flex justify-center pointer-events-auto">
                <LayerToggle layers={visibleLayers} onToggleLayer={handleToggleLayer} />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: HYDROLOGY & SCENARIOS (Dedicated Physics & Presets Workspace)  */}
        {/* ========================================================================= */}
        {activeSection === 'scenarios' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
            {/* Section Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <CloudRain className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-mono font-bold text-slate-100">
                    Hydrologic Simulation Engine & Scenario Presets
                  </h2>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Configure multi-tier spatio-temporal inundation models, digital elevation contours, and historical presets.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveDrawingMode('circle');
                    setActiveSection('map');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Draw Circle on Map</span>
                </button>
                <button
                  onClick={() => {
                    setActiveDrawingMode('polygon');
                    setActiveSection('map');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Draw Polygon on Map</span>
                </button>
                <button
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-glow-cyan"
                >
                  {isSimulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>Run Simulation</span>
                </button>
              </div>
            </div>

            {/* 2-Column Section Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Historical Scenario Presets Grid */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Historical Disaster Presets
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Click to load verified GCC hydrological parameters
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {HISTORICAL_PRESETS.map((preset) => {
                    const isSelected = activePresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-br from-cyan-950/80 via-slate-900 to-blue-950/80 border-cyan-400 shadow-glow-cyan'
                            : 'glass-panel border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-mono font-bold text-slate-100">{preset.name}</span>
                            {isSelected && (
                              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono font-bold border border-cyan-500/40">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                            {preset.description}
                          </p>
                        </div>

                        <div className="pt-2.5 border-t border-slate-800/60 grid grid-cols-3 gap-2 text-[10px] font-mono">
                          <div>
                            <span className="text-slate-500 block">Rainfall</span>
                            <span className="text-cyan-300 font-bold">{preset.default_rainfall} mm/hr</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Depth</span>
                            <span className="text-amber-300 font-bold">{preset.default_depth} m</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Spread</span>
                            <span className="text-purple-300 font-bold">{preset.default_spread} m/h</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Active Flood Zones Coordinates Ledger */}
                <div className="glass-panel p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      Active Flood Zone Enclosures ({definedZones.length})
                    </span>
                    <button
                      onClick={handleClearDrawing}
                      className="text-[10px] text-slate-400 hover:text-slate-200 font-mono underline"
                    >
                      Clear Custom Zones
                    </button>
                  </div>
                  <div className="space-y-2">
                    {definedZones.map((z, idx) => (
                      <div
                        key={z.id || idx}
                        className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 text-xs font-mono flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-400" />
                          <span className="text-slate-200 font-bold">{z.name}</span>
                          <span className="text-slate-500 text-[10px]">({z.type})</span>
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          {z.type === 'circle'
                            ? `Radius: ${(z.radius_meters || 2000) / 1000} km`
                            : `${z.coordinates.length} Vertices`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Physical Hydrology Controls Sliders */}
              <div className="lg:col-span-5 space-y-4">
                <div className="glass-panel-strong p-5 rounded-xl border border-cyan-500/20 shadow-panel space-y-5">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Settings2 className="w-4 h-4" />
                      Hydrologic Physics Parameters
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Calibrate hydrodynamic parameters for surface water spreading and drainage channel backflow.
                    </p>
                  </div>

                  {/* 1. Rainfall Intensity */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">Rainfall Torrent Intensity</span>
                      <span className="text-cyan-400 font-bold">
                        {parameters.rainfall_intensity_mm_hr * 40} mm/hr (Tier {parameters.rainfall_intensity_mm_hr})
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={parameters.rainfall_intensity_mm_hr}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          rainfall_intensity_mm_hr: Number(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>Advisory (40mm)</span>
                      <span>Moderate (80mm)</span>
                      <span>Severe (120mm)</span>
                      <span>Torrential (200mm)</span>
                    </div>
                  </div>

                  {/* 2. Initial Inundation Depth */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">Initial Epicenter Water Depth</span>
                      <span className="text-amber-400 font-bold">{parameters.flood_depth_meters.toFixed(1)} m</span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={3.5}
                      step={0.1}
                      value={parameters.flood_depth_meters}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          flood_depth_meters: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>0.2m (Shallow)</span>
                      <span>1.2m (Severe)</span>
                      <span>2.5m (Catastrophic)</span>
                      <span>3.5m</span>
                    </div>
                  </div>

                  {/* 3. Radial Spread Rate */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">Radial Expansion Spread Rate</span>
                      <span className="text-purple-400 font-bold">{parameters.spread_rate_meters_hr} m / hour</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={500}
                      step={25}
                      value={parameters.spread_rate_meters_hr}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          spread_rate_meters_hr: Number(e.target.value),
                        })
                      }
                      className="w-full accent-purple-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>50 m/h</span>
                      <span>250 m/h</span>
                      <span>500 m/h</span>
                    </div>
                  </div>

                  {/* 4. Timeline Duration */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">Simulation Step Duration</span>
                      <span className="text-blue-400 font-bold">{parameters.duration_hours} Hours</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={12}
                      step={1}
                      value={parameters.duration_hours}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          duration_hours: Number(e.target.value),
                        })
                      }
                      className="w-full accent-blue-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>2h (Flash Flood)</span>
                      <span>6h (Standard War Room)</span>
                      <span>12h (Extended Surge)</span>
                    </div>
                  </div>

                  {/* Trigger Action */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <button
                      onClick={handleRunSimulation}
                      disabled={isSimulating}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-glow-cyan transition-all"
                    >
                      {isSimulating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Computing NetworkX & OR-Tools...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Compute Spatio-Temporal Flood Simulation</span>
                        </>
                      )}
                    </button>
                    {simulationResponse && (
                      <button
                        onClick={() => setActiveSection('map')}
                        className="w-full mt-2 py-2 rounded-lg glass-panel text-cyan-300 hover:text-cyan-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5"
                      >
                        <span>View Animated Replay on Tactical Map</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: RELIEF LOGISTICS & SHELTERS (Sphere Standards & Warehouses)    */}
        {/* ========================================================================= */}
        {activeSection === 'logistics' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-mono font-bold text-slate-100">
                    Sphere Standards Relief Logistics & GCC Shelter Network
                  </h2>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Real-time potable water, food rations, trauma kits tracking across 5 strategic relief depots and 12 verified shelters.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Total Available Stock:</span>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                  {liveInventory.available_water_litres.toLocaleString()} L Water
                </span>
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950 px-2.5 py-1 rounded-lg border border-amber-500/30">
                  {liveInventory.available_food_rations.toLocaleString()} Rations
                </span>
              </div>
            </div>

            {/* 1. Sphere Standards Global Inventory Ledger Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div className="glass-panel p-4 rounded-xl border border-cyan-500/30">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Potable Water
                  </span>
                  <span>Sphere Std</span>
                </div>
                <div className="text-xl font-bold font-mono text-cyan-200">
                  {liveInventory.available_water_litres.toLocaleString()}
                  <span className="text-xs text-slate-400 font-normal ml-1">L</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 font-mono flex justify-between">
                  <span>Allocated: {liveInventory.allocated_water_litres.toLocaleString()} L</span>
                  <span className="text-cyan-400 font-bold">
                    {Math.round((liveInventory.allocated_water_litres / (liveInventory.total_water_litres || 1)) * 100)}%
                  </span>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-amber-500/30">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                    <Package className="w-3.5 h-3.5 text-amber-400" /> Food Rations
                  </span>
                  <span>2,100 kcal</span>
                </div>
                <div className="text-xl font-bold font-mono text-amber-200">
                  {liveInventory.available_food_rations.toLocaleString()}
                  <span className="text-xs text-slate-400 font-normal ml-1">packs</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 font-mono flex justify-between">
                  <span>Allocated: {liveInventory.allocated_food_rations.toLocaleString()}</span>
                  <span className="text-amber-400 font-bold">
                    {Math.round((liveInventory.allocated_food_rations / (liveInventory.total_food_rations || 1)) * 100)}%
                  </span>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-red-500/30">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5 text-red-300 font-bold">
                    <HeartPulse className="w-3.5 h-3.5 text-red-400" /> Trauma Medical Kits
                  </span>
                  <span>Level 1 SAR</span>
                </div>
                <div className="text-xl font-bold font-mono text-red-200">
                  {liveInventory.available_medical_kits.toLocaleString()}
                  <span className="text-xs text-slate-400 font-normal ml-1">kits</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 font-mono flex justify-between">
                  <span>Allocated: {liveInventory.allocated_medical_kits.toLocaleString()}</span>
                  <span className="text-red-400 font-bold">
                    {Math.round((liveInventory.allocated_medical_kits / (liveInventory.total_medical_kits || 1)) * 100)}%
                  </span>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-purple-500/30">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5 text-purple-300 font-bold">
                    <Anchor className="w-3.5 h-3.5 text-purple-400" /> Life Jackets
                  </span>
                  <span>NDRF Marine</span>
                </div>
                <div className="text-xl font-bold font-mono text-purple-200">
                  12,400
                  <span className="text-xs text-slate-400 font-normal ml-1">units</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 font-mono flex justify-between">
                  <span>Amphibious Fleet Ready</span>
                  <span className="text-purple-400 font-bold">100%</span>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-blue-500/30">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5 text-blue-300 font-bold">
                    <Radio className="w-3.5 h-3.5 text-blue-400" /> Satellite Radios
                  </span>
                  <span>HAM / GSAT</span>
                </div>
                <div className="text-xl font-bold font-mono text-blue-200">
                  240
                  <span className="text-xs text-slate-400 font-normal ml-1">nodes</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 font-mono flex justify-between">
                  <span>Zero-Cell Connectivity</span>
                  <span className="text-blue-400 font-bold">ACTIVE</span>
                </div>
              </div>
            </div>

            {/* 2. Strategic Relief Warehouses Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-cyan-400" />
                Strategic Relief Depots (5 Warehouses)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {warehouses.map((wh) => (
                  <div key={wh.id} className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-mono font-bold text-slate-100">{wh.name}</span>
                        <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded font-mono">
                          DEPOT
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono line-clamp-1 mb-2.5">{wh.address}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Water:</span>
                        <span className="text-cyan-300 font-bold">{wh.supplies.water_litres.toLocaleString()} L</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Food Rations:</span>
                        <span className="text-amber-300 font-bold">{wh.supplies.food_rations.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Trauma Kits:</span>
                        <span className="text-red-300 font-bold">{wh.supplies.medical_kits.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Verified Shelters Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Tent className="w-4 h-4 text-amber-400" />
                  Verified Chennai GCC Shelters (12 Safe Havens)
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  Click 'Dispatch Supplies' to assign emergency relief cargo
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {shelters.map((sh) => {
                  const alloc = currentStep?.shelter_allocations.find((a) => a.shelter_id === sh.id);
                  const currentOcc = alloc ? alloc.current_occupancy + alloc.allocated_evacuees : sh.current_occupancy;
                  const pct = Math.min(100, Math.round((currentOcc / sh.capacity) * 100));
                  return (
                    <div
                      key={sh.id}
                      className="glass-panel p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-slate-100 leading-tight">
                            {sh.name}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                              pct >= 90
                                ? 'bg-red-950 text-red-300 border border-red-500/40'
                                : pct >= 65
                                ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                : 'bg-green-950 text-green-300 border border-green-500/40'
                            }`}
                          >
                            {pct >= 90 ? 'High' : pct >= 65 ? 'Elevated' : 'Normal'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mb-3">{sh.neighborhood}</p>

                        {/* Occupancy bar */}
                        <div className="space-y-1 mb-3">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-400">Occupancy</span>
                            <span className="text-slate-200 font-bold">
                              {currentOcc.toLocaleString()} / {sh.capacity.toLocaleString()} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pct >= 90 ? 'bg-red-500' : pct >= 65 ? 'bg-amber-400' : 'bg-cyan-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Amenities Chips */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {sh.amenities.map((a, i) => (
                            <span
                              key={i}
                              className="text-[9px] bg-slate-800/80 text-slate-300 px-1.5 py-0.5 rounded font-mono"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenAllocateModal(sh.id, 'shelter')}
                        className="w-full py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/40 text-amber-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                      >
                        <Truck className="w-3.5 h-3.5 text-amber-400" />
                        <span>Dispatch Supplies</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: AI DECISION SUPPORT & WARDS (GCC 15 Zones & Bilingual Alerts)  */}
        {/* ========================================================================= */}
        {activeSection === 'ai-advisor' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-mono font-bold text-slate-100">
                    AI Decision Support System & Ward Vulnerability Index
                  </h2>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Deep Learning Demand Predictor (PyTorch DNN + XGBoost) and multi-factor ranking across all 15 Greater Chennai Corporation Zones.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-purple-300 bg-purple-950 px-2.5 py-1 rounded-lg border border-purple-500/30">
                  {advisorData?.risk_radar_level || 'DEFCON 2 (SEVERE)'}
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                  Risk Score: {advisorData?.radar_score || 84}/100
                </span>
              </div>
            </div>

            {/* Tactical Situation Executive Summary */}
            <div className="glass-panel-strong p-4 rounded-xl border border-purple-500/30 shadow-panel">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-300 uppercase tracking-wider mb-1.5">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                <span>Tactical Situation Assessment (T+{currentStep?.hour ?? 0}h)</span>
              </div>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                {advisorData?.tactical_summary ||
                  'Hydrological neural ensemble observes elevated backflow along Adyar basin. Road impedance is high across southern corridors. NDRF amphibious extraction prioritized.'}
              </p>
            </div>

            {/* 2-Column War Room Split: 15 GCC Wards vs Bilingual Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: 15 GCC Zones Ranked Table */}
              <div className="lg:col-span-7 space-y-3">
                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  GCC 15 Administrative Zones Vulnerability Ranking
                </h3>

                <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Rank</th>
                          <th className="py-2.5 px-3">Zone / Locality</th>
                          <th className="py-2.5 px-3">Observed Depth</th>
                          <th className="py-2.5 px-3">Risk Index</th>
                          <th className="py-2.5 px-3">Trend</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(advisorData?.ward_rankings || []).slice(0, 15).map((w, idx) => (
                          <tr key={w.ward_id || idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-cyan-400">#{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-200 block">
                                {w.ward_id.replace('GCC-', '')}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {idx === 0
                                  ? 'Velachery / Pallikaranai'
                                  : idx === 1
                                  ? 'Saidapet / Adyar Basin'
                                  : idx === 2
                                  ? 'Kotturpuram / Maraimalai'
                                  : idx === 3
                                  ? 'Royapuram / Harbor'
                                  : 'Metropolitan Basin'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-amber-300 font-bold">
                              {w.water_depth_m.toFixed(2)} m
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-200">{Math.round(w.risk_index)}</span>
                                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${
                                      w.risk_index >= 75
                                        ? 'bg-red-500'
                                        : w.risk_index >= 50
                                        ? 'bg-amber-400'
                                        : 'bg-cyan-400'
                                    }`}
                                    style={{ width: `${Math.min(100, w.risk_index)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded uppercase ${
                                  w.trend === 'peaking'
                                    ? 'bg-red-950 text-red-300 border border-red-500/40'
                                    : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                }`}
                              >
                                {w.trend}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column: Bilingual Emergency Broadcasts */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    Bilingual Emergency Broadcasts
                  </h3>
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                    <button
                      onClick={() => setAdvisorLanguage('english')}
                      className={`px-2 py-0.5 rounded ${
                        advisorLanguage === 'english'
                          ? 'bg-cyan-900 text-cyan-200 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setAdvisorLanguage('tamil')}
                      className={`px-2 py-0.5 rounded ${
                        advisorLanguage === 'tamil'
                          ? 'bg-cyan-900 text-cyan-200 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      தமிழ் (Tamil)
                    </button>
                  </div>
                </div>

                {/* Broadcast Box */}
                <div className="glass-panel-strong p-4 rounded-xl border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-300 font-bold flex items-center gap-1">
                      <Radio className="w-3 h-3" />
                      CELL TOWER SMS & RADIO BULLETIN
                    </span>
                    <button
                      onClick={() =>
                        handleCopyAlert(
                          advisorLanguage === 'tamil'
                            ? advisorData?.broadcast.tamil || ''
                            : advisorData?.broadcast.english || ''
                        )
                      }
                      className="text-[10px] text-cyan-300 hover:text-cyan-200 font-mono flex items-center gap-1 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30"
                    >
                      {copiedBroadcast ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedBroadcast ? 'Copied' : 'Copy Alert'}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed min-h-[90px]">
                    {advisorLanguage === 'tamil'
                      ? advisorData?.broadcast.tamil ||
                        'அவசர பெருவெள்ள எச்சரிக்கை! பெருநகர சென்னை மாநகராட்சி சைரன் அறிவிப்பு. தாழ்வான பகுதியில் உள்ள பொதுமக்கள் உடனடியாக நிவாரண முகாம்களுக்கு செல்லவும்.'
                      : advisorData?.broadcast.english ||
                        'EMERGENCY EVACUATION ALERT: Flash flooding detected across Chennai basins. Residents in ground floors must proceed to designated shelters. Call 1913 or 1070 for rescue.'}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Code: {advisorData?.broadcast.code || 'GCC-AI-ADV-2026'}</span>
                    <span>Level: {advisorData?.broadcast.alert_level || 'Red Alert'}</span>
                  </div>
                </div>

                {/* Verified Airlift Helipads */}
                <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Plane className="w-3.5 h-3.5 text-purple-400" />
                    Topographic Helicopter Helipads
                  </h4>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-200 block">Anna University CEG Sports Ground</span>
                        <span className="text-[10px] text-slate-500">Elevation: 14.5m • Guindy</span>
                      </div>
                      <span className="text-[9px] bg-green-950 text-green-300 px-2 py-0.5 rounded font-bold">
                        Touchdown Ready
                      </span>
                    </div>

                    <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-200 block">St. Thomas Mount Ridge Peak</span>
                        <span className="text-[10px] text-slate-500">Elevation: 24.0m • Southern Hub</span>
                      </div>
                      <span className="text-[9px] bg-green-950 text-green-300 px-2 py-0.5 rounded font-bold">
                        High Ground
                      </span>
                    </div>

                    <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-200 block">IIT Madras SAC Ground</span>
                        <span className="text-[10px] text-slate-500">Elevation: 16.0m • Adyar Basin</span>
                      </div>
                      <span className="text-[9px] bg-green-950 text-green-300 px-2 py-0.5 rounded font-bold">
                        Heavy Lift Mi-17
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 5: OPERATIONS ANALYTICS (KPI Overview & Fleet Logistics)          */}
        {/* ========================================================================= */}
        {activeSection === 'analytics' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-mono font-bold text-slate-100">
                    Operations Telemetry & Mission Analytics
                  </h2>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  High-level GCC & TNSDMA situational indicators, modal convoy dispatch breakdown, and chronological logs.
                </p>
              </div>

              <button
                onClick={() => setActiveSection('map')}
                className="px-3 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5"
              >
                <span>View Live Geospatial Map</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Comprehensive KPI Metric Cards Strip */}
            <MetricsOverview currentStep={currentStep} />

            {/* Modal Handover Logistics Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase mb-2">
                  <Truck className="w-4 h-4 text-cyan-400" />
                  <span>Ground Convoys (6x6 Heavy Trucks)</span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono leading-relaxed mb-3">
                  Ashok Leyland Stallion 4x4 & 6x6 high-clearance tactical vehicles operating along clear arterial routes (&lt;0.30m water depth).
                </p>
                <div className="text-xs font-mono text-cyan-300 font-bold bg-slate-950 p-2 rounded border border-slate-800">
                  Status: 18 Active Convoys • GST Road Corridor Clear
                </div>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase mb-2">
                  <Anchor className="w-4 h-4 text-purple-400" />
                  <span>NDRF Amphibious Zodiac Crafts</span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono leading-relaxed mb-3">
                  Gemini inflatable motor crafts deployed for canal basins and submerged residential wards (water depth 0.30m to 1.50m).
                </p>
                <div className="text-xs font-mono text-purple-300 font-bold bg-slate-950 p-2 rounded border border-slate-800">
                  Status: 34 Inflatable Boats Deployed • Buckingham Canal
                </div>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase mb-2">
                  <Plane className="w-4 h-4 text-amber-400" />
                  <span>Air Force & Coast Guard Sorties</span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono leading-relaxed mb-3">
                  IAF Chetak & Dhruv ALH helicopters conducting rooftop winch extractions and aerial food drops across severed epicenters.
                </p>
                <div className="text-xs font-mono text-amber-300 font-bold bg-slate-950 p-2 rounded border border-slate-800">
                  Status: 6 Helicopters on Hot Standby • Tambaram AFS
                </div>
              </div>
            </div>

            {/* Disaster Operations Timeline Log */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Chronological Mission Sequence Log
              </h3>
              <div className="space-y-2.5 text-xs font-mono">
                {(simulationResponse?.timeline || []).map((step, idx) => (
                  <div
                    key={step.hour || idx}
                    className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold text-[10px] border border-cyan-500/30">
                        T+{step.hour}h
                      </span>
                      <span className="text-slate-200">{step.description || `Simulation Phase ${step.hour}`}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400">
                      <span>Area: {step.metrics.total_flooded_area_sq_km.toFixed(1)} km²</span>
                      <span>Affected: {step.metrics.total_affected_population.toLocaleString()}</span>
                      <span>Severed Roads: {step.metrics.severed_roads_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Global Modals & Overlays */}
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

function Clock({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
