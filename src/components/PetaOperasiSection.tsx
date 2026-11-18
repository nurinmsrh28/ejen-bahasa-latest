import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Crosshair,
  FileSearch,
  Lock,
  MapPin,
  Radar,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  ZoomIn,
} from 'lucide-react';
import { LOCATIONS } from '../game/data';
import { gameAudio } from '../game/audio';
import type { AppScreen, GameState, LocationId } from '../game/types';

interface PetaOperasiSectionProps {
  state: GameState;
  completedCount: number;
  selectedLocId: LocationId;
  onSelectLocId: (locId: LocationId) => void;
  onNavigatePhase: (screen: AppScreen, locationId?: LocationId) => void;
}

const MAP_MARKER_COORDS: Record<
  LocationId,
  {
    posClass: string;
    gridRef: string;
    sectorTag: string;
    nodeX: number;
    nodeY: number;
    routePath: string;
    zoomOrigin: string;
  }
> = {
  kantin: {
    posClass: 'left-[5%] top-[9%]',
    gridRef: 'A2',
    sectorTag: 'SEKTOR UTARA',
    nodeX: 166,
    nodeY: 106,
    routePath: 'M 380 220 C 320 170, 260 138, 166 106',
    zoomOrigin: '24% 24%',
  },
  kelas: {
    posClass: 'right-[5%] top-[9%]',
    gridRef: 'D2',
    sectorTag: 'SEKTOR BARAT',
    nodeX: 594,
    nodeY: 106,
    routePath: 'M 380 220 C 440 170, 500 138, 594 106',
    zoomOrigin: '76% 24%',
  },
  taman: {
    posClass: 'left-[5%] bottom-[9%]',
    gridRef: 'A4',
    sectorTag: 'SEKTOR SELATAN',
    nodeX: 166,
    nodeY: 334,
    routePath: 'M 380 220 C 320 270, 260 302, 166 334',
    zoomOrigin: '24% 76%',
  },
  perpustakaan: {
    posClass: 'right-[5%] bottom-[9%]',
    gridRef: 'D4',
    sectorTag: 'SEKTOR TIMUR',
    nodeX: 594,
    nodeY: 334,
    routePath: 'M 380 220 C 440 270, 500 302, 594 334',
    zoomOrigin: '76% 76%',
  },
};

const AMBIENT_MOTES = [
  { id: 0, left: '14%', top: '26%', dur: '5.6s', delay: '0s', size: 4 },
  { id: 1, left: '84%', top: '22%', dur: '6.8s', delay: '1.1s', size: 3 },
  { id: 2, left: '48%', top: '18%', dur: '7.2s', delay: '0.5s', size: 4 },
  { id: 3, left: '22%', top: '78%', dur: '6.1s', delay: '1.7s', size: 3 },
  { id: 4, left: '76%', top: '80%', dur: '5.9s', delay: '0.8s', size: 4 },
  { id: 5, left: '54%', top: '86%', dur: '6.5s', delay: '2.1s', size: 3 },
];

const COMPLETION_SPARKLES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const dist = 54 + ((i * 23) % 72);
  return {
    id: i,
    tx: `${Math.round(Math.cos(angle) * dist)}px`,
    ty: `${Math.round(Math.sin(angle) * dist - 14)}px`,
    delay: `${(i % 5) * 0.08}s`,
    dur: `${1.2 + (i % 3) * 0.25}s`,
    size: i % 2 === 0 ? 7 : 5,
  };
});

function BrassCornerRivets() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-3 left-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#f4ebd0] via-[#c9a24b] to-[#8a6a2f] shadow-sm"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#f4ebd0] via-[#c9a24b] to-[#8a6a2f] shadow-sm"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 left-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#f4ebd0] via-[#c9a24b] to-[#8a6a2f] shadow-sm"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 right-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#f4ebd0] via-[#c9a24b] to-[#8a6a2f] shadow-sm"
      />
    </>
  );
}

export function PetaOperasiSection({
  state,
  completedCount,
  selectedLocId,
  onSelectLocId,
  onNavigatePhase,
}: PetaOperasiSectionProps) {
  const [mapZoomed, setMapZoomed] = useState(false);
  const [hoveredLocId, setHoveredLocId] = useState<LocationId | null>(null);
  const [spotlightPos, setSpotlightPos] = useState<Record<string, { x: number; y: number }>>({});
  const [completionCelebrated, setCompletionCelebrated] = useState(false);
  const [showCompletionParticles, setShowCompletionParticles] = useState(false);

  const prevCompletedRef = useRef<number>(completedCount);
  const allLocationsComplete = completedCount >= LOCATIONS.length;

  const inspectedLocation =
    LOCATIONS.find((loc) => loc.id === selectedLocId) || LOCATIONS[0];
  const inspectedInv = state.investigations[inspectedLocation.id];
  const inspectedCluesFound = inspectedInv.discoveredClueIds.length;
  const inspectedPct = Math.round(
    (inspectedCluesFound / Math.max(1, inspectedLocation.clues.length)) * 100
  );
  const activeRouteMeta = MAP_MARKER_COORDS[selectedLocId];

  // Trigger operation completion celebration + sound once when 4/4 locations complete
  useEffect(() => {
    if (allLocationsComplete && !completionCelebrated) {
      setCompletionCelebrated(true);
      setShowCompletionParticles(true);
      if (state.soundEnabled && prevCompletedRef.current < LOCATIONS.length) {
        gameAudio.playSuccess();
      }
      const timer = window.setTimeout(() => setShowCompletionParticles(false), 2600);
      return () => window.clearTimeout(timer);
    }
    prevCompletedRef.current = completedCount;
  }, [allLocationsComplete, completionCelebrated, completedCount, state.soundEnabled]);

  const handleSelectLocation = (locId: LocationId, zoomFocus = true) => {
    if (state.soundEnabled) {
      gameAudio.playClick();
    }
    onSelectLocId(locId);
    if (zoomFocus) {
      setMapZoomed(true);
    }
  };

  const handleOpenInvestigation = (locId: LocationId) => {
    if (state.soundEnabled) {
      gameAudio.playHint();
    }
    onNavigatePhase('phase1', locId);
  };

  const handleReplayCelebration = () => {
    if (state.soundEnabled) {
      gameAudio.playSuccess();
    }
    setShowCompletionParticles(false);
    window.setTimeout(() => setShowCompletionParticles(true), 20);
  };

  const handleCardPointerMove = (locId: LocationId, e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setSpotlightPos((prev) => ({ ...prev, [locId]: { x, y } }));
  };

  return (
    <section
      aria-label="Peta Operasi Sekolah Seri Bestari"
      className="hq-stage-2 hq-wood-table relative rounded-2xl border border-[#8a6a2f]/80 p-5 sm:p-7 space-y-5 overflow-hidden"
    >
      <BrassCornerRivets />

      {/* Header Strip */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#8a6a2f]/40 pb-4">
        <div className="space-y-1">
          <p className="font-mono-tabular text-xs font-bold uppercase tracking-[0.18em] text-[#c9a24b] flex items-center gap-2">
            <Radar className="w-3.5 h-3.5 text-[#E7B94F]" />
            MEJA TAKTIKAL PENYIASATAN · SEKOLAH SERI BESTARI
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#f4ebd0]">
            PETA OPERASI SEKOLAH SERI BESTARI
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {mapZoomed && (
            <button
              type="button"
              onClick={() => {
                if (state.soundEnabled) gameAudio.playClick();
                setMapZoomed(false);
              }}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b2a21] hover:bg-[#15402f] border border-[#c9a24b]/60 text-xs font-bold text-[#f4ebd0] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#c9a24b]" />
              <span>Pandangan Penuh</span>
            </button>
          )}
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#0b2a21]/90 border border-[#8a6a2f]/60 font-mono-tabular text-sm sm:text-base font-bold text-[#c9a24b]">
            <Crosshair className="w-4 h-4 text-[#c9a24b]" />
            {completedCount} / 4 Lokasi Selesai
          </span>
        </div>
      </div>

      {/* Special Operation Completion Celebration Experience (when all 4 locations are completed) */}
      {allLocationsComplete && (
        <div
          role="status"
          aria-live="polite"
          className="relative overflow-hidden rounded-xl border-2 border-[#E7B94F] bg-gradient-to-r from-[#0b2a21] via-[#15402f] to-[#0b2a21] p-4 sm:p-5 shadow-[0_14px_34px_rgba(201,162,75,0.28)]"
        >
          {/* Subtle Sparkle & Particle Burst */}
          {showCompletionParticles && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-14 top-1/2 -translate-y-1/2 z-10"
            >
              {COMPLETION_SPARKLES.map((p) => (
                <span
                  key={p.id}
                  className="hq-sparkle-piece absolute block rounded-full bg-[#E7B94F] shadow-[0_0_8px_rgba(231,185,79,0.9)]"
                  style={
                    {
                      width: `${p.size}px`,
                      height: `${p.size}px`,
                      '--tx': p.tx,
                      '--ty': p.ty,
                      '--delay': p.delay,
                      '--dur': p.dur,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          )}

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="relative shrink-0">
                <span
                  aria-hidden="true"
                  className="peta-compass-ring absolute inset-[-4px] rounded-full bg-[#E7B94F]/25"
                />
                <button
                  type="button"
                  onClick={handleReplayCelebration}
                  title="Mainkan semula kilauan kejayaan"
                  className="relative w-14 h-14 rounded-full hq-brass-plaque border-2 border-[#f4ebd0]/70 flex items-center justify-center text-[#202923] shadow-lg transition-transform hover:scale-105"
                >
                  <Award className="w-7 h-7" />
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E7B94F] text-[#0b2a21] font-mono-tabular text-[11px] font-extrabold tracking-wider uppercase">
                    <Sparkles className="w-3 h-3" />
                    OPERASI SELESAI!
                  </span>
                  <span className="font-mono-tabular text-xs font-bold text-[#c9a24b]">
                    STATUS: 4/4 LOKASI DISAHKAN · {state.xp} XP TERKUMPUL
                  </span>
                </div>
                <p className="font-display text-base sm:text-lg font-bold text-[#f4ebd0] tracking-wide">
                  TAHNIAH, DETEKTIF! ANDA TELAH BERJAYA MENYELESAIKAN SEMUA MISI DI SEKOLAH SERI
                  BESTARI.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigatePhase('phase2')}
              className="hq-brass-plaque min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[#202923] font-bold text-sm border border-[#f4ebd0]/50 shadow-md hover:brightness-105 transition-transform hover:-translate-y-0.5 whitespace-nowrap shrink-0"
            >
              <span>Buka Makmal Analisis Kes</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop & Tablet Command Table: Live Tactical Radar Map + Classified Case File */}
      <div className="hidden md:grid md:grid-cols-12 gap-5 items-stretch">
        {/* Left: Live Tactical Topographic School Map */}
        <div className="md:col-span-8 relative rounded-xl overflow-hidden border-2 border-[#8a6a2f]/80 bg-[#0b2a21] shadow-[inset_0_0_40px_rgba(3,12,9,0.75)] min-h-[470px]">
          {/* Subtle Floating Golden Background Particles */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden z-0">
            {AMBIENT_MOTES.map((m) => (
              <span
                key={m.id}
                className="peta-float-mote absolute rounded-full bg-[#c9a24b]/60"
                style={
                  {
                    left: m.left,
                    top: m.top,
                    width: `${m.size}px`,
                    height: `${m.size}px`,
                    '--mote-dur': m.dur,
                    '--mote-delay': m.delay,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          {/* Faint Coordinate Grid Scan Beam */}
          <div
            aria-hidden="true"
            className="peta-grid-scan pointer-events-none absolute inset-x-0 h-16 z-0 bg-gradient-to-b from-transparent via-[#c9a24b]/10 to-transparent"
          />

          {/* Smooth Zoom & Focus Tactical SVG Map Layer */}
          <div
            className="w-full h-[470px] transition-transform duration-500 ease-out will-change-transform"
            style={{
              transform: mapZoomed ? 'scale(1.09)' : 'scale(1)',
              transformOrigin: activeRouteMeta.zoomOrigin,
            }}
          >
            <svg
              viewBox="0 0 760 440"
              className="w-full h-full block"
              aria-hidden="true"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <pattern
                  id="hqTopoGrid"
                  width="38"
                  height="38"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 38 0 L 0 0 0 38"
                    fill="none"
                    stroke="rgba(168, 183, 166, 0.14)"
                    strokeWidth="1"
                  />
                </pattern>
                <radialGradient id="hqTableLamp" cx="50%" cy="50%" r="55%">
                  <stop offset="0%" stopColor="rgba(201, 162, 75, 0.22)" />
                  <stop offset="65%" stopColor="rgba(21, 64, 47, 0.08)" />
                  <stop offset="100%" stopColor="rgba(11, 42, 33, 0)" />
                </radialGradient>
                <linearGradient id="petaRadarBeam" x1="50%" y1="50%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(231, 185, 79, 0.34)" />
                  <stop offset="100%" stopColor="rgba(231, 185, 79, 0)" />
                </linearGradient>
                <filter id="petaGoldGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect width="760" height="440" fill="#0b2a21" />
              <rect width="760" height="440" fill="url(#hqTopoGrid)" />
              <circle cx="380" cy="220" r="260" fill="url(#hqTableLamp)" />

              {/* Topographic Contour Lines & Tactical Range Rings */}
              <path
                d="M 40 160 Q 220 90, 390 145 T 730 120"
                fill="none"
                stroke="#8a6a2f"
                strokeOpacity="0.25"
                strokeWidth="1.2"
              />
              <path
                d="M 20 285 Q 200 340, 410 275 T 745 315"
                fill="none"
                stroke="#8a6a2f"
                strokeOpacity="0.25"
                strokeWidth="1.2"
              />
              <circle
                cx="380"
                cy="220"
                r="172"
                fill="none"
                stroke="#c9a24b"
                strokeOpacity="0.16"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
              <circle
                cx="380"
                cy="220"
                r="112"
                fill="none"
                stroke="#a8b7a6"
                strokeOpacity="0.15"
                strokeWidth="1"
              />

              {/* Animated Golden Radar Scanning Cone */}
              <g className="peta-radar-sweep">
                <path
                  d="M 380 220 L 380 48 A 172 172 0 0 1 522 124 Z"
                  fill="url(#petaRadarBeam)"
                  opacity="0.48"
                />
                <line
                  x1="380"
                  y1="220"
                  x2="380"
                  y2="48"
                  stroke="#E7B94F"
                  strokeOpacity="0.55"
                  strokeWidth="1.4"
                />
              </g>

              {/* Map Coordinate Grid Labels */}
              <g fill="#a8b7a6" fillOpacity="0.65" fontSize="10" fontFamily="monospace">
                <text x="95" y="20">SEK A</text>
                <text x="285" y="20">SEK B</text>
                <text x="475" y="20">SEK C</text>
                <text x="655" y="20">SEK D</text>
                <text x="10" y="110">01</text>
                <text x="10" y="225">02</text>
                <text x="10" y="340">03</text>
              </g>

              {/* Architectural Sector Footprints */}
              <rect
                x="38"
                y="34"
                width="260"
                height="144"
                rx="10"
                fill="#15402f"
                fillOpacity="0.68"
                stroke={selectedLocId === 'kantin' ? '#E7B94F' : '#8a6a2f'}
                strokeOpacity={selectedLocId === 'kantin' ? 0.9 : 0.5}
                strokeWidth={selectedLocId === 'kantin' ? 1.8 : 1}
              />
              <rect
                x="462"
                y="34"
                width="260"
                height="144"
                rx="10"
                fill="#15402f"
                fillOpacity="0.68"
                stroke={selectedLocId === 'kelas' ? '#E7B94F' : '#8a6a2f'}
                strokeOpacity={selectedLocId === 'kelas' ? 0.9 : 0.5}
                strokeWidth={selectedLocId === 'kelas' ? 1.8 : 1}
              />
              <rect
                x="38"
                y="262"
                width="260"
                height="144"
                rx="10"
                fill="#15402f"
                fillOpacity="0.68"
                stroke={selectedLocId === 'taman' ? '#E7B94F' : '#8a6a2f'}
                strokeOpacity={selectedLocId === 'taman' ? 0.9 : 0.5}
                strokeWidth={selectedLocId === 'taman' ? 1.8 : 1}
              />
              <rect
                x="462"
                y="262"
                width="260"
                height="144"
                rx="10"
                fill="#15402f"
                fillOpacity="0.68"
                stroke={selectedLocId === 'perpustakaan' ? '#E7B94F' : '#8a6a2f'}
                strokeOpacity={selectedLocId === 'perpustakaan' ? 0.9 : 0.5}
                strokeWidth={selectedLocId === 'perpustakaan' ? 1.8 : 1}
              />

              {/* Animated Golden Investigation Routes + Travelling Light Particles */}
              {LOCATIONS.map((loc, idx) => {
                const meta = MAP_MARKER_COORDS[loc.id];
                const isActive = selectedLocId === loc.id || hoveredLocId === loc.id;
                const isDone = state.investigations[loc.id].completed;
                const pathId = `peta-route-${loc.id}`;

                return (
                  <g key={loc.id}>
                    <path
                      id={pathId}
                      d={meta.routePath}
                      fill="none"
                      stroke={isActive ? '#E7B94F' : isDone ? '#66c993' : '#c9a24b'}
                      strokeOpacity={isActive ? 0.95 : 0.45}
                      strokeWidth={isActive ? 3.2 : 2}
                      strokeDasharray="7 5"
                      filter={isActive ? 'url(#petaGoldGlow)' : undefined}
                      className={isActive ? 'peta-route-active' : undefined}
                    />

                    {/* Light particle travelling along the investigation route */}
                    <circle
                      r={isActive ? 4.2 : 2.6}
                      fill={isActive ? '#fff3c4' : '#E7B94F'}
                      opacity={isActive ? 0.95 : 0.65}
                    >
                      <animateMotion
                        dur={isActive ? '2.1s' : `${3.4 + idx * 0.4}s`}
                        repeatCount="indefinite"
                      >
                        <mpath href={`#${pathId}`} />
                      </animateMotion>
                    </circle>

                    {/* Glowing Sector Waypoint Node */}
                    <circle
                      cx={meta.nodeX}
                      cy={meta.nodeY}
                      r={isActive ? 8 : 5}
                      fill={isDone ? '#52c98e' : '#E7B94F'}
                      fillOpacity={isActive ? 0.35 : 0.22}
                    />
                    <circle
                      cx={meta.nodeX}
                      cy={meta.nodeY}
                      r={3.5}
                      fill={isDone ? '#52c98e' : '#f4ebd0'}
                      stroke="#0b2a21"
                      strokeWidth="1.2"
                    />
                  </g>
                );
              })}

              {/* Central Courtyard & Illuminated Rotating Compass */}
              <g>
                <circle
                  cx="380"
                  cy="220"
                  r="58"
                  fill="#15402f"
                  stroke="#c9a24b"
                  strokeOpacity="0.82"
                  strokeWidth="2.2"
                />
                <circle
                  cx="380"
                  cy="220"
                  r="64"
                  fill="none"
                  stroke="#E7B94F"
                  strokeOpacity="0.35"
                  strokeWidth="1.4"
                  strokeDasharray="3 5"
                  className="peta-compass-ring"
                />
                <path
                  d="M 380 179 L 389 211 L 421 220 L 389 229 L 380 261 L 371 229 L 339 220 L 371 211 Z"
                  fill="#c9a24b"
                  fillOpacity="0.92"
                  filter="url(#petaGoldGlow)"
                />
                <circle
                  cx="380"
                  cy="220"
                  r="7.5"
                  fill="#0b2a21"
                  stroke="#f4ebd0"
                  strokeWidth="1.8"
                />
                <text
                  x="380"
                  y="296"
                  textAnchor="middle"
                  fill="#f4ebd0"
                  fontSize="10.5"
                  fontWeight="700"
                  letterSpacing="2"
                >
                  DATARAN JAM BESTARI
                </text>
              </g>
            </svg>
          </div>

          {/* 4 Interactive Location Cards (Hover spotlight, Click focus + route animation, Direct Siasat CTA) */}
          {LOCATIONS.map((loc) => {
            const inv = state.investigations[loc.id];
            const cluesFound = inv.discoveredClueIds.length;
            const meta = MAP_MARKER_COORDS[loc.id];
            const isSelected = selectedLocId === loc.id;
            const spot = spotlightPos[loc.id] || { x: 50, y: 50 };

            return (
              <div
                key={loc.id}
                onMouseEnter={() => {
                  setHoveredLocId(loc.id);
                  onSelectLocId(loc.id);
                }}
                onMouseLeave={() => setHoveredLocId(null)}
                onPointerMove={(e) => handleCardPointerMove(loc.id, e)}
                style={
                  {
                    '--spot-x': `${spot.x}%`,
                    '--spot-y': `${spot.y}%`,
                  } as React.CSSProperties
                }
                className={`group absolute ${meta.posClass} w-[38.5%] rounded-xl border transition-all duration-200 overflow-hidden ${
                  isSelected
                    ? 'bg-[#15402f]/96 border-[#E7B94F] -translate-y-1 shadow-[0_16px_32px_rgba(0,0,0,0.6),0_0_18px_rgba(231,185,79,0.28)]'
                    : inv.completed
                    ? 'bg-[#15402f]/94 border-[#c9a24b]/80 hover:-translate-y-1 hover:border-[#E7B94F] shadow-md'
                    : 'bg-[#0b2a21]/92 border-[#8a6a2f]/65 hover:-translate-y-1 hover:border-[#E7B94F] hover:shadow-[0_12px_26px_rgba(231,185,79,0.22)]'
                }`}
              >
                {/* Interactive Mouse Spotlight Effect */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{
                    background:
                      'radial-gradient(circle 120px at var(--spot-x, 50%) var(--spot-y, 50%), rgba(231,185,79,0.18), transparent 70%)',
                  }}
                />

                {/* Subtle Metallic Shine on Verified Completed Cards */}
                {inv.completed && (
                  <span
                    aria-hidden="true"
                    className="hq-medal-glint pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#f4ebd0]/18 to-transparent"
                  />
                )}

                <div className="relative z-10 p-3.5 space-y-2">
                  {/* Clickable Card Body selects & zooms focus on map */}
                  <button
                    type="button"
                    onClick={() => handleSelectLocation(loc.id, true)}
                    aria-pressed={isSelected}
                    aria-label={`${loc.name} (${meta.gridRef}), ${cluesFound} daripada ${loc.clues.length} petunjuk ditemui`}
                    className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4ebd0] rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="inline-flex items-center gap-1.5 font-mono-tabular text-[11px] font-bold tracking-wider text-[#a8b7a6] group-hover:text-[#E7B94F] transition-colors">
                        <span
                          aria-hidden="true"
                          className={`inline-block w-2 h-2 rounded-full transition-transform duration-200 group-hover:scale-125 ${
                            inv.completed
                              ? 'bg-[#52c98e]'
                              : isSelected
                              ? 'bg-[#E7B94F]'
                              : 'bg-[#8a6a2f]'
                          }`}
                        />
                        {meta.gridRef} · {meta.sectorTag}
                      </span>

                      {inv.completed ? (
                        <span className="hq-brass-plaque inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono-tabular text-[10px] font-extrabold tracking-wider text-[#202923] shrink-0 shadow-sm">
                          <CheckCircle2 className="w-3 h-3" />
                          VERIFIED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#c9a24b] shrink-0">
                          <ZoomIn className="w-3 h-3" />
                          Fokus
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-lg font-bold text-[#f4ebd0] leading-snug">
                      {loc.name}
                    </h3>
                    <p className="text-xs text-[#a8b7a6] mt-0.5 truncate">{loc.zoneLabel}</p>
                  </button>

                  {/* Bottom Progress & Direct Investigation Trigger */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#8a6a2f]/30">
                    <span className="font-mono-tabular text-xs font-bold text-[#c9a24b]">
                      Petunjuk: {cluesFound}/{loc.clues.length}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenInvestigation(loc.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0b2a21] hover:bg-[#E7B94F] text-[#E7B94F] hover:text-[#0b2a21] border border-[#c9a24b]/60 text-[11px] font-bold transition-colors shrink-0"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>{inv.completed ? 'Semak' : 'Siasat'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bottom Tactical Map Status Bar */}
          <div className="pointer-events-none absolute bottom-2 inset-x-3 flex items-center justify-between text-[10px] font-mono-tabular text-[#a8b7a6]/85">
            <span>SISTEM RADAR TAKTIKAL · ZON {activeRouteMeta.gridRef}</span>
            <span>KLIK KAD UNTUK FOKUS LALUAN · TEKAN SIASAT UNTUK MULA</span>
          </div>
        </div>

        {/* Right: Classified Investigation Case File (Parchment Dossier) */}
        <div className="md:col-span-4 hq-ivory-paper relative rounded-xl border-2 border-[#8a6a2f]/80 p-5 text-[#202923] flex flex-col justify-between gap-4 shadow-[0_18px_38px_rgba(3,12,9,0.5)]">
          <div className="space-y-3.5">
            {/* Classified Header & Golden Verification Stamp */}
            <div className="flex items-center justify-between gap-2 border-b-2 border-[#8a6a2f]/40 pb-2.5">
              <div className="flex items-center gap-1.5">
                <FileSearch className="w-4 h-4 text-[#8a6a2f]" />
                <span className="font-mono-tabular text-[11px] font-extrabold uppercase tracking-wider text-[#8a6a2f]">
                  FAIL SIASATAN SULIT · {activeRouteMeta.gridRef}
                </span>
              </div>

              {inspectedInv.completed ? (
                <span className="hq-brass-plaque inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-[#8a6a2f] text-[#202923] font-mono-tabular text-[10px] font-extrabold tracking-wider shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  VERIFIED
                </span>
              ) : (
                <span className="font-mono-tabular text-[10px] font-bold uppercase tracking-widest text-[#8c331d] border border-[#8c331d]/60 bg-[#f8ece6] px-2 py-0.5 rounded-sm">
                  CLASSIFIED
                </span>
              )}
            </div>

            {/* Quick Location File Tabs */}
            <div
              className="grid grid-cols-2 gap-1.5"
              role="tablist"
              aria-label="Pilih fail lokasi untuk diteliti"
            >
              {LOCATIONS.map((loc) => {
                const isTabSelected = selectedLocId === loc.id;
                const isTabDone = state.investigations[loc.id].completed;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    role="tab"
                    aria-selected={isTabSelected}
                    onClick={() => handleSelectLocation(loc.id, true)}
                    className={`px-2.5 min-h-[38px] rounded-lg text-xs font-bold text-left truncate transition-all flex items-center justify-between gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15402f] ${
                      isTabSelected
                        ? 'bg-[#0b2a21] text-[#f4ebd0] border border-[#c9a24b] shadow-sm'
                        : 'bg-[#e6dac0] hover:bg-[#ddd0b2] text-[#202923] border border-transparent'
                    }`}
                  >
                    <span className="truncate">{loc.shortName}</span>
                    {isTabDone && (
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isTabSelected ? 'text-[#52c98e]' : 'text-[#15402f]'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Animated Case Content Transition */}
            <div key={inspectedLocation.id} className="peta-dossier-switch space-y-3 pt-1">
              <div className="space-y-1">
                <p className="font-mono-tabular text-xs font-bold text-[#8a6a2f] uppercase tracking-wide">
                  {inspectedLocation.zoneLabel}
                </p>
                <h3 className="font-display text-2xl font-bold text-[#0b2a21] leading-snug">
                  {inspectedLocation.name}
                </h3>
                <p className="text-sm sm:text-base text-[#202923] leading-relaxed">
                  {inspectedLocation.briefing}
                </p>
              </div>

              {/* Animated Evidence Collection Indicator */}
              <div className="rounded-xl bg-[#e7dcc1] border border-[#8a6a2f]/45 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-bold text-[#0b2a21] uppercase tracking-wide font-mono-tabular">
                    Rekod Bukti Kes
                  </span>
                  <span className="font-mono-tabular font-extrabold text-[#0b2a21]">
                    {inspectedCluesFound} / {inspectedLocation.clues.length} Bukti ({inspectedPct}%)
                  </span>
                </div>

                {/* Animated Progress Bar */}
                <div className="h-2.5 rounded-full bg-[#d3c39e] border border-[#8a6a2f]/35 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#15402f] via-[#2d6a4f] to-[#c9a24b] transition-all duration-500 ease-out"
                    style={{ width: `${inspectedPct}%` }}
                  />
                </div>

                {/* 3 Evidence Seal Slots */}
                <ul className="space-y-1.5 pt-0.5">
                  {inspectedLocation.clues.map((clue, idx) => {
                    const found = inspectedInv.discoveredClueIds.includes(clue.id);
                    return (
                      <li
                        key={clue.id}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs border ${
                          found
                            ? 'bg-[#15402f]/12 border-[#15402f]/35 text-[#0b2a21] font-semibold'
                            : 'bg-[#f4ebd0]/60 border-[#8a6a2f]/25 text-[#5b4d38]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          {found ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#15402f] shrink-0" />
                          ) : (
                            <Lock className="w-3 h-3 text-[#8a6a2f] shrink-0" />
                          )}
                          <span className="truncate">
                            {found ? clue.label : `Bukti Sulit #${idx + 1}`}
                          </span>
                        </span>
                        <span className="font-mono-tabular text-[10px] font-bold uppercase shrink-0">
                          {found ? 'Sah' : 'Belum'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenInvestigation(inspectedLocation.id)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 min-h-[48px] rounded-xl bg-[#0b2a21] hover:bg-[#15402f] text-[#f4ebd0] border-2 border-[#c9a24b] font-bold text-base shadow-md transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a6a2f]"
          >
            <span>
              {inspectedInv.completed ? 'Semak Lokasi Ini' : 'Buka Siasatan Lokasi'}
            </span>
            <ArrowRight className="w-4 h-4 text-[#c9a24b]" />
          </button>
        </div>
      </div>

      {/* Mobile Vertical Tactical List (< md) */}
      <div className="md:hidden grid grid-cols-1 gap-3.5">
        {LOCATIONS.map((loc) => {
          const inv = state.investigations[loc.id];
          const cluesFound = inv.discoveredClueIds.length;
          const meta = MAP_MARKER_COORDS[loc.id];
          const pct = Math.round((cluesFound / Math.max(1, loc.clues.length)) * 100);

          return (
            <button
              key={loc.id}
              type="button"
              onClick={() => {
                handleSelectLocation(loc.id, false);
                handleOpenInvestigation(loc.id);
              }}
              className={`w-full text-left rounded-xl p-4 min-h-[44px] border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b] ${
                inv.completed
                  ? 'bg-[#15402f] border-[#E7B94F] shadow-md'
                  : 'bg-[#0b2a21]/95 border-[#8a6a2f]/75 hover:border-[#E7B94F]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-mono-tabular text-[#c9a24b] font-bold">
                  {meta.gridRef} · {loc.zoneLabel}
                </span>
                {inv.completed ? (
                  <span className="hq-brass-plaque inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono-tabular text-[11px] font-extrabold tracking-wider text-[#202923] shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    VERIFIED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#c9a24b] shrink-0">
                    <MapPin className="w-4 h-4" />
                    Siasat
                  </span>
                )}
              </div>
              <h3 className="font-display text-xl font-bold text-[#f4ebd0]">{loc.name}</h3>
              <p className="text-base text-[#a8b7a6] mt-1 leading-relaxed">{loc.briefing}</p>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between font-mono-tabular text-xs font-bold text-[#c9a24b]">
                  <span>Petunjuk ditemui</span>
                  <span>
                    {cluesFound}/{loc.clues.length} ({pct}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#202923] overflow-hidden">
                  <div
                    className="h-full bg-[#c9a24b] transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
