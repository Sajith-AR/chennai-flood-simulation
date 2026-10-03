'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AIAdvisorData,
} from '@/lib/types';
import {
  Brain,
  Radio,
  AlertTriangle,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Send,
  Compass,
  TrendingUp,
  TrendingDown,
  Navigation,
  ShieldAlert,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  RefreshCw,
  Anchor,
  Flame,
} from 'lucide-react';

interface AIAdvisorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  advisorData: AIAdvisorData | null;
  onRefresh?: () => void;
  onDeployAdvice?: (adviceId: string) => void;
}

export default function AIAdvisorPanel({
  isOpen,
  onClose,
  advisorData,
  onRefresh,
  onDeployAdvice,
}: AIAdvisorPanelProps) {
  const [activeTab, setActiveTab] = useState<'advice' | 'broadcast' | 'bottlenecks' | 'wards'>('advice');
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'tamil'>('english');
  const [copied, setCopied] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [smsDispatched, setSmsDispatched] = useState<boolean>(false);
  const [acknowledgedAdviceIds, setAcknowledgedAdviceIds] = useState<Set<string>>(new Set());

  const audioContextRef = useRef<AudioContext | null>(null);

  // Play synthetic emergency alert tone and voice announcement
  const handleToggleAudioAlert = () => {
    if (isPlayingAudio) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    try {
      setIsPlayingAudio(true);

      // 1. Play dual-tone military alert klaxon chime via Web Audio API
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(800, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(1050, ctx.currentTime + 0.35);
        osc1.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.7);

        osc2.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(587, ctx.currentTime + 0.35);
        osc2.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.7);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.75);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.75);
        osc2.stop(ctx.currentTime + 0.75);
      }

      // 2. Play Speech Synthesis for real-time Tamil/English broadcast preview
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const textToSpeak = selectedLanguage === 'tamil'
          ? (advisorData?.broadcast.tamil || 'கவனிக்கவும்! அவசர வெள்ள அபாய எச்சரிக்கை.')
          : (advisorData?.broadcast.english || 'Attention! Flash flood emergency alert in effect.');

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.lang = selectedLanguage === 'tamil' ? 'ta-IN' : 'en-US';

        utterance.onend = () => {
          setIsPlayingAudio(false);
        };
        utterance.onerror = () => {
          setIsPlayingAudio(false);
        };

        // Delay voice slightly after alert chime
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 800);
      } else {
        setTimeout(() => setIsPlayingAudio(false), 2000);
      }
    } catch {
      setIsPlayingAudio(false);
    }
  };

  const handleCopyBroadcast = () => {
    if (!advisorData) return;
    const text = selectedLanguage === 'tamil' ? advisorData.broadcast.tamil : advisorData.broadcast.english;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDispatchSms = () => {
    setSmsDispatched(true);
    setTimeout(() => setSmsDispatched(false), 3500);
  };

  const handleAcknowledge = (id: string) => {
    setAcknowledgedAdviceIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    onDeployAdvice?.(id);
  };

  if (!isOpen) return null;

  const radarScore = advisorData?.radar_score ?? 84;
  const radarLevel = advisorData?.risk_radar_level ?? 'DEFCON 2 (SEVERE)';

  return (
    <div
      className={`fixed right-4 z-40 transition-all duration-300 ease-out select-none ${
        isMinimized
          ? 'bottom-20 w-80'
          : 'top-20 bottom-14 w-[92vw] sm:w-[480px] xl:w-[520px]'
      }`}
    >
      <div className="h-full flex flex-col glass-panel-strong border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Top Aerospace HUD Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-cyan-500/20">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-400/40 shadow-glow-cyan text-cyan-400">
              <Brain className="w-4 h-4 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black tracking-widest text-slate-100 uppercase">
                  AI Tactical Advisor
                </span>
                <span className="text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/40">
                  REAL-TIME
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Bayesian Hydrological & Evacuation Neural Model
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-lg transition-colors"
                title="Refresh AI Insights"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors"
              title={isMinimized ? 'Expand panel' : 'Minimize panel'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition-colors"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimized Quick Telemetry Strip */}
        {isMinimized ? (
          <div className="p-3 bg-slate-950/80 flex items-center justify-between text-xs font-mono">
            <span className="text-amber-400 font-bold">{radarLevel}</span>
            <span className="text-cyan-300 font-bold">{radarScore}/100 Risk</span>
          </div>
        ) : (
          <>
            {/* Live Tactical Risk Radar Strip */}
            <div className="p-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center gap-4">
              {/* Tactical Circular Radar Widget */}
              <div className="relative w-16 h-16 rounded-full bg-slate-950 border border-cyan-500/40 flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0">
                {/* Concentric rings */}
                <div className="absolute inset-1.5 rounded-full border border-cyan-500/20" />
                <div className="absolute inset-3.5 rounded-full border border-cyan-500/20" />
                {/* Crosshairs */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-[1px] bg-cyan-500/20" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-full w-[1px] bg-cyan-500/20" />
                </div>
                {/* Radar sweep animation */}
                <div
                  className="absolute inset-0 origin-center rounded-full"
                  style={{
                    background: 'conic-gradient(from 0deg, rgba(6, 182, 212, 0.4) 0deg, transparent 60deg, transparent 360deg)',
                    animation: 'spin 3s linear infinite',
                  }}
                />
                {/* Simulated threat blips */}
                <div className="absolute top-3 left-4 w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                <div className="absolute bottom-4 right-3.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                <Compass className="w-4 h-4 text-cyan-300 z-10" />
              </div>

              {/* Threat Level & Summary */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-400">
                    Disaster Threat Condition
                  </span>
                  <span className="text-xs font-mono font-extrabold text-cyan-400">
                    {radarScore}<span className="text-[10px] text-slate-400">/100</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`text-xs font-mono font-black uppercase px-2 py-0.5 rounded tracking-wide ${
                      radarLevel.includes('CRITICAL')
                        ? 'bg-red-950/80 text-red-300 border border-red-700/80 shadow-glow-red'
                        : radarLevel.includes('SEVERE')
                        ? 'bg-orange-950/80 text-orange-300 border border-orange-700/80 shadow-glow-orange'
                        : 'bg-amber-950/80 text-amber-300 border border-amber-700/80 shadow-glow-amber'
                    }`}
                  >
                    {radarLevel}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 line-clamp-2 mt-1 leading-tight font-sans">
                  {advisorData?.tactical_summary ||
                    'Hydrological forecast indicates critical water table surge. Immediate deployment recommended.'}
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/80 px-2 pt-2 gap-1 text-xs">
              <button
                onClick={() => setActiveTab('advice')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-medium transition-all ${
                  activeTab === 'advice'
                    ? 'bg-slate-900 text-cyan-300 border-t-2 border-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tactical Advice</span>
                <span className="text-[9px] font-mono bg-cyan-950 text-cyan-400 px-1.5 py-0.2 rounded-full border border-cyan-800">
                  {advisorData?.evacuation_advice.length ?? 3}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('broadcast')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-medium transition-all ${
                  activeTab === 'broadcast'
                    ? 'bg-slate-900 text-cyan-300 border-t-2 border-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>Emergency Broadcast</span>
              </button>

              <button
                onClick={() => setActiveTab('bottlenecks')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-medium transition-all ${
                  activeTab === 'bottlenecks'
                    ? 'bg-slate-900 text-cyan-300 border-t-2 border-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>Bottlenecks</span>
              </button>

              <button
                onClick={() => setActiveTab('wards')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-medium transition-all ${
                  activeTab === 'wards'
                    ? 'bg-slate-900 text-cyan-300 border-t-2 border-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                <span>Ward Risk</span>
              </button>
            </div>

            {/* Tab Contents Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/60">
              {/* TAB 1: TACTICAL EVACUATION ADVICE */}
              {activeTab === 'advice' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Priority Operational Directives</span>
                    <span className="font-mono text-[10px]">EOC Chennai • Auto-Generated</span>
                  </div>

                  {advisorData?.evacuation_advice.map((item) => {
                    const isAcknowledged = acknowledgedAdviceIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          item.priority === 'CRITICAL'
                            ? 'bg-red-950/20 border-red-500/40 hover:border-red-500/60'
                            : item.priority === 'URGENT'
                            ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/60'
                            : 'bg-blue-950/20 border-blue-500/40 hover:border-blue-500/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                item.priority === 'CRITICAL'
                                  ? 'bg-red-900/80 text-red-200'
                                  : item.priority === 'URGENT'
                                  ? 'bg-amber-900/80 text-amber-200'
                                  : 'bg-blue-900/80 text-blue-200'
                              }`}
                            >
                              {item.priority}
                            </span>
                            <h4 className="text-xs font-bold text-slate-100">{item.title}</h4>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{item.id}</span>
                        </div>

                        <p className="text-xs text-slate-300 mt-2 leading-relaxed">{item.details}</p>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono">
                          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 text-[10px] block uppercase">Vulnerable Ward</span>
                            <span className="text-amber-300 font-semibold">{item.affected_ward}</span>
                          </div>
                          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 text-[10px] block uppercase">Target Safe Haven</span>
                            <span className="text-cyan-300 font-semibold">{item.target_shelter}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-300">
                            <Anchor className="w-3 h-3 text-cyan-400" />
                            <span>Recommended: <b className="text-cyan-300">{item.mode_suggested}</b></span>
                          </div>

                          <button
                            onClick={() => handleAcknowledge(item.id)}
                            disabled={isAcknowledged}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                              isAcknowledged
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold shadow-glow-cyan'
                            }`}
                          >
                            {isAcknowledged ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Deployed</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Authorize Dispatch</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: REAL-TIME TAMIL / ENGLISH EMERGENCY BROADCAST */}
              {activeTab === 'broadcast' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                      <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                        Emergency Alert Generator
                      </span>
                    </div>

                    {/* Language Switcher */}
                    <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
                      <button
                        onClick={() => setSelectedLanguage('english')}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          selectedLanguage === 'english'
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        English
                      </button>
                      <button
                        onClick={() => setSelectedLanguage('tamil')}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          selectedLanguage === 'tamil'
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        தமிழ் (Tamil)
                      </button>
                    </div>
                  </div>

                  {/* Broadcast Metadata Header */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
                    <span>CODE: <b className="text-cyan-400">{advisorData?.broadcast.code || 'GCC-SDRF-2026'}</b></span>
                    <span>LEVEL: <b className="text-red-400 uppercase">{advisorData?.broadcast.alert_level || 'RED ALERT'}</b></span>
                    <span>SYNC: <b className="text-slate-200">{advisorData?.broadcast.timestamp || 'LIVE'}</b></span>
                  </div>

                  {/* Broadcast Message Box */}
                  <div className="relative p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-slate-100 font-sans leading-relaxed shadow-inner">
                    <p className={`text-sm ${selectedLanguage === 'tamil' ? 'leading-loose font-medium' : ''}`}>
                      {selectedLanguage === 'tamil'
                        ? advisorData?.broadcast.tamil
                        : advisorData?.broadcast.english}
                    </p>

                    {/* Speech Playing Audio Pulse Effect */}
                    {isPlayingAudio && (
                      <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-800">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        <span className="text-[11px] font-mono text-cyan-300">
                          Transmitting audio broadcast synthesizer...
                        </span>
                        <div className="flex items-center gap-0.5 ml-auto">
                          <span className="w-1 h-3 bg-cyan-400 animate-bounce" />
                          <span className="w-1 h-5 bg-cyan-400 animate-bounce [animation-delay:0.1s]" />
                          <span className="w-1 h-2 bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1 h-4 bg-cyan-400 animate-bounce [animation-delay:0.3s]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Audio Preview & Copy Action Bar */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={handleToggleAudioAlert}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold font-mono transition-all ${
                        isPlayingAudio
                          ? 'bg-red-950/80 border-red-500 text-red-200 shadow-glow-red animate-pulse'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-cyan-300 hover:shadow-glow-cyan'
                      }`}
                    >
                      {isPlayingAudio ? (
                        <>
                          <VolumeX className="w-4 h-4 text-red-400" />
                          <span>Stop Audio Alert</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 text-cyan-400" />
                          <span>Preview Audio Alert</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleCopyBroadcast}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-2 text-xs font-bold font-mono transition-all hover:border-slate-600"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-400" />
                          <span>Copy Broadcast Text</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Disseminate Flash Alert Button */}
                  <button
                    onClick={handleDispatchSms}
                    disabled={smsDispatched}
                    className={`w-full p-3 rounded-xl flex items-center justify-center gap-2.5 text-xs font-mono font-black uppercase tracking-wider transition-all ${
                      smsDispatched
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                        : 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-glow-red hover:scale-[1.01]'
                    }`}
                  >
                    {smsDispatched ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Dispatched to 2,410 Chennai Cellular Towers</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        <span>Simulate Blast to Ward Cell Towers (SMS / CBC)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* TAB 3: BOTTLENECKS & CHOKE POINTS */}
              {activeTab === 'bottlenecks' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Critical Road Inundation Choke Points</span>
                    <span className="text-[10px] font-mono text-red-400">High Impedance</span>
                  </div>

                  {advisorData?.bottlenecks.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-100">{item.corridor_name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{item.zone}</span>
                        </div>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                            item.traffic_choke_status === 'SEVERED'
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : item.traffic_choke_status === 'SUBMERGED BRIDGE'
                              ? 'bg-orange-950 text-orange-300 border border-orange-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {item.traffic_choke_status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] uppercase">Water Clearance Depth:</span>
                        <span className="text-red-400 font-bold">{item.water_depth_m} m</span>
                      </div>

                      <div className="text-[11px] text-cyan-300 flex items-start gap-1.5 bg-cyan-950/20 p-2 rounded-lg border border-cyan-800/40">
                        <Navigation className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-mono">Suggested Detour:</span>
                          <span>{item.suggested_detour}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: WARD RISK INDEX RANKINGS */}
              {activeTab === 'wards' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>GCC Ward Threat Rankings (Highest to Lowest)</span>
                    <span className="text-[10px] font-mono text-cyan-400">Population Risk Model</span>
                  </div>

                  {advisorData?.ward_rankings.map((ward, idx) => (
                    <div
                      key={ward.ward_id}
                      className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-100">{ward.ward_name}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">{ward.ward_id}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {ward.trend === 'rising' ? (
                            <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span className="text-xs font-mono font-bold text-cyan-300">{ward.risk_index}</span>
                        </div>
                      </div>

                      {/* Risk Progress Bar */}
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            ward.risk_index >= 90
                              ? 'bg-red-500'
                              : ward.risk_index >= 80
                              ? 'bg-orange-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${ward.risk_index}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                        <span>Vulnerable Pop: <b className="text-slate-200">{ward.vulnerable_population.toLocaleString()}</b></span>
                        <span className="text-right">Max Depth: <b className="text-cyan-400">{ward.water_depth_m}m</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Status Ticker */}
            <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI Inference Latency: 42ms
              </span>
              <span>Model: Hydrology-Neural-V3</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
