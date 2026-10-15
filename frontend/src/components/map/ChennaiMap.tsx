'use client';

import React from 'react';
import {
  MapContainer as LeafletMap,
  TileLayer,
  Circle,
  Polygon,
  Polyline,
  Marker,
  Popup,
  Tooltip,
  useMapEvents,
  useMap,
  CircleMarker,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChennaiMapProps } from './MapContainer';
import { Coordinates, RouteInspectionData, StagingBaseEntity } from '@/lib/types';
import { CHENNAI_STAGING_BASES } from '@/lib/constants';

// Helper to create Leaflet DivIcons
function createDivIcon(
  html: string,
  className: string = 'custom-leaflet-icon',
  iconSize: [number, number] = [36, 36],
  iconAnchor: [number, number] = [18, 18]
) {
  return L.divIcon({
    html,
    className,
    iconSize,
    iconAnchor,
    popupAnchor: [0, -18],
  });
}

// 1. Custom SVG Animated Marker for Flood Epicenter with Concentric Shockwave Ripples
function createEpicenterIcon(depthM: number, label: string) {
  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group" style="width: 52px; height: 52px;">
      <!-- Outer shockwave ripples -->
      <div class="absolute inset-0 rounded-full border-2 border-red-500/70 animate-shockwave"></div>
      <div class="absolute inset-2 rounded-full border border-amber-400/80 animate-[shockwaveRipple_2.2s_cubic-bezier(0,0.2,0.8,1)_infinite_0.6s]"></div>
      
      <!-- Center pulsing epicenter badge -->
      <div class="relative z-10 w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 via-red-700 to-slate-950 border-2 border-red-400 shadow-glow-red flex flex-col items-center justify-center text-white transform group-hover:scale-110 transition-transform">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>

      <!-- Water depth telemetry tag -->
      <div class="absolute -bottom-2 z-20 px-1.5 py-0.2 bg-slate-950/90 text-red-300 font-mono text-[9px] font-black rounded border border-red-500 shadow-md whitespace-nowrap">
        ${depthM.toFixed(1)}m DEPTH
      </div>
    </div>
  `;
  return createDivIcon(html, 'epicenter-icon', [52, 52], [26, 26]);
}

// 2. Custom SVG Animated Marker for IAF Chetak / Coast Guard Rescue Helicopter
function createHelicopterIcon(callsign: string, isAirborne: boolean = true) {
  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group" style="width: 50px; height: 50px;">
      <!-- Radar scan ring for helicopter -->
      <div class="absolute inset-0 rounded-full border border-purple-400/50 animate-ping opacity-40"></div>
      <div class="absolute inset-2 rounded-full border border-purple-500/30"></div>

      <!-- Helicopter Body Box -->
      <div class="relative z-10 w-9 h-9 rounded-xl bg-gradient-to-br from-purple-700 via-indigo-900 to-slate-950 border-2 border-purple-300 shadow-glow-purple flex items-center justify-center text-white transform group-hover:scale-110 transition-transform">
        <!-- Spinning rotor blade SVG overlay -->
        <svg class="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-8 text-purple-200 animate-spin-rotor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="2" y1="12" x2="22" y2="12" stroke-linecap="round"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>

        <!-- Helicopter Cabin Icon -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mt-1">
          <path d="M12 6v6"/>
          <path d="M5 12h14"/>
          <path d="M7 16h10"/>
          <path d="M4 18h16"/>
          <path d="M18 10l3-3"/>
        </svg>
      </div>

      <!-- Callsign Badge -->
      <div class="absolute -bottom-2 z-20 px-1 py-0.2 bg-slate-950/90 text-purple-300 font-mono text-[8px] font-bold rounded border border-purple-500/60 shadow-md whitespace-nowrap">
        ${callsign}
      </div>
    </div>
  `;
  return createDivIcon(html, 'helicopter-icon', [50, 50], [25, 25]);
}

// 3. Custom SVG Animated Marker for Amphibious Staging Base / Marine Rescue Base
function createAmphibiousIcon(callsign: string) {
  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group" style="width: 48px; height: 48px;">
      <!-- Glowing cyan wave pulses -->
      <div class="absolute inset-1 rounded-full border border-cyan-400/60 animate-ping opacity-50"></div>
      <div class="absolute inset-3 rounded-full border border-cyan-500/40"></div>

      <!-- Vessel / Marine Badge -->
      <div class="relative z-10 w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-600 via-teal-800 to-slate-950 border-2 border-cyan-300 shadow-glow-cyan flex items-center justify-center text-white transform group-hover:scale-110 transition-transform">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="5" r="3"/>
          <line x1="12" y1="22" x2="12" y2="8"/>
          <path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
        </svg>
      </div>

      <!-- Marine Base Callout -->
      <div class="absolute -bottom-2 z-20 px-1 py-0.2 bg-slate-950/90 text-cyan-300 font-mono text-[8px] font-bold rounded border border-cyan-500/60 shadow-md whitespace-nowrap">
        ${callsign}
      </div>
    </div>
  `;
  return createDivIcon(html, 'amphibious-icon', [48, 48], [24, 24]);
}

// 4. Custom SVG Animated Marker for Disaster Incidents (NLP Feed / Emergency Calls)
function createIncidentMarkerIcon(urgency: string, waterDepth: number) {
  const isCritical = urgency === 'critical';
  const colorClass = isCritical
    ? 'from-red-600 via-rose-700 to-slate-950 border-red-400'
    : 'from-amber-600 via-orange-700 to-slate-950 border-amber-400';
  const ringClass = isCritical ? 'border-red-500 animate-ping' : 'border-amber-500 animate-pulse';
  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group" style="width: 44px; height: 44px;">
      <div class="absolute inset-0 rounded-full border-2 ${ringClass} opacity-60"></div>
      <div class="relative z-10 w-8 h-8 rounded-xl bg-gradient-to-br ${colorClass} border-2 shadow-lg flex items-center justify-center text-white transform group-hover:scale-110 transition-transform">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <div class="absolute -bottom-2 z-20 px-1 py-0.2 bg-slate-950 text-white font-mono text-[8px] font-bold rounded border ${isCritical ? 'border-red-500 text-red-300' : 'border-amber-500 text-amber-300'} shadow whitespace-nowrap">
        ${urgency.toUpperCase()}
      </div>
    </div>
  `;
  return createDivIcon(html, 'disaster-incident-icon', [44, 44], [22, 22]);
}

// Map Click Interceptor Component
function MapClickHandler({
  onMapClick,
  activeDrawingMode,
}: {
  onMapClick: (coords: Coordinates) => void;
  activeDrawingMode: 'none' | 'circle' | 'polygon';
}) {
  useMapEvents({
    click(e) {
      if (activeDrawingMode !== 'none') {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}
// Programmatic Fly-To Controller Component
function MapFlyToHandler({
  target,
}: {
  target?: { center: Coordinates; zoom?: number } | null;
}) {
  const map = useMap();
  React.useEffect(() => {
    if (target?.center) {
      map.flyTo(target.center, target.zoom || 14, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

// Automatic Map Resizing & Canvas Invalidation Controller
function MapResizeHandler() {
  const map = useMap();
  React.useEffect(() => {
    // Invalidate size on initial mount and staggered intervals to eliminate blank squares & container offsets
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    const t3 = setTimeout(() => map.invalidateSize(), 1200);

    const onResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', onResize);
    };
  }, [map]);
  return null;
}

interface BasemapSpec {
  url: string;
  attribution: string;
  subdomains?: string;
  maxZoom: number;
  maxNativeZoom?: number;
}

const BASEMAP_CONFIG: Record<'dark' | 'satellite' | 'streets', BasemapSpec> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
    maxNativeZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    subdomains: '',
    maxZoom: 20,
    maxNativeZoom: 18,
  },
  streets: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
    maxNativeZoom: 19,
  },
};

export default function ChennaiMap({
  center,
  bounds,
  shelters,
  warehouses,
  distributionPoints,
  populationClusters,
  stagingBases = CHENNAI_STAGING_BASES,
  currentStep,
  definedZones,
  activeDrawingMode,
  circleRadiusMeters,
  draftPolygonPoints,
  draftCircleCenter,
  onMapClick,
  visibleLayers,
  onSelectShelter,
  onSelectDistributionPoint,
  onSelectRoute,
  themeMode = 'dark',
  basemapType = 'dark',
  flyToLocation = null,
  incidents = [],
}: ChennaiMapProps) {
  // Convert GeoJSON polygon coordinates ([lon, lat]) to Leaflet [lat, lon]
  const convertGeoJsonPolygon = (coords: number[][][]): [number, number][] => {
    if (!coords || coords.length === 0 || !coords[0]) return [];
    return coords[0].map((pt) => [pt[1], pt[0]]);
  };

  // Convert GeoJSON LineString coordinates ([lon, lat]) to Leaflet [lat, lon]
  const convertGeoJsonLineString = (coords: number[][]): [number, number][] => {
    if (!coords) return [];
    return coords.map((pt) => [pt[1], pt[0]]);
  };

  // Open Inspector with high-fidelity telemetry payload for Evacuation route
  const handleEvacRouteClick = (feature: any) => {
    const props = feature.properties;
    const isImpassable = props.status === 'impassable';
    const isRerouted = props.status === 'rerouted';
    const dist = props.distance_km || 4.2;

    const inspectionData: RouteInspectionData = {
      route_id: props.route_id,
      route_name: `${props.source_name} ➔ ${props.destination_name} Evacuation Corridor`,
      route_category: 'evacuation',
      transport_mode: isImpassable ? 'amphibious' : 'truck',
      vehicle_type: isImpassable
        ? 'NDRF Gemini Inflatable Craft & BARK Carrier'
        : 'Ashok Leyland Stallion 4x4 Troop Transport',
      source_name: props.source_name,
      destination_name: props.destination_name,
      distance_km: dist,
      transit_time_min: props.estimated_time_min || 18,
      convoy_vehicle_count: props.convoy_vehicle_count || 4,
      water_clearance_depth_m: isImpassable ? 2.5 : 0.8,
      max_water_depth_m: isImpassable ? 1.7 : isRerouted ? 0.9 : 0.25,
      depth_profile: [
        { step_km: 0.5, depth_m: 0.1, elevation_m: 8.5, status: 'clear' },
        { step_km: 1.2, depth_m: isImpassable ? 1.4 : isRerouted ? 0.6 : 0.2, elevation_m: 6.2, status: isImpassable ? 'submerged' : 'caution' },
        { step_km: 2.1, depth_m: isImpassable ? 1.7 : isRerouted ? 0.8 : 0.25, elevation_m: 5.1, status: isImpassable ? 'submerged' : 'caution' },
        { step_km: 3.0, depth_m: isImpassable ? 0.9 : 0.4, elevation_m: 7.0, status: 'caution' },
        { step_km: dist, depth_m: 0.05, elevation_m: 9.8, status: 'clear' },
      ],
      evacuee_or_capacity_count: props.evacuee_count || 350,
      manifest: {
        water_litres: 12500,
        food_rations: 3400,
        medical_kits: 45,
        life_jackets: 80,
        satellite_radios: 4,
      },
      status: props.status,
      recommendation: isImpassable
        ? 'Ground corridor impassable. Water depth exceeds 1.5m at culvert bridge. Amphibious zodiacs or helicopter airlift deployed.'
        : isRerouted
        ? 'Rerouted through higher elevation arterial bypass. Monitor drainage channels closely for sudden backflow surge.'
        : 'Primary high-elevation evacuation corridor clear. Low flood impedance. Safe for civilian transit.',
    };

    onSelectRoute?.(inspectionData);
  };

  // Open Inspector with high-fidelity telemetry payload for Supply route
  const handleSupplyRouteClick = (feature: any) => {
    const props = feature.properties;
    const mode = props.transport_mode || 'truck';
    const dist = props.distance_km || 5.6;

    const inspectionData: RouteInspectionData = {
      route_id: props.route_id,
      route_name: `${props.warehouse_name} ➔ ${props.destination_name} Relief Convoy`,
      route_category: mode === 'helicopter' ? 'airlift' : 'supply',
      transport_mode: mode,
      vehicle_type: props.vehicle_type || (
        mode === 'helicopter'
          ? 'IAF Chetak / Dhruv ALH Aerial Sortie'
          : mode === 'amphibious'
          ? 'NDRF Gemini Craft & BARK Carrier'
          : 'Heavy 6x6 Ashok Leyland Stallion Truck'
      ),
      source_name: props.warehouse_name,
      destination_name: props.destination_name,
      distance_km: dist,
      transit_time_min: props.transit_time_min || 20,
      convoy_vehicle_count: props.convoy_vehicle_count || (mode === 'helicopter' ? 1 : mode === 'amphibious' ? 2 : 4),
      water_clearance_depth_m: mode === 'helicopter' ? 999 : mode === 'amphibious' ? 2.5 : 0.8,
      max_water_depth_m: mode === 'helicopter' ? 0.0 : mode === 'amphibious' ? 1.9 : 0.45,
      depth_profile: [
        { step_km: 1.0, depth_m: mode === 'helicopter' ? 0 : 0.15, elevation_m: 10, status: 'clear' },
        { step_km: 2.5, depth_m: mode === 'helicopter' ? 0 : mode === 'amphibious' ? 1.8 : 0.5, elevation_m: 6.5, status: mode === 'amphibious' ? 'submerged' : 'caution' },
        { step_km: 4.0, depth_m: mode === 'helicopter' ? 0 : mode === 'amphibious' ? 1.4 : 0.35, elevation_m: 7.2, status: 'caution' },
        { step_km: dist, depth_m: 0.05, elevation_m: 11, status: 'clear' },
      ],
      evacuee_or_capacity_count: 0,
      manifest: {
        water_litres: props.cargo?.water_litres || 25000,
        food_rations: props.cargo?.food_rations || 5000,
        medical_kits: props.cargo?.medical_kits || 120,
        life_jackets: mode === 'amphibious' ? 60 : 25,
        satellite_radios: 6,
      },
      status: props.status === 'blocked' ? 'blocked' : 'active',
      recommendation: mode === 'helicopter'
        ? 'Airborne SAR Corridor clear of weather hazards. Tambaram radar tracking active. Wind velocity 14 knots.'
        : mode === 'amphibious'
        ? 'Navigating submerged canal basin. Water clearance ample for outboard motor. Proceed with caution near underwater debris.'
        : '6x6 High-clearance convoy en-route. Road clearance adequate along GST Road corridor.',
    };

    onSelectRoute?.(inspectionData);
  };

  return (
    <div className={`w-full h-full relative z-0 ${themeMode === 'dark' ? 'sentinel-map' : 'classic-map'}`}>
      <LeafletMap
        center={center}
        zoom={12}
        minZoom={10}
        maxZoom={18}
        maxBounds={[
          [12.70, 79.95],
          [13.40, 80.50],
        ]}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: themeMode === 'dark' ? '#070b14' : '#f8fafc',
        }}
      >
        {/* Automatic Viewport Invalidation to prevent blank tiles */}
        <MapResizeHandler />

        <MapClickHandler
          onMapClick={onMapClick}
          activeDrawingMode={activeDrawingMode}
        />

        <MapFlyToHandler target={flyToLocation} />

        {/* Dynamic Basemap Tile Provider (CartoDB Dark Matter / Satellite Recon / Voyager Streets) */}
        {(() => {
          const activeBasemap =
            BASEMAP_CONFIG[basemapType] ||
            BASEMAP_CONFIG[themeMode === 'light' ? 'streets' : 'dark'];
          return (
            <TileLayer
              key={`${basemapType}-${themeMode}`}
              attribution={activeBasemap.attribution}
              url={activeBasemap.url}
              subdomains={activeBasemap.subdomains || 'abc'}
              maxZoom={activeBasemap.maxZoom || 20}
              maxNativeZoom={activeBasemap.maxNativeZoom || 18}
            />
          );
        })()}

        {/* 1. Population Density Heatmap Layer */}
        {visibleLayers.populationHeatmap &&
          populationClusters.map((cluster) => {
            const riskLevel = String(cluster.risk_level || 'moderate').toLowerCase();
            const color =
              riskLevel === 'extreme'
                ? '#EF4444'
                : riskLevel === 'high'
                ? '#F97316'
                : '#EAB308';
            const estPop = cluster.estimated_population ?? 0;
            const density = cluster.density_per_sq_km ?? 0;
            const radius = Math.min(1600, Math.max(700, estPop / 35));

            return (
              <Circle
                key={`pop-${cluster.id}`}
                center={cluster.location}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.16,
                  weight: 1.5,
                  dashArray: '3, 6',
                }}
              >
                <Popup>
                  <div className="p-3 text-xs font-sans text-slate-800 dark:text-slate-200">
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: color }}
                      />
                      {cluster.name}
                    </div>
                    <div className="mt-1 text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                      Ward Population Risk Cluster
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block">
                          Population
                        </span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {estPop.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block">
                          Density
                        </span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {density.toLocaleString()} /km²
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                          riskLevel === 'extreme'
                            ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-700'
                            : riskLevel === 'high'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-700'
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-700'
                        }`}
                      >
                        {riskLevel} Threat Zone
                      </span>
                    </div>
                  </div>
                </Popup>
              </Circle>
            );
          })}

        {/* 2. Defined Scenario Flood Zones & Interactive Drawing */}
        {definedZones.map((zone) =>
          zone.type === 'circle' ? (
            <React.Fragment key={`selected-${zone.id}`}>
              <Circle
                center={zone.coordinates[0]}
                radius={zone.radius_meters || 2000}
                pathOptions={{
                  color: '#22d3ee',
                  fillColor: '#06b6d4',
                  fillOpacity: 0.08,
                  dashArray: '6 6',
                  weight: 2,
                }}
              />
              {/* Animated Epicenter Pulse Marker */}
              <Marker
                position={zone.coordinates[0]}
                icon={createEpicenterIcon(2.2, zone.name || 'Epicenter')}
              >
                <Popup>
                  <div className="p-2.5 text-xs font-sans text-slate-800 dark:text-slate-200">
                    <span className="font-mono text-[10px] text-red-600 dark:text-red-400 font-bold block uppercase">
                      Flood Epicenter
                    </span>
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">{zone.name}</div>
                    <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                      Radius: <b className="text-slate-900 dark:text-slate-100">{((zone.radius_meters || 2000) / 1000).toFixed(1)} km</b>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ) : (
            <React.Fragment key={`selected-${zone.id}`}>
              <Polygon
                positions={zone.coordinates}
                pathOptions={{
                  color: '#22d3ee',
                  fillColor: '#06b6d4',
                  fillOpacity: 0.08,
                  dashArray: '6 6',
                  weight: 2,
                }}
              />
              {zone.coordinates.length > 0 && (
                <Marker
                  position={zone.coordinates[0]}
                  icon={createEpicenterIcon(2.4, zone.name || 'Surge Basin')}
                >
                  <Popup>
                    <div className="p-2.5 text-xs font-sans text-slate-800 dark:text-slate-200">
                      <span className="font-mono text-[10px] text-red-600 dark:text-red-400 font-bold block uppercase">
                        Hydrological Basin Center
                      </span>
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">{zone.name}</div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </React.Fragment>
          )
        )}

        {/* Interactive Drawing Layers */}
        {activeDrawingMode === 'circle' && draftCircleCenter && (
          <Circle
            center={draftCircleCenter}
            radius={circleRadiusMeters}
            pathOptions={{
              color: '#06B6D4',
              fillColor: '#06B6D4',
              fillOpacity: 0.35,
              weight: 2,
              dashArray: '4, 6',
            }}
          />
        )}

        {activeDrawingMode === 'polygon' && draftPolygonPoints.length > 0 && (
          <>
            <Polygon
              positions={draftPolygonPoints}
              pathOptions={{
                color: '#3B82F6',
                fillColor: '#3B82F6',
                fillOpacity: 0.3,
                weight: 2,
                dashArray: '4, 4',
              }}
            />
            {draftPolygonPoints.map((pt, i) => (
              <CircleMarker
                key={`draft-pt-${i}`}
                center={pt}
                radius={5}
                pathOptions={{
                  color: '#2563EB',
                  fillColor: '#60A5FA',
                  fillOpacity: 1,
                  weight: 2,
                }}
              />
            ))}
          </>
        )}

        {/* 3. Active Simulation Flood Inundation Polygons Layer */}
        {visibleLayers.flood &&
          currentStep?.flood_polygons?.features.map((feature, idx) => {
            const positions = convertGeoJsonPolygon(feature.geometry.coordinates);
            const props = feature.properties;

            return (
              <Polygon
                key={`flood-${props.zone_id}-${idx}`}
                positions={positions}
                pathOptions={{
                  color: props.stroke_color,
                  fillColor: props.fill_color,
                  fillOpacity: props.fill_opacity,
                  weight: 2.5,
                }}
              >
                <Popup>
                  <div className="p-3 text-xs font-sans text-slate-800 dark:text-slate-200 min-w-[210px]">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shadow-sm"
                        style={{ backgroundColor: props.fill_color }}
                      />
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Inundation Zone: {props.zone_id}
                      </span>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-mono">
                          Water Depth
                        </span>
                        <span className="font-bold font-mono text-blue-600 dark:text-cyan-400 text-sm">
                          {props.water_depth_m} m
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-mono">
                          Severity Tier
                        </span>
                        <span className="font-bold uppercase text-red-600 dark:text-red-400 text-xs">
                          {props.severity}
                        </span>
                      </div>
                    </div>
                    {props.area_sq_km && (
                      <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                        Surface Spread: <b className="text-slate-900 dark:text-slate-100">{props.area_sq_km} km²</b>
                      </div>
                    )}
                  </div>
                </Popup>
              </Polygon>
            );
          })}

        {/* 4. Evacuation Routes Overlay with Multi-modal Visuals & Click Handler */}
        {visibleLayers.evacuation &&
          currentStep?.evacuation_routes?.features.map((feature, idx) => {
            const positions = convertGeoJsonLineString(feature.geometry.coordinates);
            const props = feature.properties;
            const isRerouted = props.status === 'rerouted';
            const isImpassable = props.status === 'impassable';

            const routeColor = isImpassable
              ? '#EF4444'
              : isRerouted
              ? '#F59E0B'
              : '#10B981';

            return (
              <Polyline
                key={`evac-route-${props.route_id}-${idx}`}
                positions={positions}
                eventHandlers={{
                  click: () => handleEvacRouteClick(feature),
                }}
                pathOptions={{
                  color: routeColor,
                  weight: isRerouted ? 4 : isImpassable ? 3.5 : 4.5,
                  opacity: 0.95,
                  dashArray: isRerouted ? '8, 6' : isImpassable ? '3, 6' : undefined,
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs font-sans p-1.5 min-w-[210px]">
                    <div className="font-bold flex items-center justify-between gap-2 text-emerald-400">
                      <span>🚶 Evacuation Corridor</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                          isRerouted
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : isImpassable
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {props.status}
                      </span>
                    </div>
                    <div className="text-slate-200 mt-1 font-semibold text-xs">
                      {props.source_name} ➔ {props.destination_name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 font-mono">
                      Evacuees: <b>{(props.evacuee_count ?? 0).toLocaleString()}</b> • Dist: <b>{props.distance_km ?? 0} km</b>
                    </div>
                    <div className="mt-1 text-[9px] text-cyan-400 font-mono underline">
                      Click route to inspect telemetry HUD & depth profile ↗
                    </div>
                  </div>
                </Tooltip>
              </Polyline>
            );
          })}

        {/* 5. Supply Logistics Routes Overlay: Multi-Modal Styling & Click Handler */}
        {visibleLayers.supply &&
          currentStep?.supply_routes?.features.map((feature, idx) => {
            const positions = convertGeoJsonLineString(feature.geometry.coordinates);
            const props = feature.properties;
            const mode = props.transport_mode || 'truck';
            const isBlocked = props.status === 'blocked';

            // Differentiate visually between truck (amber), amphibious (cyan pulses), helicopter (purple dashed vectors)
            const strokeColor = isBlocked
              ? '#DC2626'
              : mode === 'helicopter'
              ? '#C084FC'
              : mode === 'amphibious'
              ? '#00F0FF'
              : '#F59E0B';

            const dashPattern = mode === 'helicopter'
              ? '10, 8'
              : mode === 'amphibious'
              ? '6, 6'
              : '4, 4';

            return (
              <Polyline
                key={`supply-route-${props.route_id}-${idx}`}
                positions={positions}
                eventHandlers={{
                  click: () => handleSupplyRouteClick(feature),
                }}
                pathOptions={{
                  color: strokeColor,
                  weight: mode === 'helicopter' ? 4 : mode === 'amphibious' ? 4.5 : 4,
                  opacity: 0.9,
                  dashArray: dashPattern,
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs font-sans p-1.5 min-w-[220px]">
                    <div className="font-bold flex items-center justify-between gap-2">
                      <span className={mode === 'helicopter' ? 'text-purple-400' : mode === 'amphibious' ? 'text-cyan-400' : 'text-amber-400'}>
                        {mode === 'helicopter' ? '🚁 Aerial SAR Sortie' : mode === 'amphibious' ? '🚤 Amphibious Water Track' : '🚛 Heavy 6x6 Logistics Convoy'}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase bg-slate-800 text-slate-200 border border-slate-700">
                        {props.status}
                      </span>
                    </div>
                    <div className="text-slate-200 mt-1 font-semibold text-xs">
                      {props.warehouse_name} ➔ {props.destination_name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 font-mono">
                      Dist: <b>{props.distance_km ?? 0} km</b> • Transit: <b>{props.transit_time_min ?? 0}m</b>
                    </div>
                    {props.cargo && (
                      <div className="text-[10px] text-slate-300 mt-1.5 bg-slate-900/80 p-1.5 rounded border border-slate-700 font-mono">
                        📦 Water: {(props.cargo.water_litres ?? 0).toLocaleString()}L | Food: {(props.cargo.food_rations ?? 0).toLocaleString()}
                      </div>
                    )}
                    <div className="mt-1 text-[9px] text-cyan-400 font-mono underline">
                      Click route to inspect telemetry HUD & depth profile ↗
                    </div>
                  </div>
                </Tooltip>
              </Polyline>
            );
          })}

        {/* 6. Staging Bases (Rescue Helicopters & Amphibious Craft Bases) */}
        {stagingBases.map((base) => {
          const isHelicopter = base.type === 'helicopter_base';
          const icon = isHelicopter
            ? createHelicopterIcon(base.callsign, true)
            : createAmphibiousIcon(base.callsign);

          return (
            <Marker key={`staging-${base.id}`} position={base.location} icon={icon}>
              <Popup>
                <div className="p-2.5 text-xs font-sans text-slate-200 min-w-[240px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{base.name}</span>
                    <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-700 dark:text-cyan-300 border border-slate-300 dark:border-cyan-800">
                      {base.callsign}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    {isHelicopter ? 'IAF / Coast Guard Air Base' : 'Marine Amphibious Staging Base'}
                  </div>

                  <div className="mt-2.5 bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Deployed Assets:</span>
                      <span className="text-slate-900 dark:text-slate-100 font-semibold">{base.stationed_assets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Combat Radius:</span>
                      <span className="text-blue-600 dark:text-cyan-400 font-semibold">{base.operational_radius_km} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Readiness:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">{base.readiness_status}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 7. Warehouses (5 Major Depots) */}
        {visibleLayers.warehouses &&
          warehouses.map((wh) => {
            const iconHtml = `
              <div class="relative group cursor-pointer">
                <div class="w-8 h-8 rounded-lg bg-blue-600 border-2 border-white shadow-md flex items-center justify-center text-white transform hover:scale-110 transition-transform">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/>
                    <path d="M6 18h12"/>
                    <path d="M6 14h12"/>
                  </svg>
                </div>
                <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-teal-400 border-2 border-white"></div>
              </div>
            `;
            const icon = createDivIcon(iconHtml, 'warehouse-icon', [32, 32], [16, 16]);

            return (
              <Marker key={`wh-${wh.id}`} position={wh.location} icon={icon}>
                <Popup>
                  <div className="p-3 text-xs font-sans text-slate-800 dark:text-slate-200 min-w-[230px]">
                    <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-slate-100">
                      <span>{wh.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{wh.address}</div>
                    <div className="mt-2.5 bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1.5 font-mono">
                        Depot Stock Reserves
                      </div>
                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Potable Water:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {(wh.supplies?.water_litres ?? 0).toLocaleString()} L
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Food Rations:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {(wh.supplies?.food_rations ?? 0).toLocaleString()} pk
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Medical Kits:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {(wh.supplies?.medical_kits ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 8. Shelters (12 Safe Shelters) */}
        {visibleLayers.shelters &&
          shelters.map((shelter) => {
            const simAlloc = currentStep?.shelter_allocations?.find(
              (sa) => sa.shelter_id === shelter.id
            );
            const assignedEvacuees = simAlloc?.allocated_evacuees || 0;
            const totalAssigned = (shelter.current_occupancy ?? 0) + assignedEvacuees;
            const shelterCap = Math.max(1, shelter.capacity ?? 1);
            const occupancyPct = Math.min(100, Math.round((totalAssigned / shelterCap) * 100));
            const isFull = occupancyPct >= 100;
            const isNearFull = occupancyPct >= 80;

            const iconHtml = `
              <div class="relative group cursor-pointer">
                <div class="w-8 h-8 rounded-lg ${
                  isFull
                    ? 'bg-red-600'
                    : isNearFull
                    ? 'bg-amber-600'
                    : 'bg-emerald-600'
                } border-2 border-white shadow-lg flex items-center justify-center text-white transform hover:scale-110 transition-transform">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div class="absolute -top-1.5 -right-1.5 px-1 py-0.2 bg-slate-900 text-white rounded text-[9px] font-mono font-bold border border-white">
                  ${occupancyPct}%
                </div>
              </div>
            `;
            const icon = createDivIcon(iconHtml, 'shelter-icon', [32, 32], [16, 16]);

            return (
              <Marker
                key={`shelter-${shelter.id}`}
                position={shelter.location}
                icon={icon}
                eventHandlers={{
                  click: () => onSelectShelter?.(shelter.id),
                }}
              >
                <Popup>
                  <div className="p-3 text-xs font-sans text-slate-800 dark:text-slate-200 min-w-[240px]">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                          {shelter.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {shelter.neighborhood}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        {shelter.id}
                      </span>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="mt-2.5 bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Occupancy</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {totalAssigned.toLocaleString()} / {(shelter.capacity ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            occupancyPct >= 95
                              ? 'bg-red-500'
                              : occupancyPct >= 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${occupancyPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1.5">
                        <span>Slots: <span className="text-slate-900 dark:text-slate-100 font-semibold">{Math.max(0, (shelter.capacity ?? 0) - totalAssigned).toLocaleString()}</span></span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{occupancyPct}% Full</span>
                      </div>
                    </div>

                    {/* Amenities */}
                    {shelter.amenities && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {shelter.amenities.map((amenity, i) => (
                          <span
                            key={i}
                            className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                          >
                            ✓ {amenity}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 9. Distribution Points (10 Relief Distribution Centers) */}
        {visibleLayers.distributionPoints &&
          distributionPoints.map((dp) => {
            const iconHtml = `
              <div class="relative cursor-pointer">
                <div class="w-8 h-8 rounded-lg bg-amber-600 border-2 border-white shadow-md flex items-center justify-center text-white transform hover:scale-110 transition-transform">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                    <line x1="8" y1="2" x2="8" y2="18"/>
                    <line x1="16" y1="6" x2="16" y2="22"/>
                  </svg>
                </div>
                <div class="absolute -top-1 -right-1 text-[9px] px-1 bg-amber-900 text-amber-100 rounded font-mono font-bold">
                  ${dp.id}
                </div>
              </div>
            `;
            const icon = createDivIcon(iconHtml, 'dp-icon', [32, 32], [16, 16]);

            return (
              <Marker
                key={`dp-${dp.id}`}
                position={dp.location}
                icon={icon}
                eventHandlers={{
                  click: () => onSelectDistributionPoint?.(dp.id),
                }}
              >
                <Popup>
                  <div className="p-3 text-xs font-sans text-slate-800 dark:text-slate-200 min-w-[220px]">
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{dp.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{dp.target_ward}</div>
                    <div className="mt-2.5 bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1">
                      <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                        Relief Demand & Stock
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Water Needed:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {(dp.demand?.water_litres ?? 0).toLocaleString()} L
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Food Rations:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {(dp.demand?.food_rations ?? 0).toLocaleString()} pk
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Medical Kits:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{dp.demand?.medical_kits ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 10. Disaster Crisis Incidents Layer (NLP Extraction Feed) */}
        {visibleLayers.incidents !== false &&
          incidents &&
          incidents.map((inc) => {
            const icon = createIncidentMarkerIcon(inc.urgency, inc.water_depth_m);
            return (
              <Marker
                key={`incident-${inc.id}`}
                position={inc.coordinates}
                icon={icon}
              >
                <Popup>
                  <div className="p-3 text-xs font-sans text-slate-800 dark:text-slate-200 min-w-[260px] max-w-[320px]">
                    <div className="flex items-start justify-between gap-1.5">
                      <span
                        className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          inc.urgency === 'critical'
                            ? 'bg-red-950 text-red-300 border border-red-700'
                            : 'bg-amber-950 text-amber-300 border border-amber-700'
                        }`}
                      >
                        {inc.urgency} ALERT • {inc.id}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {inc.zone}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-1">
                      {inc.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      📍 {inc.location}
                    </div>

                    <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-2">
                      &quot;{inc.description}&quot;
                    </p>

                    <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-xs font-mono">
                      <div className="bg-slate-900/80 p-1.5 rounded border border-slate-700">
                        <span className="text-[9px] text-slate-400 block uppercase">Water Depth</span>
                        <span className="font-bold text-red-400">{inc.water_depth_m.toFixed(1)} m</span>
                      </div>
                      <div className="bg-slate-900/80 p-1.5 rounded border border-slate-700">
                        <span className="text-[9px] text-slate-400 block uppercase">Stranded Citizens</span>
                        <span className="font-bold text-amber-400">{inc.affected_population.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="mt-2 p-1.5 rounded bg-slate-900/60 border border-slate-800 text-[10px] font-mono space-y-0.5">
                      <div className="text-slate-400 font-bold uppercase">Requested Relief Demands:</div>
                      <div className="text-slate-300">
                        💧 {inc.demands?.water_litres?.toLocaleString() ?? 0}L Water • 🍱 {inc.demands?.food_rations?.toLocaleString() ?? 0} Rations
                      </div>
                      <div className="text-slate-300">
                        🩹 {inc.demands?.medical_kits ?? 0} Kits • 🛶 {inc.demands?.rescue_boats ?? 0} Boats
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] font-mono flex items-center justify-between">
                      <span className="text-slate-400">Road Corridor:</span>
                      <span className={`font-bold ${inc.road_accessible ? 'text-emerald-400' : 'text-red-400'}`}>
                        {inc.road_accessible ? 'ROAD ACCESSIBLE' : 'SEVERED / FLOODED'}
                      </span>
                    </div>

                    {inc.allocated_depot && (
                      <div className="mt-1.5 text-[10px] font-mono p-1 rounded bg-teal-950/70 border border-teal-700 text-teal-300">
                        ✓ OR-Tools Solver Allocated: <b>{inc.allocated_depot}</b>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </LeafletMap>
    </div>
  );
}
