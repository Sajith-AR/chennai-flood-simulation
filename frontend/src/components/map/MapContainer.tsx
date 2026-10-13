'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import {
  Coordinates,
  FloodZoneInput,
  TimelineStep,
  ShelterEntity,
  WarehouseEntity,
  DistributionPointEntity,
  PopulationClusterEntity,
  StagingBaseEntity,
  RouteInspectionData,
} from '@/lib/types';

export interface ChennaiMapProps {
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
  circleRadiusMeters: number;
  draftPolygonPoints: Coordinates[];
  draftCircleCenter: Coordinates | null;
  onMapClick: (coords: Coordinates) => void;
  visibleLayers: {
    flood: boolean;
    evacuation: boolean;
    supply: boolean;
    shelters: boolean;
    warehouses: boolean;
    distributionPoints: boolean;
    populationHeatmap: boolean;
  };
  onSelectShelter?: (shelterId: string) => void;
  onSelectDistributionPoint?: (pointId: string) => void;
  onSelectRoute?: (route: RouteInspectionData) => void;
  themeMode?: 'light' | 'dark';
}

const DynamicChennaiMap = dynamic<ChennaiMapProps>(
  () => import('./ChennaiMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-950 text-slate-300 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/20 via-slate-950 to-slate-950" />
        
        {/* Subtle animated grid background */}
        <div 
          className="absolute inset-0 opacity-10 animate-pulse" 
          style={{ 
            backgroundSize: '30px 30px', 
            backgroundImage: 'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)' 
          }} 
        />

        <div className="relative z-10 glass-panel p-6 rounded-2xl flex flex-col items-center gap-6 shadow-glow-cyan animate-fade-in border border-slate-800/50">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Pulsing concentric rings */}
            <div className="absolute inset-0 border-2 border-cyan-500 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-40" />
            <div className="absolute inset-2 border-2 border-cyan-400 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.6s] opacity-50" />
            <div className="absolute inset-4 border-2 border-cyan-300 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_1.2s] opacity-60" />
            <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-glow-cyan" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold text-slate-100 tracking-wide flex items-center justify-center">
              Initializing Geospatial Engine
              <span className="inline-flex overflow-hidden animate-[pulse_1.5s_infinite]">...</span>
            </h3>
            {/* Shimmer typing effect for text */}
            <div className="mt-2 h-4 overflow-hidden flex justify-center">
              <p className="text-xs text-slate-400 font-mono border-r-2 border-cyan-400 pr-1 whitespace-nowrap animate-[pulse_1s_infinite]">
                Leaflet Client Engine • WGS84 • OpenStreetMap
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  }
);

export default function MapContainer(props: ChennaiMapProps) {
  return <DynamicChennaiMap {...props} />;
}
