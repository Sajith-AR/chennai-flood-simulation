'use client';

import React, { useState, useMemo, useCallback } from 'react';
import TopCommandBar from './TopCommandBar';
import CommandRail, { SentinelTool } from './CommandRail';
import FloatingWidgets from './FloatingWidgets';
import MapToolbar from './MapToolbar';
import TimelineDock from './TimelineDock';
import ContextualIntelligencePanel from './ContextualIntelligencePanel';
import MapContainer from '@/components/map/MapContainer';
import ConfirmationModal from '@/components/classic/ConfirmationModal';
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
  StagingBaseEntity,
  InventoryStatus,
  RouteInspectionData,
  AIAdvisorData,
} from '@/lib/types';
import { CHENNAI_CENTER } from '@/lib/constants';
import { Radio, Plane, CheckCircle2 } from 'lucide-react';

interface SentinelCommandCenterProps {
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
  onToggleLayer: (layerName: any) => void;
  onSelectShelter?: (shelterId: string) => void;
  onSelectDistributionPoint?: (pointId: string) => void;
  onSelectRoute?: (route: RouteInspectionData) => void;
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
  onToggleUIMode: () => void;
}

export default function SentinelCommandCenter({
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
  onToggleUIMode,
}: SentinelCommandCenterProps) {
  // Navigation & Workspace State
  const [activeTool, setActiveTool] = useState<SentinelTool>('overview');
  const [isRailExpanded, setIsRailExpanded] = useState<boolean>(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);

  // Selected Entity state (from map click or list click)
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'shelter' | 'point' | 'warehouse' | 'route' | null;
    data: any;
  } | null>(null);

  // Basemap & View Controller State
  const [basemapType, setBasemapType] = useState<'dark' | 'satellite' | 'streets'>('dark');
  const [flyToLocation, setFlyToLocation] = useState<{ center: Coordinates; zoom?: number } | null>(null);

  // Confirmation Modals & Action Toasts
  const [confirmSirenOpen, setConfirmSirenOpen] = useState<boolean>(false);
  const [confirmAirliftOpen, setConfirmAirliftOpen] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Entity selection handlers
  const handleSelectShelterInternal = useCallback(
    (shelterId: string) => {
      const sh = shelters.find((s) => s.id === shelterId);
      if (sh) {
        setSelectedEntity({ type: 'shelter', data: sh });
        setIsRightPanelOpen(true);
      }
      onSelectShelter?.(shelterId);
    },
    [shelters, onSelectShelter]
  );

  const handleSelectDistributionPointInternal = useCallback(
    (pointId: string) => {
      const pt = distributionPoints.find((p) => p.id === pointId);
      if (pt) {
        setSelectedEntity({ type: 'point', data: pt });
        setIsRightPanelOpen(true);
      }
      onSelectDistributionPoint?.(pointId);
    },
    [distributionPoints, onSelectDistributionPoint]
  );

  const handleSelectRouteInternal = useCallback(
    (routeData: RouteInspectionData) => {
      setSelectedEntity({ type: 'route', data: routeData });
      setIsRightPanelOpen(true);
      onSelectRoute?.(routeData);
    },
    [onSelectRoute]
  );

  // Rail tool selection handler
  const handleSelectTool = (tool: SentinelTool) => {
    setActiveTool(tool);
    if (tool === 'map') {
      // Focus map: close right panel and clear selection
      setSelectedEntity(null);
      setIsRightPanelOpen(false);
    } else {
      setSelectedEntity(null);
      setIsRightPanelOpen(true);
    }
  };

  // Fly to location helper
  const handleFlyTo = (coords: Coordinates, zoom: number = 14) => {
    setFlyToLocation({ center: coords, zoom });
  };

  // Reset view to center Chennai
  const handleResetView = () => {
    setFlyToLocation({ center: CHENNAI_CENTER, zoom: 12 });
  };

  // Derived real-time metrics
  const metrics = currentStep?.metrics || {
    total_flooded_area_sq_km: 18.4,
    total_affected_population: 142000,
    total_evacuated_population: 92400,
    unassigned_stranded_population: 18400,
    severed_roads_count: 14,
    active_routes_count: 28,
  };

  const shelterCapacityTotal = useMemo(() => {
    return shelters.reduce((acc, s) => acc + (s.capacity || 0), 0);
  }, [shelters]);

  const shelterOccupancyTotal = useMemo(() => {
    return shelters.reduce((acc, s) => acc + (s.current_occupancy || 0), 0);
  }, [shelters]);

  // Timeline steps list (fallback to baseline + hours)
  const timelineSteps: TimelineStep[] = useMemo(() => {
    if (simulationResponse?.timeline && simulationResponse.timeline.length > 0) {
      return simulationResponse.timeline;
    }
    return Array.from({ length: 7 }, (_, i) => ({
      time_step: i,
      hour: i,
      description: `Disaster Projection Step T+${i}h`,
      flood_polygons: { type: 'FeatureCollection', features: [] },
      evacuation_routes: { type: 'FeatureCollection', features: [] },
      supply_routes: { type: 'FeatureCollection', features: [] },
      shelter_allocations: [],
      inventory_status: liveInventory,
      isolated_clusters: [],
      metrics: {
        total_flooded_area_sq_km: 18.4 + i * 2.2,
        total_affected_population: 142000 + i * 8500,
        total_evacuated_population: Math.min(142000, 92400 + i * 8200),
        unassigned_stranded_population: Math.max(0, 18400 - i * 2100),
        severed_roads_count: 14 + i * 2,
        active_routes_count: Math.max(12, 28 - i),
      },
    }));
  }, [simulationResponse, liveInventory]);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#05080f] text-slate-100 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP COMMAND BAR                                                        */}
      {/* ========================================================================= */}
      <TopCommandBar
        isBackendLive={isBackendLive}
        advisorData={advisorData}
        currentStepHour={currentStep?.hour ?? 0}
        onTriggerSiren={() => setConfirmSirenOpen(true)}
        isSirenActive={isSirenActive}
        onTriggerAirlift={() => setConfirmAirliftOpen(true)}
        onToggleClassicMode={onToggleUIMode}
        isSimulating={isSimulating}
      />

      {/* Emergency Active Siren Klaxon Banner */}
      {isSirenActive && (
        <div className="bg-red-600 text-white px-4 py-2 text-xs font-mono font-bold flex items-center justify-between shadow-[0_0_20px_rgba(239,68,68,0.5)] z-30">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 animate-bounce" />
            <span>
              CRITICAL CITIZEN EVACUATION SIREN ACTIVATED • AUDIO KLAXON TRANSMITTING TO 2,410 CHENNAI CELLULAR TOWERS
            </span>
          </div>
          <button
            onClick={onTriggerSiren}
            className="px-2.5 py-1 rounded bg-white text-red-700 font-bold hover:bg-red-100 uppercase"
          >
            SILENCE KLAXON
          </button>
        </div>
      )}

      {/* Action Toast Feedback */}
      {feedbackToast && (
        <div className="bg-slate-900 text-white border-b border-cyan-500/40 px-4 py-2 text-xs font-mono flex items-center gap-2.5 z-30 animate-slide-down">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. THREE-ZONE WORKSPACE (Rail, Intelligence Canvas, Contextual Panel)     */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Zone A: Compact Command Rail (Far Left) */}
        <CommandRail
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          isExpanded={isRailExpanded}
          onToggleExpand={() => setIsRailExpanded(!isRailExpanded)}
          shelterCount={shelters.length}
          warehouseCount={warehouses.length}
          teamsCount={stagingBases.length}
        />

        {/* Zone B: Main Geospatial Intelligence Canvas (Center 70-80%) */}
        <main className="flex-1 relative h-full w-full overflow-hidden bg-[#070b14]">
          {/* Floating Map Toolbar (Top of Canvas) */}
          <MapToolbar
            basemapType={basemapType}
            onChangeBasemap={setBasemapType}
            onFlyToLocation={handleFlyTo}
            onResetView={handleResetView}
            visibleLayers={visibleLayers}
            onToggleLayer={onToggleLayer}
            activeDrawingMode={activeDrawingMode}
            onSetDrawingMode={setActiveDrawingMode}
            onClearDrawing={onClearDrawing}
          />

          {/* Floating Intelligence Widgets (Corners of Canvas) */}
          <FloatingWidgets
            metrics={metrics}
            advisorData={advisorData}
            sheltersCount={shelters.length}
            shelterCapacityTotal={shelterCapacityTotal}
            shelterOccupancyTotal={shelterOccupancyTotal}
            fieldTeamsCount={stagingBases.length}
            currentStepHour={currentStep?.hour ?? 0}
          />

          {/* Interactive Leaflet Geospatial Map */}
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
              onSelectShelter={handleSelectShelterInternal}
              onSelectDistributionPoint={handleSelectDistributionPointInternal}
              onSelectRoute={handleSelectRouteInternal}
              themeMode="dark"
              basemapType={basemapType}
              flyToLocation={flyToLocation}
            />
          </div>

          {/* Incident Timeline Dock (Bottom of Canvas) */}
          <TimelineDock
            currentStepIndex={currentStepIndex}
            onStepChange={onStepChange}
            timelineSteps={timelineSteps}
            isPlaying={isPlaying}
            onTogglePlay={onTogglePlay}
            playbackSpeed={playbackSpeed}
            onSpeedChange={onSpeedChange}
            onReset={() => onStepChange(0)}
          />
        </main>

        {/* Zone C: Contextual Intelligence Panel (Right Drawer) */}
        <ContextualIntelligencePanel
          isOpen={isRightPanelOpen}
          onClose={() => setIsRightPanelOpen(false)}
          activeTool={activeTool}
          selectedEntity={selectedEntity}
          onClearSelectedEntity={() => setSelectedEntity(null)}
          shelters={shelters}
          warehouses={warehouses}
          distributionPoints={distributionPoints}
          stagingBases={stagingBases}
          parameters={parameters}
          onParametersChange={onParametersChange}
          activePresetId={activePresetId}
          onSelectPreset={onSelectPreset}
          onRunSimulation={onRunSimulation}
          isSimulating={isSimulating}
          liveInventory={liveInventory}
          advisorData={advisorData}
          onOpenAllocateModal={onOpenAllocateModal}
          onOpenRouteInspector={onSelectRoute}
          onScrambleSortie={() => setConfirmAirliftOpen(true)}
          onTriggerSiren={() => setConfirmSirenOpen(true)}
          currentStep={currentStep}
          onFlyToLocation={handleFlyTo}
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. CONFIRMATION DIALOGS FOR CONSEQUENTIAL EMERGENCY ACTIONS                */}
      {/* ========================================================================= */}
      <ConfirmationModal
        isOpen={confirmSirenOpen}
        onClose={() => setConfirmSirenOpen(false)}
        onConfirm={() => {
          onTriggerSiren();
          setConfirmSirenOpen(false);
          triggerToast(
            isSirenActive
              ? 'Emergency klaxon silenced across civil defense stations.'
              : 'Emergency Klaxon activated across 2,410 Chennai cell broadcast sectors.'
          );
        }}
        title={isSirenActive ? 'Silence Evacuation Klaxon?' : 'Transmit City-Wide Evacuation Klaxon?'}
        description={
          isSirenActive
            ? 'This will deactivate the audio siren alert and notify civil defense wards that immediate acute hazard conditions have transitioned to monitoring.'
            : 'This consequential action will broadcast an audible civil defense emergency alert to cellular towers across Greater Chennai Corporation and trigger ward siren stations.'
        }
        confirmLabel={isSirenActive ? 'Silence Klaxon' : 'Authorize Klaxon Broadcast'}
        cancelLabel="Abort Action"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={confirmAirliftOpen}
        onClose={() => setConfirmAirliftOpen(false)}
        onConfirm={() => {
          onTriggerAirlift();
          setConfirmAirliftOpen(false);
          triggerToast('IAF Chetak helicopter sortie scrambled from Tambaram Air Base.');
        }}
        title="Scramble IAF Chetak Search & Rescue Sortie?"
        description="Authorize immediate deployment of IAF Chetak / Dhruv ALH helicopter asset from Tambaram Air Base with rescue winch crew and high-priority ration drops to inundated pockets."
        confirmLabel="Authorize Scramble Sortie"
        cancelLabel="Cancel"
        variant="primary"
      />
    </div>
  );
}
