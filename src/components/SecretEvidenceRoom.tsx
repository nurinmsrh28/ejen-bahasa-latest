import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Compass,
  FileText,
  Library,
  Lock,
  Pin,
  Search,
  ShieldCheck,
  Sparkles,
  Trees,
  Utensils,
  X,
  ZoomIn,
} from 'lucide-react';
import { LOCATIONS } from '../game/data';
import { gameAudio } from '../game/audio';
import type { GameState, LocationId } from '../game/types';

interface SecretEvidenceRoomProps {
  state: GameState;
  selectedIds: LocationId[];
  error: string;
  onToggleEvidence: (locId: LocationId) => void;
  onClearError: () => void;
}

interface CaseBoardStyle {
  caseNo: string;
  tabLabel: string;
  tiltClass: string;
  pinColor: string;
  accentBorder: string;
  accentBg: string;
  threadPath: string;
  pinX: number;
  pinY: number;
  icon: React.ComponentType<{ className?: string }>;
}

const CASE_BOARD_STYLES: Record<LocationId, CaseBoardStyle> = {
  kantin: {
    caseNo: 'KES #01',
    tabLabel: 'SEKTOR UTARA · A2',
    tiltClass: 'md:-rotate-[0.75deg]',
    pinColor: 'from-[#f4d17a] to-[#b58124]',
    accentBorder: 'border-[#c9a24b]',
    accentBg: 'bg-[#f6eedb]',
    threadPath: 'M 400 215 Q 290 150, 195 105',
    pinX: 195,
    pinY: 105,
    icon: Utensils,
  },
  kelas: {
    caseNo: 'KES #02',
    tabLabel: 'SEKTOR BARAT · D2',
    tiltClass: 'md:rotate-[0.65deg]',
    pinColor: 'from-[#8fd4b2] to-[#2c7a56]',
    accentBorder: 'border-[#74a98c]',
    accentBg: 'bg-[#f4efe1]',
    threadPath: 'M 400 215 Q 510 150, 605 105',
    pinX: 605,
    pinY: 105,
    icon: BookOpenCheck,
  },
  perpustakaan: {
    caseNo: 'KES #03',
    tabLabel: 'SEKTOR TIMUR · D4',
    tiltClass: 'md:-rotate-[0.55deg]',
    pinColor: 'from-[#a6c8e8] to-[#3c6f9c]',
    accentBorder: 'border-[#7c9eb8]',
    accentBg: 'bg-[#f7f0df]',
    threadPath: 'M 400 215 Q 290 280, 195 325',
    pinX: 195,
    pinY: 325,
    icon: Library,
  },
  taman: {
    caseNo: 'KES #04',
    tabLabel: 'SEKTOR SELATAN · A4',
    tiltClass: 'md:rotate-[0.75deg]',
    pinColor: 'from-[#df8f74] to-[#a94c31]',
    accentBorder: 'border-[#c8886d]',
    accentBg: 'bg-[#f3ecda]',
    threadPath: 'M 400 215 Q 510 280, 605 325',
    pinX: 605,
    pinY: 325,
    icon: Trees,
  },
};

const DUST_MOTES = [
  { id: 0, left: '11%', top: '18%', size: 4, dur: '6.2s', delay: '0s' },
  { id: 1, left: '88%', top: '24%', size: 3, dur: '7.1s', delay: '0.8s' },
  { id: 2, left: '34%', top: '44%', size: 3, dur: '5.8s', delay: '1.4s' },
  { id: 3, left: '68%', top: '52%', size: 4, dur: '6.9s', delay: '0.4s' },
  { id: 4, left: '19%', top: '82%', size: 3, dur: '6.4s', delay: '1.9s' },
  { id: 5, left: '82%', top: '80%', size: 4, dur: '5.5s', delay: '1.1s' },
];

const SELECT_SPARKLES = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  const dist = 34 + ((i * 19) % 36);
  return {
    id: i,
    tx: `${Math.round(Math.cos(angle) * dist)}px`,
    ty: `${Math.round(Math.sin(angle) * dist - 10)}px`,
    delay: `${(i % 4) * 0.04}s`,
    dur: `${0.85 + (i % 3) * 0.16}s`,
  };
});

export function SecretEvidenceRoom({
  state,
  selectedIds,
  error,
  onToggleEvidence,
  onClearError,
}: SecretEvidenceRoomProps) {
  const [inspectedLocId, setInspectedLocId] = useState<LocationId>(
    () => selectedIds[0] || LOCATIONS[0].id
  );
  const [magnifierOpenLocId, setMagnifierOpenLocId] = useState<LocationId | null>(null);
  const [recentSparkleLocId, setRecentSparkleLocId] = useState<LocationId | null>(null);
  const [lensPos, setLensPos] = useState({ x: 50, y: 40 });

  const selectedCount = selectedIds.length;
  const isCollectionComplete = selectedCount >= 2;
  const inspectedLoc = LOCATIONS.find((l) => l.id === inspectedLocId) || LOCATIONS[0];
  const inspectedInv = state.investigations[inspectedLoc.id];
  const inspectedStyle = CASE_BOARD_STYLES[inspectedLoc.id];
  const InspectedIcon = inspectedStyle.icon;

  // Close Magnifying Glass Dossier on Escape
  useEffect(() => {
    if (!magnifierOpenLocId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMagnifierOpenLocId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [magnifierOpenLocId]);

  const handleSelectCase = (locId: LocationId) => {
    if (state.soundEnabled) gameAudio.playClick();
    onClearError();
    setInspectedLocId(locId);
  };

  const handleOpenMagnifier = (locId: LocationId) => {
    if (state.soundEnabled) gameAudio.playHint();
    onClearError();
    setInspectedLocId(locId);
    setMagnifierOpenLocId(locId);
  };

  const handleTogglePinEvidence = (locId: LocationId) => {
    const alreadySelected = selectedIds.includes(locId);
    if (!alreadySelected && selectedIds.length >= 3) {
      if (state.soundEnabled) gameAudio.playError();
      onToggleEvidence(locId);
      return;
    }

    if (state.soundEnabled) {
      if (alreadySelected) {
        gameAudio.playClick();
      } else {
        gameAudio.playClueFound();
      }
    }

    setInspectedLocId(locId);
    onToggleEvidence(locId);

    if (!alreadySelected) {
      setRecentSparkleLocId(locId);
      window.setTimeout(() => {
        setRecentSparkleLocId((cur) => (cur === locId ? null : cur));
      }, 1100);
    }
  };

  const magnifierLoc = magnifierOpenLocId
    ? LOCATIONS.find((l) => l.id === magnifierOpenLocId) || null
    : null;

  return (
    <section
      aria-labelledby="secret-evidence-room-heading"
      className="hq-wood-table relative rounded-2xl border-2 border-[#8a6a2f]/85 p-4 sm:p-6 lg:p-7 space-y-6 overflow-hidden shadow-[0_26px_60px_rgba(2,10,8,0.68)]"
    >
      {/* Brass Corner Rivets */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-3 left-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#f4ebd0] via-[#c9a24b] to-[#8a6a2f]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#f4ebd0] via-[#c9a24b] to-[#8a6a2f]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 left-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#f4ebd0] via-[#c9a24b] to-[#8a6a2f]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 right-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#f4ebd0] via-[#c9a24b] to-[#8a6a2f]"
      />

      {/* 1. ROOM HEADER + ANIMATED INVESTIGATION STATUS */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#8a6a2f]/45 pb-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b2a21] border border-[#c9a24b]/65 font-mono-tabular text-[11px] font-bold uppercase tracking-[0.16em] text-[#E7B94F]">
              <Compass className="w-3.5 h-3.5 misi-compass-spin" />
              <span>
                {selectedCount === 0
                  ? 'STATUS: MENUNGGU ANALISIS'
                  : selectedCount === 1
                  ? 'STATUS: PENGUMPULAN BUKTI (1/3)'
                  : 'STATUS: BUKTI UTAMA SEDIA'}
              </span>
            </span>
            <span className="font-mono-tabular text-xs font-semibold text-[#c9a24b]/90">
              MEJA &amp; PAPAN BUKTI PENYIASATAN DETEKTIF MUDA
            </span>
          </div>

          <h2
            id="secret-evidence-room-heading"
            className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#f4ebd0] tracking-tight hq-title-glow"
          >
            THE SECRET EVIDENCE ROOM
          </h2>
          <p className="text-sm sm:text-base text-[#d5e0d7] max-w-2xl">
            Setiap petunjuk menyimpan rahsia. Teliti, analisis dan pilih bukti paling penting.
          </p>
        </div>

        {/* Highlighted Live Counter Badge */}
        <div className="shrink-0 rounded-xl bg-[#0b2a21] border-2 border-[#c9a24b] px-4 py-3 shadow-lg space-y-1.5 min-w-[235px]">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono-tabular text-sm font-extrabold tracking-wide text-[#E7B94F]">
              BUKTI DIPILIH: {selectedCount}/3
            </span>
            <span className="text-[11px] font-mono-tabular text-[#a8b7a6]">Min 2 · Maks 3</span>
          </div>
          <div className="h-2 rounded-full bg-[#202923] border border-[#8a6a2f]/40 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#8a6a2f] via-[#E7B94F] to-[#52c98e] transition-all duration-300"
              style={{ width: `${Math.min(100, (selectedCount / 3) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. CREATIVE EVIDENCE COLLECTION RACK (3 Pinned Slip Slots) */}
      <div className="relative z-10 rounded-xl bg-[#091f18]/92 border border-[#8a6a2f]/60 p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#c9a24b] flex items-center gap-2">
            <Pin className="w-3.5 h-3.5 text-[#E7B94F]" />
            <span>RAK BUKTI TERPILIH ({selectedCount}/3 SLOT DISASAR)</span>
          </p>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded font-mono-tabular ${
              isCollectionComplete
                ? 'bg-[#15402f] text-[#52c98e] border border-[#52c98e]/45'
                : 'bg-[#202923] text-[#E7B94F] border border-[#8a6a2f]/45'
            }`}
          >
            {isCollectionComplete
              ? 'Bukti utama dikenal pasti'
              : selectedCount === 1
              ? 'Bukti direkodkan · Tambah 1 lagi'
              : 'Pilih sekurang-kurangnya 2 fail kes'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((slotIdx) => {
            const locId = selectedIds[slotIdx];
            const loc = locId ? LOCATIONS.find((l) => l.id === locId) : null;
            const style = locId ? CASE_BOARD_STYLES[locId] : null;
            const SlotIcon = style?.icon;

            if (loc && style && SlotIcon) {
              return (
                <div
                  key={`slot-filled-${loc.id}`}
                  className="room-slip-pin relative hq-ivory-paper rounded-lg border-2 border-[#E7B94F] p-3 text-[#1F362D] flex items-center justify-between gap-2.5 shadow-md"
                >
                  {/* Brass Tack */}
                  <span
                    aria-hidden="true"
                    className={`absolute -top-1.5 left-4 w-3 h-3 rounded-full bg-gradient-to-br ${style.pinColor} border border-[#202923] shadow`}
                  />

                  <button
                    type="button"
                    onClick={() => handleSelectCase(loc.id)}
                    className="flex items-center gap-2.5 text-left min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15402f] rounded"
                  >
                    <span className="w-9 h-9 rounded-lg bg-[#0b2a21] text-[#E7B94F] flex items-center justify-center shrink-0">
                      <SlotIcon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-mono-tabular text-[10px] font-extrabold uppercase tracking-wider text-[#8a6a2f]">
                        {style.caseNo} ·{' '}
                        {isCollectionComplete ? 'Bukti utama dikenal pasti' : 'Bukti direkodkan'}
                      </span>
                      <span className="block font-display text-sm font-bold text-[#0b2a21] truncate">
                        {loc.name}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePinEvidence(loc.id)}
                    aria-label={`Keluarkan ${loc.name} daripada koleksi bukti`}
                    title="Keluarkan bukti ini"
                    className="w-7 h-7 rounded-md bg-[#e4d6b7] hover:bg-[#c2593f] hover:text-white text-[#5c422d] flex items-center justify-center transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={`slot-empty-${slotIdx}`}
                className="rounded-lg border-2 border-dashed border-[#8a6a2f]/45 bg-[#0d241b]/75 p-3 flex items-center justify-between gap-2 text-[#a8b7a6]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-[#153126] border border-[#8a6a2f]/35 flex items-center justify-center font-mono-tabular text-xs font-bold text-[#c9a24b]">
                    0{slotIdx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#d5e0d7]">Pilih bukti</p>
                    <p className="text-[10px] font-mono-tabular text-[#8fa396]">
                      {slotIdx < 2 ? 'Slot Utama (Wajib)' : 'Slot Tambahan (Pilihan)'}
                    </p>
                  </div>
                </div>
                <Lock className="w-3.5 h-3.5 text-[#8a6a2f]/70 shrink-0" />
              </div>
            );
          })}
        </div>

        {/* Selection Limit Error Notification */}
        {error && (
          <div
            role="alert"
            className="p1-toast-enter rounded-xl bg-[#49221b] border-2 border-[#e07a5f] px-4 py-3 text-xs sm:text-sm font-semibold text-[#f8ece6] flex items-center justify-between gap-3 shadow-lg"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#f2ce74] shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={onClearError}
              aria-label="Tutup amaran"
              className="p-1 rounded hover:bg-black/25 text-[#f2ce74]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3. INTERACTIVE INVESTIGATION BOARD + PINNED CASE FILES + GOLDEN CONNECTING THREADS */}
      <div className="room-corkboard-surface relative rounded-2xl border-2 border-[#8a6a2f]/75 p-4 sm:p-6 overflow-hidden shadow-[inset_0_0_50px_rgba(3,12,9,0.75)]">
        {/* Subtle Floating Dust Particles */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden z-0">
          {DUST_MOTES.map((m) => (
            <span
              key={m.id}
              className="peta-float-mote absolute rounded-full bg-[#f2ce74]/55"
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

        {/* Background SVG Golden Thread Web & Central Investigation Hub (Desktop) */}
        <svg
          viewBox="0 0 800 430"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="hidden md:block pointer-events-none absolute inset-0 w-full h-full z-0"
        >
          <defs>
            <radialGradient id="roomCenterSpot" cx="50%" cy="50%" r="48%">
              <stop offset="0%" stopColor="rgba(231, 185, 79, 0.2)" />
              <stop offset="100%" stopColor="rgba(18, 41, 32, 0)" />
            </radialGradient>
          </defs>
          <circle cx="400" cy="215" r="210" fill="url(#roomCenterSpot)" />

          {LOCATIONS.map((loc) => {
            const st = CASE_BOARD_STYLES[loc.id];
            const isInspected = inspectedLocId === loc.id;
            const isSelected = selectedIds.includes(loc.id);
            const pathId = `room-thread-${loc.id}`;

            return (
              <g key={loc.id}>
                <path
                  id={pathId}
                  d={st.threadPath}
                  fill="none"
                  stroke={isInspected || isSelected ? '#E7B94F' : '#8a6a2f'}
                  strokeOpacity={isInspected ? 0.92 : isSelected ? 0.72 : 0.32}
                  strokeWidth={isInspected ? 3 : isSelected ? 2.4 : 1.5}
                  strokeDasharray={isInspected ? '8 5' : '6 6'}
                  className={isInspected ? 'peta-route-active' : undefined}
                />
                {(isInspected || isSelected) && (
                  <circle r="3.5" fill="#fff3c4" opacity="0.9">
                    <animateMotion dur="2.2s" repeatCount="indefinite">
                      <mpath href={`#${pathId}`} />
                    </animateMotion>
                  </circle>
                )}
                <circle
                  cx={st.pinX}
                  cy={st.pinY}
                  r={isInspected ? 6 : 4}
                  fill={isSelected ? '#E7B94F' : '#c9a24b'}
                  fillOpacity={isInspected ? 0.95 : 0.5}
                />
              </g>
            );
          })}

          {/* Central Brass Investigation Emblem Hub */}
          <circle
            cx="400"
            cy="215"
            r="34"
            fill="#0b2a21"
            fillOpacity="0.92"
            stroke="#c9a24b"
            strokeWidth="2"
          />
          <circle
            cx="400"
            cy="215"
            r="41"
            fill="none"
            stroke="#E7B94F"
            strokeOpacity="0.35"
            strokeWidth="1.2"
            strokeDasharray="3 4"
          />
          <text
            x="400"
            y="212"
            textAnchor="middle"
            fill="#E7B94F"
            fontSize="9"
            fontWeight="700"
            fontFamily="monospace"
          >
            PUSAT
          </text>
          <text
            x="400"
            y="224"
            textAnchor="middle"
            fill="#f4ebd0"
            fontSize="9"
            fontWeight="700"
            fontFamily="monospace"
          >
            KES
          </text>
        </svg>

        {/* 4 Pinned Detective Case Dossiers + Detailed Inspection Panel */}
        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left 8 Columns: 4 Unique Pinned Case Files on Investigation Wall */}
          <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            {LOCATIONS.map((loc) => {
              const inv = state.investigations[loc.id];
              const isSelected = selectedIds.includes(loc.id);
              const isInspected = inspectedLocId === loc.id;
              const style = CASE_BOARD_STYLES[loc.id];
              const LocIcon = style.icon;
              const showSparkle = recentSparkleLocId === loc.id;

              return (
                <div
                  key={loc.id}
                  className={`group relative rounded-xl transition-all duration-200 ${
                    style.tiltClass
                  } hover:rotate-0 ${
                    isSelected
                      ? '-translate-y-1.5 shadow-[0_22px_40px_rgba(0,0,0,0.6),0_0_24px_rgba(231,185,79,0.34)]'
                      : isInspected
                      ? '-translate-y-1 shadow-[0_18px_36px_rgba(0,0,0,0.55)]'
                      : 'hover:-translate-y-1 shadow-[0_14px_28px_rgba(0,0,0,0.48)]'
                  }`}
                >
                  {/* Folder Top Tab */}
                  <div className="flex items-end justify-between px-3">
                    <div
                      className={`px-3 py-1 rounded-t-lg border border-b-0 font-mono-tabular text-[10px] font-extrabold tracking-wider ${
                        isSelected
                          ? 'bg-[#E7B94F] border-[#fff1c2] text-[#0b2a21]'
                          : isInspected
                          ? 'bg-[#0b2a21] border-[#E7B94F] text-[#E7B94F]'
                          : 'bg-[#d8c8a6] border-[#8a6a2f]/60 text-[#493622]'
                      }`}
                    >
                      {style.caseNo} · {style.tabLabel}
                    </div>

                    {/* Decorative Colored Brass Pushpin */}
                    <span
                      aria-hidden="true"
                      className={`w-4 h-4 -mb-2 z-20 rounded-full bg-gradient-to-br ${style.pinColor} border-2 border-[#0b2a21] shadow-md`}
                    />
                  </div>

                  {/* Case Dossier Sheet */}
                  <div
                    className={`relative rounded-b-xl rounded-tr-xl border-2 p-4 sm:p-5 space-y-3.5 overflow-hidden transition-colors ${
                      isSelected
                        ? 'bg-[#edf5ee] border-[#E7B94F]'
                        : isInspected
                        ? `${style.accentBg} border-[#E7B94F]`
                        : `${style.accentBg} ${style.accentBorder} hover:border-[#E7B94F]`
                    }`}
                  >
                    {/* Subtle Paper Lines Overlay */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 opacity-45"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(to bottom, transparent 0px, transparent 25px, rgba(138, 106, 47, 0.08) 26px)',
                      }}
                    />

                    {/* Selection Sparkle Burst */}
                    {showSparkle && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute right-10 top-8 z-30"
                      >
                        {SELECT_SPARKLES.map((sp) => (
                          <span
                            key={sp.id}
                            className="hq-sparkle-piece absolute block w-2 h-2 rounded-full bg-[#E7B94F] shadow-[0_0_6px_#E7B94F]"
                            style={
                              {
                                '--tx': sp.tx,
                                '--ty': sp.ty,
                                '--delay': sp.delay,
                                '--dur': sp.dur,
                              } as React.CSSProperties
                            }
                          />
                        ))}
                      </div>
                    )}

                    {/* Clickable Case Identity Header (Inspects on Board) */}
                    <button
                      type="button"
                      onClick={() => handleSelectCase(loc.id)}
                      className="relative z-10 w-full text-left flex items-start justify-between gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15402f]"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border-2 shadow-sm transition-colors ${
                            isSelected
                              ? 'bg-[#0b2a21] text-[#E7B94F] border-[#E7B94F]'
                              : 'bg-[#e6d8b9] text-[#244639] border-[#8a6a2f]/45 group-hover:bg-[#0b2a21] group-hover:text-[#E7B94F]'
                          }`}
                        >
                          <LocIcon className="w-5 h-5" />
                        </span>

                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono-tabular text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-[#8c331d]/45 text-[#8c331d] bg-[#f8ece6]">
                              SULIT
                            </span>
                            <span className="font-mono-tabular text-[11px] font-bold text-[#6c5234]">
                              {loc.shortName}
                            </span>
                          </div>
                          <h3 className="font-display text-lg sm:text-xl font-bold text-[#0b2a21] leading-snug mt-0.5">
                            {style.caseNo} — {loc.name}
                          </h3>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="room-stamp-slam inline-flex items-center gap-1 px-2 py-0.5 rounded border-2 border-[#15402f] bg-[#15402f] text-[#E7B94F] font-mono-tabular text-[10px] font-extrabold tracking-wider shadow-sm shrink-0">
                          <ShieldCheck className="w-3 h-3" />
                          DIPILIH
                        </span>
                      )}
                    </button>

                    {/* Original Observation Notes & Initial Proposal */}
                    <div className="relative z-10 space-y-2.5 text-xs sm:text-sm text-[#1F362D]">
                      <div className="rounded-lg bg-white/85 border border-[#8a6a2f]/25 p-2.5">
                        <p className="text-[11px] font-mono-tabular font-bold uppercase tracking-wide text-[#795A40] mb-0.5">
                          Catatan Pemerhatian Murid
                        </p>
                        <p className="leading-relaxed text-[#1F362D] line-clamp-3">
                          {inv.notes || 'Tiada catatan direkodkan.'}
                        </p>
                      </div>

                      <div className="rounded-lg bg-white/85 border border-[#8a6a2f]/25 p-2.5">
                        <p className="text-[11px] font-mono-tabular font-bold uppercase tracking-wide text-[#795A40] mb-0.5">
                          Cadangan Awal
                        </p>
                        <p className="leading-relaxed text-[#1F362D] line-clamp-2">
                          {inv.initialProposal || 'Tiada cadangan awal.'}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Controls: TELITI BUKTI + PILIH BUKTI */}
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#8a6a2f]/25">
                      <button
                        type="button"
                        onClick={() => handleOpenMagnifier(loc.id)}
                        className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e6dac0] hover:bg-[#d8c7a3] text-[#1F362D] border border-[#8a6a2f]/45 text-xs font-bold transition-colors"
                      >
                        <Search className="w-3.5 h-3.5 text-[#795A40]" />
                        <span>TELITI BUKTI</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePinEvidence(loc.id)}
                        aria-pressed={isSelected}
                        className={`min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-[#0b2a21] hover:bg-[#15402f] text-[#E7B94F] border-[#E7B94F] shadow-sm'
                            : 'hq-brass-plaque text-[#202923] border-[#8a6a2f]/60 hover:brightness-105'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isSelected
                              ? 'bg-[#E7B94F] border-[#E7B94F] text-[#0b2a21]'
                              : 'bg-white/90 border-[#795A40]/50'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <span>{isSelected ? 'BUKTI DIPILIH' : 'Pilih Bukti'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right 4 Columns: Detailed Spotlight Case Inspection Panel */}
          <aside
            aria-label="Panel Pemeriksaan Fail Kes Terperinci"
            className="xl:col-span-4 hq-ivory-paper relative rounded-xl border-2 border-[#c9a24b] p-5 text-[#1F362D] shadow-[0_18px_40px_rgba(0,0,0,0.58)] space-y-4"
          >
            <div className="flex items-center justify-between gap-2 border-b-2 border-[#8a6a2f]/35 pb-2.5">
              <span className="font-mono-tabular text-xs font-extrabold uppercase tracking-wider text-[#8a6a2f]">
                MEJA PEMERIKSAAN · {inspectedStyle.caseNo}
              </span>
              <span className="font-mono-tabular text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#0b2a21] text-[#E7B94F]">
                FOKUS KES
              </span>
            </div>

            <div key={inspectedLoc.id} className="peta-dossier-switch space-y-3.5">
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 rounded-xl bg-[#0b2a21] text-[#E7B94F] border border-[#c9a24b] flex items-center justify-center shrink-0">
                  <InspectedIcon className="w-5 h-5" />
                </span>
                <div>
                  <p className="font-mono-tabular text-xs font-bold text-[#8a6a2f]">
                    {inspectedLoc.zoneLabel}
                  </p>
                  <h3 className="font-display text-xl font-bold text-[#0b2a21] leading-snug">
                    {inspectedLoc.name}
                  </h3>
                </div>
              </div>

              <div className="rounded-xl bg-white/90 border border-[#8a6a2f]/35 p-3.5 space-y-1.5">
                <p className="text-xs font-mono-tabular font-bold uppercase tracking-wide text-[#795A40]">
                  Catatan Pemerhatian Penuh
                </p>
                <p className="text-sm text-[#1F362D] leading-relaxed">
                  {inspectedInv.notes || 'Tiada catatan direkodkan.'}
                </p>
              </div>

              <div className="rounded-xl bg-white/90 border border-[#8a6a2f]/35 p-3.5 space-y-1.5">
                <p className="text-xs font-mono-tabular font-bold uppercase tracking-wide text-[#795A40]">
                  Cadangan Penyelesaian Awal
                </p>
                <p className="text-sm text-[#1F362D] leading-relaxed">
                  {inspectedInv.initialProposal || 'Tiada cadangan awal.'}
                </p>
              </div>

              {/* Phase 1 Discovered Clues Summary */}
              <div className="rounded-xl bg-[#e7dcc1] border border-[#8a6a2f]/40 p-3 space-y-2">
                <p className="font-mono-tabular text-[11px] font-bold uppercase tracking-wide text-[#0b2a21]">
                  Petunjuk Lapangan Ditemui ({inspectedInv.discoveredClueIds.length}/
                  {inspectedLoc.clues.length})
                </p>
                <ul className="space-y-1.5">
                  {inspectedLoc.clues.map((clue) => {
                    const found = inspectedInv.discoveredClueIds.includes(clue.id);
                    return (
                      <li key={clue.id} className="flex items-start gap-2 text-xs text-[#1F362D]">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                            found ? 'text-[#15402f]' : 'text-[#8a6a2f]/50'
                          }`}
                        />
                        <span className={found ? 'font-medium' : 'opacity-65'}>
                          {clue.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleOpenMagnifier(inspectedLoc.id)}
                className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b2a21] hover:bg-[#15402f] text-[#f4ebd0] border border-[#c9a24b] text-xs sm:text-sm font-bold transition-colors"
              >
                <ZoomIn className="w-4 h-4 text-[#E7B94F]" />
                <span>TELITI BUKTI (KANTA)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTogglePinEvidence(inspectedLoc.id)}
                className={`min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                  selectedIds.includes(inspectedLoc.id)
                    ? 'bg-[#15402f] text-[#52c98e] border-[#52c98e]/60 hover:bg-[#1e543e]'
                    : 'hq-brass-plaque text-[#202923] border-[#8a6a2f]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {selectedIds.includes(inspectedLoc.id)
                    ? 'Keluarkan dari Koleksi'
                    : 'Semat ke Rak Bukti'}
                </span>
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* 4. MAGNIFYING GLASS INSPECTION MODAL ("TELITI BUKTI") */}
      {magnifierLoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Teliti Bukti: ${magnifierLoc.name}`}
          className="fixed inset-0 z-50 bg-[#051510]/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setMagnifierOpenLocId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setLensPos({
                x: Math.round(((e.clientX - rect.left) / rect.width) * 100),
                y: Math.round(((e.clientY - rect.top) / rect.height) * 100),
              });
            }}
            className="p1-toast-enter relative w-full max-w-2xl hq-ivory-paper rounded-2xl border-4 border-[#c9a24b] p-5 sm:p-7 text-[#1F362D] shadow-[0_28px_70px_rgba(0,0,0,0.75)] overflow-hidden space-y-5"
          >
            {/* Interactive Magnifying Lens Spotlight following pointer */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(circle 190px at ${lensPos.x}% ${lensPos.y}%, rgba(255, 252, 235, 0.55), transparent 72%)`,
              }}
            />

            {/* Top Classified Stamp & Animated Magnifier Badge */}
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 border-b-2 border-[#8a6a2f]/40 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl bg-[#0b2a21] text-[#E7B94F] border-2 border-[#c9a24b] flex items-center justify-center shadow-md">
                  <Search className="w-6 h-6 room-magnifier-scan" />
                </div>
                <div>
                  <p className="font-mono-tabular text-xs font-extrabold uppercase tracking-wider text-[#8c331d]">
                    DOKUMEN BUKTI TERPERINCI · {CASE_BOARD_STYLES[magnifierLoc.id].caseNo}
                  </p>
                  <h3 className="font-display text-2xl font-bold text-[#0b2a21]">
                    {magnifierLoc.name}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMagnifierOpenLocId(null)}
                aria-label="Tutup paparan kanta pembesar"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-[#0b2a21] hover:bg-[#15402f] text-[#f4ebd0] border border-[#c9a24b] flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Layered Parchment Document Sheets */}
            <div className="relative z-10 space-y-4">
              <div className="rounded-xl bg-white/95 border-2 border-[#8a6a2f]/40 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono-tabular font-bold uppercase tracking-wider text-[#315C4C]">
                    <FileText className="w-4 h-4 text-[#8a6a2f]" />
                    Catatan Pemerhatian Ejen (Sorotan Utama)
                  </span>
                  <span className="font-mono-tabular text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF8E6] border border-[#E7B94F] text-[#795A40]">
                    DISAHKAN FASA 1
                  </span>
                </div>
                <p className="text-base text-[#0b2a21] font-medium leading-relaxed bg-[#FFFBEB] px-3 py-2 rounded-lg border-l-4 border-[#E7B94F]">
                  {state.investigations[magnifierLoc.id].notes || 'Tiada catatan direkodkan.'}
                </p>
              </div>

              <div className="rounded-xl bg-white/95 border-2 border-[#8a6a2f]/40 p-4 shadow-sm space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono-tabular font-bold uppercase tracking-wider text-[#315C4C]">
                  <Sparkles className="w-4 h-4 text-[#8a6a2f]" />
                  Cadangan Penyelesaian Awal
                </span>
                <p className="text-base text-[#1F362D] leading-relaxed">
                  {state.investigations[magnifierLoc.id].initialProposal || 'Tiada cadangan awal.'}
                </p>
              </div>

              <div className="rounded-xl bg-[#e7dcc1] border border-[#8a6a2f]/45 p-4 space-y-2">
                <p className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#0b2a21]">
                  Senarai Petunjuk Lapangan ({magnifierLoc.name})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {magnifierLoc.clues.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg bg-white/85 border border-[#8a6a2f]/30 p-2.5 text-xs space-y-1"
                    >
                      <p className="font-bold text-[#0b2a21] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#15402f] shrink-0" />
                        <span>{c.label}</span>
                      </p>
                      <p className="text-[#4A6358] leading-snug">{c.issueSummary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer: Select/Unselect Evidence Directly */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#8a6a2f]/35">
              <span className="font-mono-tabular text-xs font-bold text-[#795A40]">
                BUKTI DIPILIH: {selectedCount}/3
              </span>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMagnifierOpenLocId(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#e4d6b7] hover:bg-[#d6c49e] text-[#1F362D] font-bold text-sm transition-colors"
                >
                  Tutup Fail
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleTogglePinEvidence(magnifierLoc.id);
                  }}
                  className={`min-h-[44px] inline-flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm border transition-all ${
                    selectedIds.includes(magnifierLoc.id)
                      ? 'bg-[#0b2a21] text-[#E7B94F] border-[#E7B94F]'
                      : 'hq-brass-plaque text-[#202923] border-[#8a6a2f]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {selectedIds.includes(magnifierLoc.id)
                      ? 'Sudah Dipilih (Klik untuk Keluar)'
                      : 'Pilih Sebagai Bukti Utama'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
