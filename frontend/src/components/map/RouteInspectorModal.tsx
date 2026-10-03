'use client';

import React, { useEffect } from 'react';
import { RouteInspectionData } from '@/lib/types';
import {
  Truck,
  Anchor,
  Plane,
  Clock,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  X,
  Droplets,
  Package,
  HeartPulse,
  Radio,
  LifeBuoy,
  ChevronRight,
  TrendingUp,
  MapPin,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface RouteInspectorModalProps {
  route: RouteInspectionData | null;
  isOpen: boolean;
  onClose: () => void;
  onReroute?: (routeId: string) => void;
  onUpgradeMode?: (routeId: string, newMode: 'amphibious' | 'helicopter') => void;
}

export default function RouteInspectorModal({
  route,
  isOpen,
  onClose,
  onReroute,
  onUpgradeMode,
}: RouteInspectorModalProps) {
  // Close on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !route) return null;

  const modeIcon =
    route.transport_mode === 'helicopter' ? (
      <Plane className="w-5 h-5 text-purple-400" />
    ) : route.transport_mode === 'amphibious' ? (
      <Anchor className="w-5 h-5 text-cyan-400" />
    ) : (
      <Truck className="w-5 h-5 text-amber-400" />
    );

  const modeColor =
    route.transport_mode === 'helicopter'
      ? 'text-purple-400 border-purple-500/40 bg-purple-950/40 shadow-glow-purple'
      : route.transport_mode === 'amphibious'
      ? 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40 shadow-glow-cyan'
      : 'text-amber-400 border-amber-500/40 bg-amber-950/40 shadow-glow-amber';

  const isImpassable = route.status === 'impassable' || route.status === 'blocked';
  const isCaution = route.status === 'caution' || route.status === 'rerouted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div
        className="relative w-full max-w-xl glass-panel-strong border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Aerospace HUD Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border flex items-center justify-center ${modeColor}`}>
              {modeIcon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                  Route Telemetry HUD
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                  {route.route_id}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100 mt-0.5 font-sans">
                {route.route_name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            title="Close inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Status & Transport Mode Banner */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Transport Mode</span>
              <span className="text-slate-100 font-bold capitalize">
                {route.transport_mode === 'truck' ? 'Heavy 6x6 Truck' : route.transport_mode === 'amphibious' ? 'Amphibious Craft' : 'IAF Chetak Sortie'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Convoy Size</span>
              <span className="text-cyan-400 font-bold">
                {route.convoy_vehicle_count} {route.transport_mode === 'helicopter' ? 'Sortie' : route.transport_mode === 'amphibious' ? 'Crafts' : 'Trucks'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Transit ETA</span>
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {route.transit_time_min} mins
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Distance</span>
              <span className="text-slate-200 font-bold">{route.distance_km} km</span>
            </div>
          </div>

          {/* Origin & Destination Corridor */}
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Origin Hub</span>
                <span className="font-semibold text-slate-200">{route.source_name}</span>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-500" />

            <div className="flex items-center gap-2 text-right">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Destination Haven</span>
                <span className="font-semibold text-slate-200">{route.destination_name}</span>
              </div>
              <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            </div>
          </div>

          {/* Water Clearance Depth Profile Graph */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-slate-200 font-mono uppercase">
                  Water Clearance Depth Profile
                </h4>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  &lt; 0.4m Clear
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  0.4 - 0.8m Caution
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  &gt; 0.8m Submerged
                </span>
              </div>
            </div>

            {/* Depth Profile Bars */}
            <div className="pt-2">
              <div className="h-28 w-full flex items-end gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 relative">
                {/* Wading limit threshold marker line for trucks */}
                <div
                  className="absolute left-0 right-0 border-b border-dashed border-red-500/60 z-10 flex items-center justify-end pr-2"
                  style={{ bottom: '48%' }}
                >
                  <span className="text-[9px] font-mono text-red-400 bg-slate-950 px-1 rounded">
                    Truck Max Clearance: {route.water_clearance_depth_m}m
                  </span>
                </div>

                {route.depth_profile.map((point, idx) => {
                  const barHeightPct = Math.min(100, Math.max(12, (point.depth_m / 2.5) * 100));
                  const isOverClearance = point.depth_m > route.water_clearance_depth_m;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      {/* Hover Tooltip */}
                      <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-20">
                        Dist: {point.step_km}km | Depth: {point.depth_m}m
                      </div>

                      <div
                        className={`w-full rounded-t transition-all duration-300 ${
                          point.depth_m > 0.8
                            ? 'bg-red-500'
                            : point.depth_m > 0.4
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ height: `${barHeightPct}%` }}
                      />
                      <span className="text-[9px] font-mono text-slate-400 mt-1">
                        {point.step_km}k
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-2 px-1">
                <span>Peak Depth Encountered: <b className="text-red-400">{route.max_water_depth_m} m</b></span>
                <span>Vehicle Clearance: <b className="text-cyan-400">{route.water_clearance_depth_m} m</b></span>
              </div>
            </div>
          </div>

          {/* Supply & Evacuee Manifest */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <h4 className="text-xs font-mono font-bold text-slate-300 uppercase">
              Convoy Payload & Rescue Manifest
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-400" />
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Potable Water</span>
                  <span className="text-slate-100 font-bold">{route.manifest.water_litres.toLocaleString()} L</span>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Food Rations</span>
                  <span className="text-slate-100 font-bold">{route.manifest.food_rations.toLocaleString()} pk</span>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-red-400" />
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Medical Kits</span>
                  <span className="text-slate-100 font-bold">{route.manifest.medical_kits} kits</span>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-orange-400" />
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Life Jackets</span>
                  <span className="text-slate-100 font-bold">{route.manifest.life_jackets || 60} units</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Recommendation Warning */}
          <div className={`p-3.5 rounded-xl border text-xs font-sans flex items-start gap-3 ${
            isImpassable
              ? 'bg-red-950/40 border-red-500/50 text-red-200'
              : isCaution
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
              : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
          }`}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block uppercase font-mono text-[10px]">
                Tactical Hydrological Assessment:
              </span>
              <p className="mt-0.5 leading-relaxed">{route.recommendation}</p>
            </div>
          </div>

          {/* Tactical Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {onReroute && (
              <button
                onClick={() => {
                  onReroute(route.route_id);
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 flex items-center justify-center gap-2 text-xs font-bold font-mono transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reroute via High-Ground Bypass</span>
              </button>
            )}

            {onUpgradeMode && route.transport_mode !== 'amphibious' && (
              <button
                onClick={() => {
                  onUpgradeMode(route.route_id, 'amphibious');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 flex items-center justify-center gap-2 text-xs font-bold font-mono transition-all shadow-glow-cyan"
              >
                <Anchor className="w-3.5 h-3.5" />
                <span>Upgrade to Amphibious Gemini Craft</span>
              </button>
            )}

            {onUpgradeMode && route.transport_mode === 'amphibious' && (
              <button
                onClick={() => {
                  onUpgradeMode(route.route_id, 'helicopter');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-2 text-xs font-bold font-mono transition-all shadow-glow-purple"
              >
                <Plane className="w-3.5 h-3.5" />
                <span>Deploy IAF Chetak Air Escort</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
