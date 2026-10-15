'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  RotateCcw,
  Layers,
  CloudRain,
  ShieldCheck,
  Globe,
  Sparkles,
  X,
} from 'lucide-react';
import { MapApiKeys, getInitialMapApiKeys, saveMapApiKeys } from '@/lib/mapConfig';

interface MapApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeysUpdated?: (keys: MapApiKeys) => void;
}

export default function MapApiKeysModal({
  isOpen,
  onClose,
  onKeysUpdated,
}: MapApiKeysModalProps) {
  const [keys, setKeys] = useState<MapApiKeys>({
    mapboxToken: '',
    maptilerKey: '',
    stadiaKey: '',
    openweatherKey: '',
    googleMapsKey: '',
    orsKey: '',
  });

  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setKeys(getInitialMapApiKeys());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveMapApiKeys(keys);
    onKeysUpdated?.(keys);
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    const emptyKeys: MapApiKeys = {
      mapboxToken: '',
      maptilerKey: '',
      stadiaKey: '',
      openweatherKey: '',
      googleMapsKey: '',
      orsKey: '',
    };
    setKeys(emptyKeys);
    saveMapApiKeys(emptyKeys);
    onKeysUpdated?.(emptyKeys);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#080d1a] border border-cyan-500/40 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.25)] animate-scale-up font-mono text-xs text-slate-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-cyan-500/20 flex items-center justify-between bg-slate-950/60 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                GEOSPATIAL & MAP API CONFIGURATION
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                  LIVE READY
                </span>
              </h2>
              <p className="text-[10px] text-slate-400">
                Connect external GIS providers or run on built-in unmetered CartoDB & Esri tiles.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Status Banner */}
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
            <div className="text-[11px] leading-relaxed">
              <b>Zero-Breakage Architecture:</b> All API keys are optional. When left blank, Chennai Sentinel automatically streams high-resolution, unmetered CartoDB Dark Matter, Esri World Imagery, and Voyager street vectors without requiring any paid tokens.
            </div>
          </div>

          {/* Provider 1: Mapbox */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white text-xs">Mapbox Access Token</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                    keys.mapboxToken
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {keys.mapboxToken ? 'CONNECTED' : 'STANDBY'}
                </span>
                <a
                  href="https://account.mapbox.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Get Token</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Unlocks Mapbox Dark v11, Satellite Streets, and Navigation Night styles with 512px retina tiles.
            </p>
            <input
              type="password"
              placeholder="pk.eyJ1I..."
              value={keys.mapboxToken}
              onChange={(e) => setKeys({ ...keys, mapboxToken: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:border-cyan-400 focus:outline-none font-mono text-xs"
            />
          </div>

          {/* Provider 2: MapTiler */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-400" />
                <span className="font-bold text-white text-xs">MapTiler Cloud API Key</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                    keys.maptilerKey
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {keys.maptilerKey ? 'CONNECTED' : 'STANDBY'}
                </span>
                <a
                  href="https://cloud.maptiler.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Get Key</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Provides Dataviz Dark, Satellite Hybrid, and high-precision digital elevation terrain contours.
            </p>
            <input
              type="password"
              placeholder="e.g. 7qXv9..."
              value={keys.maptilerKey}
              onChange={(e) => setKeys({ ...keys, maptilerKey: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:border-cyan-400 focus:outline-none font-mono text-xs"
            />
          </div>

          {/* Provider 3: OpenWeatherMap Weather Overlay */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-xs">OpenWeatherMap API Key</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                    keys.openweatherKey
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {keys.openweatherKey ? 'CONNECTED' : 'STANDBY'}
                </span>
                <a
                  href="https://home.openweathermap.org/api_keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Get Key</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Overlays real-time precipitation radar & storm cloud tiles directly across Greater Chennai.
            </p>
            <input
              type="password"
              placeholder="e.g. 4d28e7..."
              value={keys.openweatherKey}
              onChange={(e) => setKeys({ ...keys, openweatherKey: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:border-cyan-400 focus:outline-none font-mono text-xs"
            />
          </div>

          {/* Provider 4: Google Maps Platform & Stadia Maps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-[11px]">Stadia Maps Key</span>
                <span className="text-[9px] text-slate-500 font-mono">Alidade Dark</span>
              </div>
              <input
                type="password"
                placeholder="Stadia Key..."
                value={keys.stadiaKey}
                onChange={(e) => setKeys({ ...keys, stadiaKey: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-[11px]">Google Maps Key</span>
                <span className="text-[9px] text-slate-500 font-mono">Geocoding / Places</span>
              </div>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={keys.googleMapsKey}
                onChange={(e) => setKeys({ ...keys, googleMapsKey: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-cyan-500/20 bg-slate-950/80 rounded-b-2xl flex items-center justify-between">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default Standby</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all"
            >
              {savedFeedback ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Keys Connected!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save & Connect Keys</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
