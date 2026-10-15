'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Cpu,
  TrendingUp,
  Scale,
  Boxes,
  Navigation,
  Radio,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Truck,
  Anchor,
  Send,
  RefreshCw,
  Search,
  Filter,
  Plus,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  DisasterIncident,
  NLPExtractionResult,
  DemandForecastResult,
  VulnerabilityRanking,
  AllocationPlan,
  OptimizedRouteResult,
  PipelineRunResult,
  Coordinates,
} from '@/lib/types';
import {
  getIncidents,
  createIncident,
  deleteIncident,
  extractNLP,
  getNLPSamples,
  getDemandForecast,
  getVulnerabilityScores,
  optimizeAllocation,
  optimizeRoute,
  runCrisisPipeline,
} from '@/lib/api';

interface CrisisIntelligencePipelineProps {
  onClose?: () => void;
  onFlyToLocation?: (coords: Coordinates, zoom?: number) => void;
}

type PipelineTab = 'reports' | 'nlp' | 'forecast' | 'scoring' | 'allocation' | 'routing' | 'demo';

export default function CrisisIntelligencePipeline({
  onClose,
  onFlyToLocation,
}: CrisisIntelligencePipelineProps) {
  const [activeTab, setActiveTab] = useState<PipelineTab>('demo');
  const [loading, setLoading] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 1. Incidents State
  const [incidents, setIncidents] = useState<DisasterIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<DisasterIncident | null>(null);
  const [incidentSearch, setIncidentSearch] = useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [showNewIncidentModal, setShowNewIncidentModal] = useState<boolean>(false);
  const [newIncidentForm, setNewIncidentForm] = useState({
    title: '',
    location: '',
    zone: 'Zone 13 (Velachery)',
    affected_population: 300,
    water_depth_m: 1.2,
    urgency: 'high',
    description: '',
  });

  // 2. NLP State
  const [nlpSamples, setNlpSamples] = useState<{ id: string; title: string; text: string }[]>([]);
  const [nlpInputText, setNlpInputText] = useState<string>('');
  const [nlpResult, setNlpResult] = useState<NLPExtractionResult | null>(null);

  // 3. Forecast State
  const [forecastHorizon, setForecastHorizon] = useState<number>(24);
  const [forecastResult, setForecastResult] = useState<DemandForecastResult | null>(null);

  // 4. Vulnerability Scoring State
  const [vulnerabilityRankings, setVulnerabilityRankings] = useState<VulnerabilityRanking[]>([]);

  // 5. Allocation State
  const [allocationPlan, setAllocationPlan] = useState<AllocationPlan | null>(null);

  // 6. Route Optimization State
  const [routeResult, setRouteResult] = useState<OptimizedRouteResult | null>(null);
  const [selectedDepotCoord, setSelectedDepotCoord] = useState<[number, number]>([13.0827, 80.2707]);
  const [selectedDestCoord, setSelectedDestCoord] = useState<[number, number]>([12.9752, 80.2215]);

  // 7. Full Automated Pipeline Demo State
  const [fullPipelineResult, setFullPipelineResult] = useState<PipelineRunResult | null>(null);
  const [pipelineStepActive, setPipelineStepActive] = useState<number>(0);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Initial Data Fetch
  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      try {
        const [incList, samples, rankings, forecast] = await Promise.all([
          getIncidents(),
          getNLPSamples(),
          getVulnerabilityScores(),
          getDemandForecast({ population: 500, horizon_hours: 24 }),
        ]);
        setIncidents(incList);
        if (incList.length > 0) {
          setSelectedIncident(incList[0]);
        }
        setNlpSamples(samples);
        if (samples.length > 0) {
          setNlpInputText(samples[0].text);
        }
        setVulnerabilityRankings(rankings);
        setForecastResult(forecast);
      } catch (err) {
        console.error('Failed to load crisis intelligence data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  // Handler: Run NLP
  const handleRunNLP = async (textToUse?: string) => {
    const txt = textToUse || nlpInputText;
    if (!txt.trim()) return;
    setLoading(true);
    try {
      const res = await extractNLP(txt);
      if (res) {
        setNlpResult(res);
        triggerToast(`NLP Extracted: ${res.location} (${res.urgency.toUpperCase()})`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Handler: Run Forecast
  const handleRunForecast = async (horizon: number = forecastHorizon) => {
    setLoading(true);
    try {
      const pop = selectedIncident?.affected_population || 500;
      const depth = selectedIncident?.water_depth_m || 1.4;
      const res = await getDemandForecast({
        population: pop,
        flood_depth_m: depth,
        horizon_hours: horizon,
      });
      if (res) {
        setForecastResult(res);
        triggerToast(`Demand Forecast generated for T+${horizon}h horizon`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler: Run Allocation
  const handleRunAllocation = async () => {
    setLoading(true);
    try {
      const res = await optimizeAllocation();
      if (res) {
        setAllocationPlan(res);
        triggerToast(`Google OR-Tools: Solved ${res.allocations_count} optimal depot routes.`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler: Run Route
  const handleRunRouting = async (src?: [number, number], dst?: [number, number]) => {
    setLoading(true);
    try {
      const s = src || selectedDepotCoord;
      const d = dst || selectedDestCoord;
      const res = await optimizeRoute({
        source_coords: s,
        destination_coords: d,
        source_name: 'GCC Central Logistics Depot',
        destination_name: selectedIncident?.location || 'Velachery AGS Colony',
      });
      if (res) {
        setRouteResult(res);
        triggerToast(`Route Optimized: ${res.distance_km} km (${res.transport_mode.toUpperCase()})`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler: Run Full Automated End-to-End Pipeline
  const handleRunFullPipeline = async () => {
    setLoading(true);
    setPipelineStepActive(1);
    try {
      // Step simulation delay for dramatic demonstration
      const msg = nlpInputText || 'SOS! Heavy flooding in Velachery AGS Colony, around 500 people stranded without drinking water!';
      
      setPipelineStepActive(2);
      await new Promise((r) => setTimeout(r, 400));
      setPipelineStepActive(3);
      await new Promise((r) => setTimeout(r, 400));
      setPipelineStepActive(4);
      await new Promise((r) => setTimeout(r, 400));
      setPipelineStepActive(5);
      await new Promise((r) => setTimeout(r, 400));
      setPipelineStepActive(6);
      await new Promise((r) => setTimeout(r, 400));
      setPipelineStepActive(7);

      const res = await runCrisisPipeline(msg, selectedIncident?.id, forecastHorizon);
      if (res && res.results) {
        setFullPipelineResult(res);
        setNlpResult(res.results.step2_nlp_extraction);
        setForecastResult(res.results.step3_demand_forecast);
        setAllocationPlan(res.results.step5_resource_allocation);
        setRouteResult(res.results.step6_route_optimization);
        triggerToast('⚡ Crisis Intelligence Pipeline Executed Successfully (7/7 Stages Complete)');
      }
    } finally {
      setLoading(false);
      setPipelineStepActive(0);
    }
  };

  // Filtered incidents
  const filteredIncidents = incidents.filter((inc) => {
    const matchUrgency = urgencyFilter === 'all' || inc.urgency.toLowerCase() === urgencyFilter.toLowerCase();
    const matchSearch =
      !incidentSearch ||
      inc.title.toLowerCase().includes(incidentSearch.toLowerCase()) ||
      inc.location.toLowerCase().includes(incidentSearch.toLowerCase()) ||
      inc.description.toLowerCase().includes(incidentSearch.toLowerCase());
    return matchUrgency && matchSearch;
  });

  return (
    <div className="flex flex-col h-full w-full bg-[#070b14] text-slate-100 overflow-hidden font-sans border-l border-cyan-500/20">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="absolute top-4 right-4 z-50 bg-[#0c1424] text-cyan-300 border border-cyan-400 px-4 py-2.5 rounded-xl shadow-2xl font-mono text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="px-6 py-4 bg-[#0a0f1d] border-b border-cyan-500/30 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-700 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-wider text-slate-100 uppercase">
                AI Crisis Resource Intelligence & Autonomous Logistics Platform
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                OR-TOOLS + ENSEMBLE ML
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Disaster Reports ➔ NLP Extraction ➔ Demand Forecast ➔ Priority Scoring ➔ Allocation ➔ Routing
            </p>
          </div>
        </div>

        {/* Master 1-Click Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunFullPipeline}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            <span>RUN FULL 7-STAGE PIPELINE</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
            >
              Close
            </button>
          )}
        </div>
      </header>

      {/* WORKFLOW STEPPER NAVIGATION TABS */}
      <div className="px-6 py-2 bg-[#080d1a] border-b border-slate-800 flex items-center gap-1 overflow-x-auto shrink-0 custom-scrollbar">
        {[
          { id: 'demo', label: '⚡ Pipeline Demo', icon: Play, badge: 'Full Flow' },
          { id: 'reports', label: '1. Incident Reports', icon: FileText, badge: `${incidents.length}` },
          { id: 'nlp', label: '2. NLP Extractor', icon: Cpu, badge: 'spaCy' },
          { id: 'forecast', label: '3. Demand Forecast', icon: TrendingUp, badge: 'ML' },
          { id: 'scoring', label: '4. Priority Scoring', icon: Scale, badge: 'MCDA' },
          { id: 'allocation', label: '5. Resource Allocation', icon: Boxes, badge: 'OR-Tools' },
          { id: 'routing', label: '6. Route Optimization', icon: Navigation, badge: 'NetworkX' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PipelineTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)] font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] ${
                    isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* MAIN CONTENT BODY */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-radial-gradient">
        {/* ========================================================================= */}
        {/* TAB 0: FULL PIPELINE DEMO & SUMMARY                                       */}
        {/* ========================================================================= */}
        {activeTab === 'demo' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Interactive Progress Banner */}
            <div className="p-5 rounded-2xl bg-[#0a1020]/90 border border-cyan-500/30 shadow-2xl relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    Autonomous Crisis Response Workflow
                  </div>
                  <h2 className="text-xl font-bold text-slate-100 mt-1">
                    End-to-End Emergency Resolution Demonstration
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
                    Simulates citizen distress intake, linguistic NLP token extraction, ML demand forecasting,
                    explainable vulnerability prioritization, Google OR-Tools multi-depot allocation, and multi-modal route dispatch.
                  </p>
                </div>

                <button
                  onClick={handleRunFullPipeline}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold shadow-glow-cyan flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                  <span>{loading ? 'EXECUTING PIPELINE...' : 'EXECUTE PIPELINE NOW'}</span>
                </button>
              </div>

              {/* 7 Visual Stage Nodes */}
              <div className="grid grid-cols-2 md:grid-cols-7 gap-2 mt-6 pt-6 border-t border-slate-800">
                {[
                  { step: 1, title: 'Disaster Report', sub: 'Velachery SOS', color: 'border-red-500 text-red-400' },
                  { step: 2, title: 'NLP Extraction', sub: 'Location & Pop', color: 'border-cyan-500 text-cyan-400' },
                  { step: 3, title: 'Demand Forecast', sub: '6,133L Water', color: 'border-teal-500 text-teal-400' },
                  { step: 4, title: 'Priority Scoring', sub: '85.6/100 Critical', color: 'border-amber-500 text-amber-400' },
                  { step: 5, title: 'OR-Tools Allocation', sub: 'Guindy & Tambaram', color: 'border-purple-500 text-purple-400' },
                  { step: 6, title: 'Route Optimization', sub: '7.8 km 6x6 Truck', color: 'border-emerald-500 text-emerald-400' },
                  { step: 7, title: 'Cell Broadcast', sub: '2,410 Towers', color: 'border-blue-500 text-blue-400' },
                ].map((s) => (
                  <div
                    key={s.step}
                    className={`p-2.5 rounded-xl bg-slate-900/80 border ${s.color} flex flex-col justify-between text-xs font-mono`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                      <span>STAGE 0{s.step}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="font-bold text-slate-200 mt-1">{s.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: NLP Extracted Report */}
              <div className="p-5 rounded-2xl bg-[#090e1c] border border-cyan-500/20 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" />
                    <span>NLP INTELLIGENCE</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-red-950 text-red-400 border border-red-800">
                    CRITICAL URGENCY
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-100">
                  {nlpResult?.location || 'Velachery AGS Colony'}
                </div>
                <p className="text-xs text-slate-300 font-mono bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                  &quot;SOS! Catastrophic flash flood in Velachery AGS Colony. Water entered ground floors and is 4 feet deep. Around 500 people need drinking water and food urgently!&quot;
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">POPULATION</span>
                    <span className="font-bold text-slate-100">{nlpResult?.affected_population || 500} Citizens</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">WATER DEPTH</span>
                    <span className="font-bold text-blue-400">{nlpResult?.water_depth_m || 1.2} m</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-cyan-300 flex items-center justify-between pt-2 border-t border-slate-800">
                  <span>Confidence: <b>{Math.round((nlpResult?.confidence_score || 0.88) * 100)}%</b></span>
                  <button onClick={() => setActiveTab('nlp')} className="text-cyan-400 underline hover:text-cyan-300">
                    Inspect NLP ↗
                  </button>
                </div>
              </div>

              {/* Card 2: Vulnerability Priority */}
              <div className="p-5 rounded-2xl bg-[#090e1c] border border-cyan-500/20 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                    <Scale className="w-4 h-4" />
                    <span>PRIORITY RANKING</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800">
                    SCORE: 85.6 / 100
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-100">
                  MCDA Weighted Priority Analysis
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Population Impact (30%):</span>
                    <span className="text-slate-200 font-bold">25.0 pts</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Incident Urgency (25%):</span>
                    <span className="text-slate-200 font-bold">25.0 pts</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Resource Deficit (15%):</span>
                    <span className="text-slate-200 font-bold">13.0 pts</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Inundation Depth (10%):</span>
                    <span className="text-slate-200 font-bold">8.2 pts</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Road Severance (10%):</span>
                    <span className="text-slate-200 font-bold">9.5 pts</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-cyan-300 flex items-center justify-between pt-2 border-t border-slate-800">
                  <span>Class: <b className="text-red-400">CRITICAL</b></span>
                  <button onClick={() => setActiveTab('scoring')} className="text-cyan-400 underline hover:text-cyan-300">
                    Inspect Factors ↗
                  </button>
                </div>
              </div>

              {/* Card 3: Google OR-Tools Allocation */}
              <div className="p-5 rounded-2xl bg-[#090e1c] border border-cyan-500/20 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-purple-400 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4" />
                    <span>OR-TOOLS SOLVER</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    OPTIMAL DISPATCH
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-100">
                  Guindy Transit Hub ➔ Velachery
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Potable Water:</span>
                    <span className="font-bold text-cyan-300">5,200 Litres</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Food Rations:</span>
                    <span className="font-bold text-amber-300">1,040 Packs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Medical Kits:</span>
                    <span className="font-bold text-red-300">55 Trauma Kits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rescue Zodiacs:</span>
                    <span className="font-bold text-purple-300">4 Craft</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-cyan-300 flex items-center justify-between pt-2 border-t border-slate-800">
                  <span>Transport: <b>Heavy 6x6 (7.8 km)</b></span>
                  <button onClick={() => setActiveTab('allocation')} className="text-cyan-400 underline hover:text-cyan-300">
                    Full Ledger ↗
                  </button>
                </div>
              </div>
            </div>

            {/* Broadcast & Operational Alert Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-950 border border-red-500/40 shadow-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-400">
                  <Radio className="w-4 h-4 animate-ping" />
                  <span>CELLULAR BROADCAST ALERT AUTHORIZED (CHANNEL 4370)</span>
                </div>
                <div className="text-sm font-bold text-slate-100">
                  Bilingual English / Tamil Citizen Alert Transmitted
                </div>
                <p className="text-xs text-slate-300 font-mono max-w-3xl">
                  &quot;GCC EMERGENCY ALERT: Flood response active in Velachery AGS Colony. Relief convoy dispatched with potable water, rations, and first aid. Civilians advised to seek elevated ground. Helpline: 1913.&quot;
                </p>
              </div>

              <div className="flex items-center gap-3">
                {onFlyToLocation && (
                  <button
                    onClick={() => onFlyToLocation([12.9752, 80.2215], 14)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30 flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>FLY TO SECTOR</span>
                  </button>
                )}
                <button
                  onClick={() => triggerToast('Emergency Klaxon Re-transmitted to 2,410 Towers')}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold shadow-glow-red"
                >
                  BROADCAST KLAXON
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: DISASTER INCIDENT MANAGEMENT                                       */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Disaster Incident Reports</h2>
                <p className="text-xs text-slate-400 font-mono">
                  Manage citizen emergency calls, field distress reports, and municipal alerts.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNewIncidentModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Submit Incident</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs">
              <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search incident, location, or keyword..."
                  value={incidentSearch}
                  onChange={(e) => setIncidentSearch(e.target.value)}
                  className="bg-transparent text-slate-200 outline-none w-full text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Urgency:</span>
                {['all', 'critical', 'high', 'medium'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setUrgencyFilter(lvl)}
                    className={`px-2.5 py-1 rounded capitalize ${
                      urgencyFilter === lvl
                        ? 'bg-cyan-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Incidents Table / Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-slate-900/90 border-cyan-400 shadow-glow-cyan'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-400">{inc.id}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                          inc.urgency === 'critical'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : inc.urgency === 'high'
                            ? 'bg-orange-950 text-orange-300 border border-orange-800'
                            : 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                        }`}
                      >
                        {inc.urgency}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-slate-100 mt-1">{inc.title}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>{inc.location} ({inc.zone})</span>
                    </div>

                    <p className="text-xs text-slate-300 mt-2 line-clamp-2">{inc.description}</p>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-500 text-[9px] block">STRANDED</span>
                        <span className="font-bold text-slate-200">{inc.affected_population}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[9px] block">WATER DEPTH</span>
                        <span className="font-bold text-blue-400">{inc.water_depth_m}m</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[9px] block">ROAD ACCESS</span>
                        <span className={inc.road_accessible ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                          {inc.road_accessible ? 'Clear' : 'Severed'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNlpInputText(inc.description);
                          setActiveTab('nlp');
                          handleRunNLP(inc.description);
                        }}
                        className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <span>Extract with NLP</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      {onFlyToLocation && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFlyToLocation(inc.coordinates, 14);
                          }}
                          className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>View on Map</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: NLP INFORMATION EXTRACTION                                         */}
        {/* ========================================================================= */}
        {activeTab === 'nlp' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100">NLP Information Extractor</h2>
              <p className="text-xs text-slate-400 font-mono">
                Extracts location, affected population, flood depth, urgency, and resource demands from raw text.
              </p>
            </div>

            {/* Quick Sample Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Load Chennai Distress Template:</span>
              {nlpSamples.map((samp) => (
                <button
                  key={samp.id}
                  onClick={() => {
                    setNlpInputText(samp.text);
                    handleRunNLP(samp.text);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs font-mono text-slate-300"
                >
                  {samp.title}
                </button>
              ))}
            </div>

            {/* Text Input Box */}
            <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-3 shadow-xl">
              <label className="text-xs font-mono text-cyan-300 font-bold block">
                RAW DISASTER MESSAGE (SMS / HELPLINE / CITIZEN REPORT):
              </label>
              <textarea
                rows={4}
                value={nlpInputText}
                onChange={(e) => setNlpInputText(e.target.value)}
                placeholder="Enter unstructured distress text..."
                className="w-full bg-[#070b14] p-3 rounded-lg border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">
                  Tokenizer: spaCy linguistic parser & Chennai Metropolitan Gazetteer
                </span>
                <button
                  onClick={() => handleRunNLP()}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold shadow-glow-cyan disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
                  <span>EXTRACT STRUCTURED INTELLIGENCE</span>
                </button>
              </div>
            </div>

            {/* Extracted Intelligence Output */}
            {nlpResult && (
              <div className="p-5 rounded-2xl bg-[#090e1c] border border-cyan-500/30 shadow-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-sm text-slate-100">
                      Structured Disaster Intelligence Extraction Result
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-400">Model Confidence:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                      {Math.round(nlpResult.confidence_score * 100)}% Match
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">CANONICAL LOCATION</span>
                    <span className="font-bold text-cyan-300 text-sm">{nlpResult.location}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{nlpResult.zone}</span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">AFFECTED POPULATION</span>
                    <span className="font-bold text-slate-100 text-sm">{nlpResult.affected_population.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Citizens in distress</span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">WATER INUNDATION</span>
                    <span className="font-bold text-blue-400 text-sm">{nlpResult.water_depth_m} meters</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {nlpResult.water_depth_m >= 0.35 ? '⚠️ Road Impassable' : '✓ 6x6 Wading Clear'}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">URGENCY TIER</span>
                    <span className="font-bold uppercase text-red-400 text-sm">{nlpResult.urgency}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Disaster Protocol Active</span>
                  </div>
                </div>

                {/* Sphere Demands Derived */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs">
                  <div className="text-[10px] uppercase text-cyan-400 font-bold mb-2">
                    DERIVED RELIEF DEMANDS (SPHERE HUMANITARIAN STANDARD):
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-500 block">WATER</span>
                      <span className="font-bold text-cyan-300">{nlpResult.demands.water_litres.toLocaleString()} L</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-500 block">FOOD RATIONS</span>
                      <span className="font-bold text-amber-300">{nlpResult.demands.food_rations.toLocaleString()} pk</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-500 block">MED KITS</span>
                      <span className="font-bold text-red-300">{nlpResult.demands.medical_kits} kits</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-500 block">BLANKETS</span>
                      <span className="font-bold text-slate-200">{nlpResult.demands.blankets} units</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-500 block">RESCUE BOATS</span>
                      <span className="font-bold text-purple-300">{nlpResult.demands.rescue_boats} craft</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-mono bg-cyan-950/20 p-2.5 rounded border border-cyan-500/20">
                  <b>Explanation:</b> {nlpResult.explanation}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DEMAND FORECASTING                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'forecast' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Crisis Resource Demand Forecasting</h2>
                <p className="text-xs text-slate-400 font-mono">
                  Ensemble ML Regressor (PyTorch DNN + XGBoost + RF) trained on 2015–2023 historical floods.
                </p>
              </div>

              {/* Horizon Picker */}
              <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
                <span className="text-slate-400 px-2">Forecast Horizon:</span>
                {[6, 12, 24, 48].map((h) => (
                  <button
                    key={h}
                    onClick={() => {
                      setForecastHorizon(h);
                      handleRunForecast(h);
                    }}
                    className={`px-3 py-1 rounded-lg ${
                      forecastHorizon === h
                        ? 'bg-cyan-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    T+{h}h
                  </button>
                ))}
              </div>
            </div>

            {forecastResult && (
              <>
                {/* Method & Accuracy Banner */}
                <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span><b>Predictive Engine:</b> {forecastResult.method}</span>
                  </div>
                  <span className="text-[10px] text-cyan-300 bg-cyan-900/60 px-2 py-0.5 rounded border border-cyan-600">
                    {forecastResult.is_ai_prediction ? 'TRAINED ML ENSEMBLE' : 'SPHERE STANDARDS BASELINE'}
                  </span>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">WATER DEMAND (T+{forecastHorizon}H)</span>
                    <span className="text-xl font-bold text-cyan-400 mt-1 block">
                      {forecastResult.demands.water_litres.toLocaleString()} L
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Depot Stock: {forecastResult.available_stock.water_litres.toLocaleString()} L
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">FOOD RATIONS DEMAND</span>
                    <span className="text-xl font-bold text-amber-400 mt-1 block">
                      {forecastResult.demands.food_rations.toLocaleString()} pk
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Depot Stock: {forecastResult.available_stock.food_rations.toLocaleString()} pk
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">MEDICAL KITS DEMAND</span>
                    <span className="text-xl font-bold text-red-400 mt-1 block">
                      {forecastResult.demands.medical_kits.toLocaleString()} kits
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Depot Stock: {forecastResult.available_stock.medical_kits.toLocaleString()} kits
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">PROJECTED SHORTAGE</span>
                    <span className="text-xl font-bold text-emerald-400 mt-1 block">
                      {forecastResult.projected_shortage.water_litres === 0 ? '0 (Adequate)' : `${forecastResult.projected_shortage.water_litres} L`}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Inventory Conservation OK</span>
                  </div>
                </div>

                {/* Hourly Progression Table / Chart */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-3">
                  <div className="text-[11px] font-bold text-cyan-400 uppercase">
                    Hourly Demand Trajectory & Burn Rate (T+0h to T+{forecastHorizon}h):
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800 text-[10px]">
                          <th className="py-2">TIMELINE STAGE</th>
                          <th>CUMULATIVE WATER (L)</th>
                          <th>FOOD RATIONS</th>
                          <th>MEDICAL KITS</th>
                          <th>BURN VELOCITY</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {forecastResult.hourly_timeline.map((step) => (
                          <tr key={step.hour} className="hover:bg-slate-800/40">
                            <td className="py-2 font-bold text-cyan-300">{step.hour}</td>
                            <td>{step.water_litres.toLocaleString()} L</td>
                            <td>{step.food_rations.toLocaleString()} pk</td>
                            <td>{step.medical_kits} kits</td>
                            <td className="text-amber-400 font-bold">{step.burn_rate_pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SHAP Feature Attribution */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 uppercase">
                    Explainable AI (SHAP Feature Importance Attribution):
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {forecastResult.feature_importance.map((f, i) => (
                      <div key={i} className="p-2.5 rounded bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">{f.factor}</span>
                        <span className="text-sm font-bold text-cyan-300 mt-0.5 block">{f.importance_pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: VULNERABILITY & PRIORITY SCORING                                   */}
        {/* ========================================================================= */}
        {activeTab === 'scoring' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Vulnerability & Priority Scoring (MCDA)</h2>
              <p className="text-xs text-slate-400 font-mono">
                Multi-Criteria Decision Analysis evaluating population scale (30%), urgency (25%), deficit (15%), flood depth (10%), and road isolation (10%).
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 font-mono text-xs">
              {vulnerabilityRankings.map((rank, idx) => (
                <div
                  key={rank.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-600 flex items-center justify-center font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-sm text-slate-100">{rank.name}</span>
                      <span className="text-slate-400 text-[10px]">({rank.zone || 'Chennai Sector'})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="px-2.5 py-0.5 rounded font-bold uppercase text-[10px]"
                        style={{ backgroundColor: `${rank.badge_color}25`, color: rank.badge_color, border: `1px solid ${rank.badge_color}60` }}
                      >
                        {rank.priority_tier} PRIORITY
                      </span>
                      <span className="text-base font-bold text-slate-100">{rank.priority_score} / 100</span>
                    </div>
                  </div>

                  {/* Factor Breakdown Bars */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[10px]">
                    {rank.factor_breakdown.map((fb, i) => (
                      <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800/80">
                        <span className="text-slate-500 block">{fb.factor} ({fb.weight_pct}%)</span>
                        <span className="text-slate-200 font-bold mt-0.5 block">{fb.raw_value}</span>
                        <span className="text-cyan-400 text-[9px] mt-0.5 block">+{fb.contribution} pts</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
                    <b>Rationale:</b> {rank.explainable_rationale}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: RESOURCE ALLOCATION ENGINE (OR-TOOLS)                              */}
        {/* ========================================================================= */}
        {activeTab === 'allocation' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Autonomous Resource Allocation Engine</h2>
                <p className="text-xs text-slate-400 font-mono">
                  Google OR-Tools pywraplp linear solver optimizing multi-commodity emergency stocks across 5 strategic Chennai depots.
                </p>
              </div>

              <button
                onClick={handleRunAllocation}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Boxes className="w-3.5 h-3.5" />}
                <span>RUN RESOURCE ALLOCATION (OR-TOOLS)</span>
              </button>
            </div>

            {allocationPlan && (
              <>
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs font-mono">
                  <span><b>Solver Algorithm:</b> {allocationPlan.solver_method}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold uppercase">
                    Status: {allocationPlan.status}
                  </span>
                </div>

                {/* Allocation Matrix Table */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-3">
                  <div className="text-[11px] font-bold text-purple-400 uppercase">
                    Optimal Dispatch Matrix ({allocationPlan.allocations.length} Routes Authorized):
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800 text-[10px]">
                          <th className="py-2">SOURCE DEPOT</th>
                          <th>DESTINATION SECTOR</th>
                          <th>DISTANCE & TRANSIT</th>
                          <th>TRANSPORT MODE</th>
                          <th>ALLOCATED SUPPLIES</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {allocationPlan.allocations.map((alloc) => (
                          <tr key={alloc.allocation_id} className="hover:bg-slate-800/40">
                            <td className="py-2.5 font-bold text-slate-200">{alloc.source_warehouse_name}</td>
                            <td className="font-bold text-cyan-300">{alloc.destination_name}</td>
                            <td>{alloc.distance_km} km ({alloc.estimated_transit_min}m)</td>
                            <td>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">
                                {alloc.transport_mode}
                              </span>
                            </td>
                            <td className="text-slate-300">
                              {alloc.allocated_supplies.water_litres ? `${alloc.allocated_supplies.water_litres.toLocaleString()}L Water, ` : ''}
                              {alloc.allocated_supplies.food_rations ? `${alloc.allocated_supplies.food_rations.toLocaleString()} Food, ` : ''}
                              {alloc.allocated_supplies.medical_kits ? `${alloc.allocated_supplies.medical_kits} Meds, ` : ''}
                              {alloc.allocated_supplies.rescue_boats ? `${alloc.allocated_supplies.rescue_boats} Boats` : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Remaining Depot Inventory */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-3">
                  <div className="text-[11px] font-bold text-slate-300 uppercase">
                    Remaining Physical Depot Reserves (Invariant Conservation):
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {allocationPlan.remaining_stocks.map((w) => (
                      <div key={w.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="font-bold text-slate-200 text-xs block truncate">{w.name}</span>
                        <div className="mt-2 space-y-1 text-[10px] text-slate-400">
                          <div>Water: <b className="text-cyan-300">{w.available.water_litres.toLocaleString()}L</b></div>
                          <div>Food: <b className="text-amber-300">{w.available.food_rations.toLocaleString()}pk</b></div>
                          <div>Meds: <b className="text-red-300">{w.available.medical_kits}</b></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: ROUTE OPTIMIZATION (NETWORKX)                                      */}
        {/* ========================================================================= */}
        {activeTab === 'routing' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Route Optimization & Multi-Modal Dispatch</h2>
                <p className="text-xs text-slate-400 font-mono">
                  NetworkX shortest-path solver on 79-node Chennai graph avoiding flooded corridors and impassable underpasses.
                </p>
              </div>

              <button
                onClick={() => handleRunRouting()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                <span>OPTIMIZE ROUTE</span>
              </button>
            </div>

            {routeResult && (
              <div className="p-5 rounded-2xl bg-[#090e1c] border border-cyan-500/30 shadow-2xl space-y-4 font-mono text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="font-bold text-sm text-slate-100">
                    {routeResult.source_name} ➔ {routeResult.destination_name}
                  </div>
                  <span className="px-2.5 py-0.5 rounded font-bold uppercase text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                    MODE: {routeResult.transport_mode.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">TOTAL DISTANCE</span>
                    <span className="text-lg font-bold text-cyan-300 mt-0.5 block">{routeResult.distance_km} km</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">ESTIMATED TRANSIT</span>
                    <span className="text-lg font-bold text-amber-300 mt-0.5 block">{routeResult.travel_time_min} mins</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">VEHICLE CLASS</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5 block truncate">{routeResult.vehicle_type}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">ROAD NETWORK NODES</span>
                    <span className="text-lg font-bold text-purple-300 mt-0.5 block">{routeResult.node_count} waypoints</span>
                  </div>
                </div>

                {/* Bypassed Hazards */}
                {routeResult.bypassed_hazards.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-300 text-xs">
                    <b>Bypassed Flood Inundation Hazards:</b>
                    <ul className="list-disc pl-5 mt-1 space-y-0.5">
                      {routeResult.bypassed_hazards.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Turn-by-Turn Waypoints */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">
                    TURN-BY-TURN DISPATCH WAYPOINTS:
                  </span>
                  {routeResult.waypoints.map((wp, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-300 text-xs">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 flex items-center justify-center text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <span>{wp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NEW INCIDENT MODAL */}
      {showNewIncidentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1222] border border-cyan-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl font-mono text-xs space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Submit New Disaster Incident Report
              </h3>
              <button
                onClick={() => setShowNewIncidentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">INCIDENT TITLE:</label>
                <input
                  type="text"
                  placeholder="e.g. Flash Flood at Velachery AGS Colony"
                  value={newIncidentForm.title}
                  onChange={(e) => setNewIncidentForm({ ...newIncidentForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">LOCATION / LOCALITY:</label>
                  <input
                    type="text"
                    placeholder="e.g. Velachery"
                    value={newIncidentForm.location}
                    onChange={(e) => setNewIncidentForm({ ...newIncidentForm, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">STRANDED POPULATION:</label>
                  <input
                    type="number"
                    value={newIncidentForm.affected_population}
                    onChange={(e) => setNewIncidentForm({ ...newIncidentForm, affected_population: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">WATER DEPTH (METERS):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newIncidentForm.water_depth_m}
                    onChange={(e) => setNewIncidentForm({ ...newIncidentForm, water_depth_m: parseFloat(e.target.value) || 0.0 })}
                    className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">URGENCY TIER:</label>
                  <select
                    value={newIncidentForm.urgency}
                    onChange={(e) => setNewIncidentForm({ ...newIncidentForm, urgency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-slate-200"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">DISTRESS DESCRIPTION:</label>
                <textarea
                  rows={3}
                  placeholder="Describe emergency conditions, resource requirements..."
                  value={newIncidentForm.description}
                  onChange={(e) => setNewIncidentForm({ ...newIncidentForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowNewIncidentModal(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newIncidentForm.location) return;
                  setLoading(true);
                  try {
                    const res = await createIncident(newIncidentForm);
                    if (res) {
                      setIncidents([res, ...incidents]);
                      setSelectedIncident(res);
                      setShowNewIncidentModal(false);
                      triggerToast(`Incident Created: ${res.location}`);
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
              >
                Submit Incident
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
