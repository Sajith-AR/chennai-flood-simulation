'use client';

import React from 'react';
import {
  DisasterParameters,
  PresetScenario,
  FloodZoneInput,
  Coordinates,
} from '@/lib/types';
import { HISTORICAL_PRESETS } from '@/lib/constants';
import {
  CloudRain,
  Waves,
  Wind,
  Layers,
  CircleDot,
  PenTool,
  Play,
  RotateCcw,
  CheckCircle2,
  Undo2,
  History,
} from 'lucide-react';

interface DisasterControlsProps {
  parameters: DisasterParameters;
  onParametersChange: (params: DisasterParameters) => void;
  activeDrawingMode: 'none' | 'circle' | 'polygon';
  setActiveDrawingMode: (mode: 'none' | 'circle' | 'polygon') => void;
  circleRadiusMeters: number;
  setCircleRadiusMeters: (radius: number) => void;
  draftPolygonPoints: Coordinates[];
  onFinishPolygon: () => void;
  onClearDrawing: () => void;
  onUndoLastPoint: () => void;
  activePresetId: string | null;
  onSelectPreset: (preset: PresetScenario) => void;
  onRunSimulation: () => void;
  isSimulating: boolean;
  definedZonesCount: number;
}

export default function DisasterControls({
  parameters,
  onParametersChange,
  activeDrawingMode,
  setActiveDrawingMode,
  circleRadiusMeters,
  setCircleRadiusMeters,
  draftPolygonPoints,
  onFinishPolygon,
  onClearDrawing,
  onUndoLastPoint,
  activePresetId,
  onSelectPreset,
  onRunSimulation,
  isSimulating,
  definedZonesCount,
}: DisasterControlsProps) {
  const intensityLabels: Record<number, string> = {
    1: 'Advisory (25 mm/h)',
    2: 'Moderate (50 mm/h)',
    3: 'Heavy (90 mm/h)',
    4: 'Very Heavy (140 mm/h)',
    5: 'Catastrophic (220+ mm/h)',
  };

  return (
    <div className="glass-panel animate-slide-right flex flex-col gap-5 p-4 rounded-xl text-slate-200 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20 shadow-glow-cyan">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
              Disaster Scenario Setup
            </h2>
            <p className="text-[11px] text-slate-400">
              Chennai GCC Flood Epicenter & Meteorology
            </p>
          </div>
        </div>
        {definedZonesCount > 0 && (
          <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full shadow-glow-cyan">
            {definedZonesCount} {definedZonesCount === 1 ? 'Zone' : 'Zones'} Ready
          </span>
        )}
      </div>

      {/* 1. Quick Historical Disaster Presets */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-800/50 pb-1.5">
          <History className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-300">Historical Disaster Presets</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {HISTORICAL_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={`text-left p-3 rounded-lg border text-xs transition-all duration-200 hover-lift hover:scale-[1.02] ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-glow-amber'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
                }`}
              >
                <div className="font-semibold line-clamp-1">{preset.name}</div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  {preset.default_depth}m • Level {preset.default_rainfall}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Interactive Flood Zone Creation (Drawing & Circle) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-800/50 pb-1.5">
          <PenTool className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-300">Interactive Flood Zone Creation</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Circle Mode Button */}
          <button
            onClick={() =>
              setActiveDrawingMode(activeDrawingMode === 'circle' ? 'none' : 'circle')
            }
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all hover-lift ${
              activeDrawingMode === 'circle'
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-glow-cyan'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <CircleDot className="w-4 h-4" />
            {activeDrawingMode === 'circle' ? 'Click Map for Epicenter' : 'Circle Radius'}
          </button>

          {/* Polygon Mode Button */}
          <button
            onClick={() =>
              setActiveDrawingMode(activeDrawingMode === 'polygon' ? 'none' : 'polygon')
            }
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all hover-lift ${
              activeDrawingMode === 'polygon'
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-glow-cyan'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <PenTool className="w-4 h-4" />
            {activeDrawingMode === 'polygon'
              ? `Points (${draftPolygonPoints.length})`
              : 'Draw Polygon'}
          </button>
        </div>

        {/* Dynamic Controls depending on drawing mode */}
        {activeDrawingMode === 'circle' && (
          <div className="bg-slate-800/50 p-3 rounded-lg border border-cyan-500/30 space-y-2 animate-slide-down shadow-glow-cyan">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Epicenter Radius:</span>
              <span className="font-mono font-bold text-cyan-300">
                {(circleRadiusMeters / 1000).toFixed(1)} km ({circleRadiusMeters} m)
              </span>
            </div>
            <input
              type="range"
              min={500}
              max={5000}
              step={100}
              value={circleRadiusMeters}
              onChange={(e) => setCircleRadiusMeters(Number(e.target.value))}
              className="w-full slider-cyan cursor-pointer"
            />
            <p className="text-[10px] text-cyan-200/80 italic">
              * Click anywhere on the Chennai map to place the flood circle epicenter.
            </p>
          </div>
        )}

        {activeDrawingMode === 'polygon' && (
          <div className="bg-slate-800/50 p-3 rounded-lg border border-cyan-500/30 space-y-3 animate-slide-down shadow-glow-cyan">
            <p className="text-[11px] text-slate-300">
              Click consecutive points on the map to define the polygon boundary perimeter.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onFinishPolygon}
                disabled={draftPolygonPoints.length < 3}
                className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Finish ({draftPolygonPoints.length} pts)
              </button>
              <button
                onClick={onUndoLastPoint}
                disabled={draftPolygonPoints.length === 0}
                className="py-1.5 px-3 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                title="Undo last placed point"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Undo
              </button>
              <button
                onClick={onClearDrawing}
                className="py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Disaster Parameter Controls */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/50 pb-1.5">
          <CloudRain className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-300">Disaster Parameters</h3>
        </div>

        {/* Rainfall Intensity Slider (1 - 5) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Rainfall Intensity</span>
            <span className="font-mono font-bold text-blue-300">
              {intensityLabels[parameters.rainfall_intensity_mm_hr] || `Level ${parameters.rainfall_intensity_mm_hr}`}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={parameters.rainfall_intensity_mm_hr}
            onChange={(e) =>
              onParametersChange({
                ...parameters,
                rainfall_intensity_mm_hr: Number(e.target.value),
              })
            }
            className="w-full slider-blue cursor-pointer"
          />
          <div className="flex justify-between px-1">
            {[1, 2, 3, 4, 5].map((val) => (
              <div
                key={val}
                className={`w-1.5 h-1.5 rounded-full ${
                  parameters.rainfall_intensity_mm_hr >= val
                    ? 'bg-blue-400 shadow-glow-cyan'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>L1 (Advisory)</span>
            <span>L3 (Heavy)</span>
            <span>L5 (Severe)</span>
          </div>
        </div>

        {/* Flood Depth Slider (0.1m - 3.0m) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              Peak Water Inundation Depth
            </span>
            <span className="font-mono font-bold text-cyan-300">
              {parameters.flood_depth_meters.toFixed(1)} m
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={3.0}
            step={0.1}
            value={parameters.flood_depth_meters}
            onChange={(e) =>
              onParametersChange({
                ...parameters,
                flood_depth_meters: Number(e.target.value),
              })
            }
            className="w-full slider-cyan cursor-pointer"
          />
        </div>

        {/* Spread Rate Slider (50m/hr - 500m/hr) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-amber-400" />
              Spread Rate (Propagation Velocity)
            </span>
            <span className="font-mono font-bold text-amber-300">
              {parameters.spread_rate_meters_hr} m/h
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
            className="w-full slider-amber cursor-pointer"
          />
        </div>
      </div>

      {/* 4. Action Button: "Run Simulation" */}
      <div className="pt-2">
        <button
          onClick={onRunSimulation}
          disabled={isSimulating}
          className={`w-full py-3 px-4 rounded-lg font-extrabold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
            isSimulating
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-80'
              : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 bg-[length:200%_100%] hover:animate-gradient-shift text-slate-950 shadow-glow-cyan hover:shadow-lg hover:shadow-cyan-500/40 relative'
          }`}
        >
          {!isSimulating && (
            <div className="absolute inset-0 rounded-lg ring-2 ring-cyan-400/50 animate-ping opacity-20" />
          )}
          {isSimulating ? (
            <>
              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              <span>Computing Simulation Engine...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-slate-950" />
              <span>Run Spatio-Temporal Simulation</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
