import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
  Crosshair,
  Lock,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import kantinImg from '../assets/images/kantin_ceria_realistik_1794831646132.jpg';
import kelasImg from '../assets/images/kelas_harmoni_realistik_1794831926269.jpg';
import perpustakaanImg from '../assets/images/perpustakaan_ilmu_realistik_1794832156528.jpg';
import schoolMapImg from '../assets/images/school_map_blueprint_1794976530914.jpg';
import academyImg from '../assets/images/secret_academy_school_1794825908324.jpg';
import tamanImg from '../assets/images/taman_rekreasi_realistik_1794832375203.jpg';
import { gameAudio } from '../game/audio';
import { LOCATIONS } from '../game/data';
import { getUnlockedPhaseLevel } from '../game/rules';
import type { AppScreen, GameState, LocationId } from '../game/types';

export interface NextMissionSummary {
  level: number;
  screen: AppScreen;
  shortTag: string;
  title: string;
  desc: string;
  status: string;
}

interface PetaOperasiSectionProps {
  state: GameState;
  completedCount: number;
  selectedLocId: LocationId;
  onSelectLocId: (locId: LocationId) => void;
  onNavigatePhase: (screen: AppScreen, locationId?: LocationId) => void;
  nextMission?: NextMissionSummary;
}

const LOCATION_THUMBNAILS: Record<LocationId, string> = {
  kantin: kantinImg,
  kelas: kelasImg,
  perpustakaan: perpustakaanImg,
  taman: tamanImg,
};

// Coordinates aligned directly to the four architectural zones on school_map_blueprint_1794976530914.jpg
const MAP_PIN_META: Record<
  LocationId,
  {
    pinLeft: string;
    pinTop: string;
    gridRef: string;
    sectorTag: string;
    svgX: number;
    svgY: number;
    routePath: string;
    zoomOrigin: string;
  }
> = {
  kantin: {
    pinLeft: '27%',
    pinTop: '31%',
    gridRef: 'A2',
    sectorTag: 'ZON UTARA',
    svgX: 270,
    svgY: 174,
    routePath: 'M 500 250 C 425 225, 345 198, 270 174',
    zoomOrigin: '27% 30%',
  },
  kelas: {
    pinLeft: '71%',
    pinTop: '29%',
    gridRef: 'D2',
    sectorTag: 'ZON TIMUR',
    svgX: 710,
    svgY: 163,
    routePath: 'M 500 250 C 570 218, 640 190, 710 163',
    zoomOrigin: '72% 28%',
  },
  taman: {
    pinLeft: '27%',
    pinTop: '68%',
    gridRef: 'A4',
    sectorTag: 'ZON BARAT',
    svgX: 270,
    svgY: 382,
    routePath: 'M 500 250 C 425 292, 348 338, 270 382',
    zoomOrigin: '27% 70%',
  },
  perpustakaan: {
    pinLeft: '70%',
    pinTop: '66%',
    gridRef: 'D4',
    sectorTag: 'ZON SELATAN',
    svgX: 700,
    svgY: 371,
    routePath: 'M 500 250 C 570 292, 635 332, 700 371',
    zoomOrigin: '70% 68%',
  },
};

const AMBIENT_MOTES = [
  { id: 0, left: '14%', top: '24%', dur: '5.6s', delay: '0s', size: 4 },
  { id: 1, left: '84%', top: '22%', dur: '6.8s', delay: '1.1s', size: 3 },
  { id: 2, left: '49%', top: '16%', dur: '7.2s', delay: '0.5s', size: 4 },
  { id: 3, left: '20%', top: '80%', dur: '6.1s', delay: '1.7s', size: 3 },
  { id: 4, left: '78%', top: '82%', dur: '5.9s', delay: '0.8s', size: 4 },
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
        className="pointer-events-none absolute top-3 left-3 z-20 w-3 h-3 rounded-full bg-gradient-to-br from-[#fff2c6] via-[#c9a24b] to-[#6e501d] shadow-[0_1px_3px_rgba(0,0,0,0.7)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-3 right-3 z-20 w-3 h-3 rounded-full bg-gradient-to-br from-[#fff2c6] via-[#c9a24b] to-[#6e501d] shadow-[0_1px_3px_rgba(0,0,0,0.7)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 left-3 z-20 w-3 h-3 rounded-full bg-gradient-to-br from-[#fff2c6] via-[#c9a24b] to-[#6e501d] shadow-[0_1px_3px_rgba(0,0,0,0.7)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 right-3 z-20 w-3 h-3 rounded-full bg-gradient-to-br from-[#fff2c6] via-[#c9a24b] to-[#6e501d] shadow-[0_1px_3px_rgba(0,0,0,0.7)]"
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
  nextMission,
}: PetaOperasiSectionProps) {
  const [mapZoomed, setMapZoomed] = useState(false);
  const [hoveredLocId, setHoveredLocId] = useState<LocationId | null>(null);
  const [mapImgFailed, setMapImgFailed] = useState(false);
  const [thumbFailed, setThumbFailed] = useState<Record<string, boolean>>({});
  const [completionCelebrated, setCompletionCelebrated] = useState(false);
  const [showCompletionParticles, setShowCompletionParticles] = useState(false);

  const prevCompletedRef = useRef<number>(completedCount);
  const allLocationsComplete = completedCount >= LOCATIONS.length;
  const unlockedLevel = getUnlockedPhaseLevel(state);

  const inspectedLocation =
    LOCATIONS.find((loc) => loc.id === selectedLocId) || LOCATIONS[0];
  const inspectedInv = state.investigations[inspectedLocation.id];
  const inspectedCluesFound = inspectedInv.discoveredClueIds.length;
  const inspectedPct = Math.round(
    (inspectedCluesFound / Math.max(1, inspectedLocation.clues.length)) * 100
  );
  const activePinMeta = MAP_PIN_META[selectedLocId];

  // Determine the actual next mission details if not explicitly passed
  const activeMission: NextMissionSummary = nextMission || {
    level: unlockedLevel,
    screen: `phase${unlockedLevel}` as AppScreen,
    shortTag:
      unlockedLevel === 1
        ? 'FASA 1'
        : unlockedLevel === 2
        ? 'FASA 2'
        : unlockedLevel === 3
        ? 'FASA 3'
        : unlockedLevel === 4
        ? 'CABARAN AKHIR'
        : 'PRODUK AKHIR',
    title:
      unlockedLevel === 1
        ? `Siasat ${inspectedLocation.name}`
        : unlockedLevel === 2
        ? 'Makmal Analisis Kes'
        : unlockedLevel === 3
        ? 'Buktikan Teori Ejen'
        : unlockedLevel === 4
        ? 'Studio Arkitek'
        : 'Laporan Sekolah Impian',
    desc:
      unlockedLevel === 1
        ? inspectedLocation.briefing
        : unlockedLevel === 2
        ? 'Pilih 2–3 bukti utama di papan penyiasatan dan bina ayat pendapat anda.'
        : unlockedLevel === 3
        ? 'Kuasai cabaran alasan relevan dan tuliskan hujah sokongan bagi pendapat anda.'
        : unlockedLevel === 4
        ? 'Reka Pelan Sekolah Impian dengan School Builder dan pautkan justifikasi bukti.'
        : 'Tulis laporan pendapat 3–5 ayat, pratonton dan cetak hasil rasmi.',
    status:
      unlockedLevel === 1
        ? `${completedCount}/4 Lokasi Selesai`
        : 'Sedia Dibuka',
  };

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

  const handleSelectLocation = (locId: LocationId, zoomFocus = false) => {
    if (state.soundEnabled) {
      gameAudio.playClick();
    }
    onSelectLocId(locId);
    if (zoomFocus) {
      setMapZoomed(true);
    }
  };

  const handleOpenNextMission = () => {
    if (state.soundEnabled) {
      gameAudio.playHint();
    }
    if (unlockedLevel === 1) {
      onNavigatePhase('phase1', inspectedLocation.id);
    } else {
      onNavigatePhase(activeMission.screen);
    }
  };

  const handleOpenLocation = (locId: LocationId) => {
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

  const dossierPreviewImage =
    unlockedLevel === 1 || selectedLocId
      ? LOCATION_THUMBNAILS[inspectedLocation.id]
      : academyImg;

  return (
    <section
      aria-label="Peta Operasi Sekolah Seri Bestari"
      className="hq-stage-2 hq-desk-bezel relative rounded-2xl border-2 border-[#c9a24b]/70 p-4 sm:p-6 lg:p-7 space-y-5 overflow-hidden"
    >
      <BrassCornerRivets />

      {/* Header Strip */}
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-3 border-b border-[#c9a24b]/35 pb-3.5">
        <div className="space-y-1">
          <p className="font-mono-tabular text-xs font-bold uppercase tracking-[0.2em] text-[#E7B94F] flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#E7B94F]" />
            MEJA PETA PENYIASATAN · SEKOLAH SERI BESTARI
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#f4ebd0] tracking-tight">
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
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0b2a21] hover:bg-[#15402f] border border-[#c9a24b]/70 text-xs font-bold text-[#f4ebd0] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#E7B94F]" />
              <span>Pandangan Penuh</span>
            </button>
          )}
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#09231b]/95 border border-[#c9a24b]/65 font-mono-tabular text-xs sm:text-sm font-bold text-[#E7B94F]">
            <Crosshair className="w-4 h-4 text-[#E7B94F]" />
            {completedCount} / 4 Lokasi Disahkan
          </span>
        </div>
      </div>

      {/* Special Operation Completion Banner (when 4/4 locations complete) */}
      {allLocationsComplete && (
        <div
          role="status"
          aria-live="polite"
          className="relative z-10 overflow-hidden rounded-xl border-2 border-[#E7B94F] bg-gradient-to-r from-[#09231b] via-[#15402f] to-[#09231b] p-4 sm:p-5 shadow-[0_14px_34px_rgba(201,162,75,0.28)]"
        >
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
              <button
                type="button"
                onClick={handleReplayCelebration}
                title="Mainkan semula kilauan kejayaan"
                className="relative w-12 h-12 rounded-full hq-brass-plaque border-2 border-[#f4ebd0]/80 flex items-center justify-center text-[#202923] shadow-lg transition-transform hover:scale-105 shrink-0"
              >
                <Award className="w-6 h-6" />
              </button>
              <div className="space-y-0.5">
                <p className="font-mono-tabular text-xs font-extrabold tracking-wider text-[#E7B94F] uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  OPERASI JEJAK BUKTI SELESAI · 4/4 LOKASI DISAHKAN
                </p>
                <p className="font-display text-base sm:text-lg font-bold text-[#f4ebd0]">
                  Tahniah, Ejen! Kesemua zon Sekolah Seri Bestari telah berjaya disiasat.
                </p>
              </div>
            </div>

            {unlockedLevel === 2 && (
              <button
                type="button"
                onClick={() => onNavigatePhase('phase2')}
                className="hq-brass-plaque min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[#202923] font-bold text-sm border border-[#f4ebd0]/60 shadow-md hover:brightness-105 transition-transform hover:-translate-y-0.5 whitespace-nowrap shrink-0"
              >
                <span>Buka Makmal Analisis Kes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Split: Centre Large Illustrated School Map (8 cols) + Right Pinned "MISI SETERUSNYA" Dossier (4 cols) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* CENTRE: Large Illustrated Bird's-Eye School Map on Wooden Desk (hidden only on very tiny screens? No, visible on md+ and cleanly scaled!) */}
        <div className="hidden md:flex lg:col-span-8 flex-col justify-between rounded-2xl overflow-hidden border-2 border-[#c9a24b]/80 bg-[#1a1109] shadow-[inset_0_0_40px_rgba(0,0,0,0.75),0_18px_40px_rgba(0,0,0,0.65)] relative min-h-[500px] lg:min-h-[540px]">
          {/* Ambient floating golden dust particles */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden z-20">
            {AMBIENT_MOTES.map((m) => (
              <span
                key={m.id}
                className="peta-float-mote absolute rounded-full bg-[#E7B94F]/70 shadow-[0_0_6px_rgba(231,185,79,0.7)]"
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

          {/* Interactive Zoomable Map Stage */}
          <div
            className="relative w-full h-full flex-1 min-h-[500px] lg:min-h-[540px] transition-transform duration-500 ease-out"
            style={{
              transform: mapZoomed ? 'scale(1.12)' : 'scale(1)',
              transformOrigin: activePinMeta.zoomOrigin,
            }}
          >
            {/* Illustrated Bird's-Eye Parchment Map on Mahogany Desk */}
            {!mapImgFailed ? (
              <img
                src={schoolMapImg}
                alt="Peta Ilustrasi Sekolah Seri Bestari di atas meja penyiasatan"
                referrerPolicy="no-referrer"
                onError={() => setMapImgFailed(true)}
                className="absolute inset-0 w-full h-full object-cover object-[50%_62%] scale-[1.09]"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#2b3f33] via-[#1c2f25] to-[#132018]" />
            )}

            {/* Warm Desk Lamp Vignette (blends top edge smoothly into mahogany bezel) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(20,12,7,0.94) 0%, rgba(20,12,7,0.62) 10%, rgba(20,12,7,0.14) 22%, transparent 36%, transparent 78%, rgba(16,10,6,0.8) 100%), radial-gradient(ellipse 86% 80% at 50% 52%, transparent 56%, rgba(16,10,6,0.72) 100%)',
              }}
            />

            {/* Animated Golden Dotted Investigation Routes SVG Overlay */}
            <svg
              viewBox="0 0 1000 562"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 w-full h-full z-10"
            >
              {LOCATIONS.map((loc) => {
                const meta = MAP_PIN_META[loc.id];
                const isActive = selectedLocId === loc.id || hoveredLocId === loc.id;
                const isDone = state.investigations[loc.id].completed;

                return (
                  <g key={loc.id}>
                    {/* Dark ink shadow under dotted route */}
                    <path
                      d={meta.routePath}
                      fill="none"
                      stroke="#182a20"
                      strokeOpacity="0.52"
                      strokeWidth={isActive ? 7.5 : 5}
                      strokeDasharray="10 8"
                      strokeLinecap="round"
                    />
                    <path
                      d={meta.routePath}
                      fill="none"
                      stroke={isActive ? '#FFD56B' : isDone ? '#4ADE80' : '#E7B94F'}
                      strokeOpacity={isActive ? 0.98 : 0.85}
                      strokeWidth={isActive ? 4 : 2.8}
                      strokeDasharray="10 8"
                      strokeLinecap="round"
                      className="peta-route-active"
                    />
                    <circle
                      cx={meta.svgX}
                      cy={meta.svgY}
                      r={isActive ? 7 : 5}
                      fill={isDone ? '#86EFAC' : '#FFF4C8'}
                      fillOpacity="0.85"
                    />
                  </g>
                );
              })}

              {/* Central Clocktower Node Beacon */}
              <circle
                cx="500"
                cy="250"
                r="14"
                fill="rgba(231, 185, 79, 0.28)"
                stroke="#E7B94F"
                strokeWidth="2"
              />
              <circle cx="500" cy="250" r="5" fill="#FFF3C4" />
            </svg>

            {/* 4 Interactive Illustrated Location Markers */}
            {LOCATIONS.map((loc) => {
              const meta = MAP_PIN_META[loc.id];
              const inv = state.investigations[loc.id];
              const cluesFound = inv.discoveredClueIds.length;
              const isSelected = selectedLocId === loc.id;
              const isNextTodo = !inv.completed && (isSelected || unlockedLevel === 1);
              const thumbSrc = LOCATION_THUMBNAILS[loc.id];

              return (
                <div
                  key={loc.id}
                  style={{ left: meta.pinLeft, top: meta.pinTop }}
                  onMouseEnter={() => setHoveredLocId(loc.id)}
                  onMouseLeave={() => setHoveredLocId(null)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
                >
                  {/* Pulsing Golden Halo for Active / Selected Location */}
                  {(isSelected || (!inv.completed && unlockedLevel === 1)) && (
                    <span
                      aria-hidden="true"
                      className={`hq-pin-pulse pointer-events-none absolute top-2 w-20 h-20 rounded-full border-2 ${
                        isSelected ? 'border-[#FFD56B]' : 'border-[#E7B94F]/70'
                      }`}
                    />
                  )}

                  {/* Clickable Location Marker Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectLocation(loc.id, false)}
                    onDoubleClick={() => handleOpenLocation(loc.id)}
                    aria-pressed={isSelected}
                    aria-label={`${loc.name} (${meta.sectorTag}), ${cluesFound} daripada ${loc.clues.length} bukti ditemui`}
                    className={`group relative flex flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD56B] rounded-2xl transition-transform duration-200 ${
                      isSelected ? 'scale-105 -translate-y-1' : 'hover:scale-105 hover:-translate-y-1'
                    }`}
                  >
                    {/* Golden Pin Crest above Photo Medallion */}
                    <span
                      aria-hidden="true"
                      className={`mb-[-10px] z-20 inline-flex items-center justify-center w-7 h-7 rounded-full border-2 shadow-md ${
                        inv.completed
                          ? 'bg-[#1a5d42] border-[#f4ebd0] text-[#86EFAC]'
                          : 'hq-brass-plaque border-[#fff4cc] text-[#202923]'
                      }`}
                    >
                      {inv.completed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5" />
                      )}
                    </span>

                    {/* Circular Framed Real Location Illustration */}
                    <div
                      className={`relative w-20 h-20 lg:w-22 lg:h-22 rounded-full p-1 transition-all duration-200 shadow-[0_12px_26px_rgba(0,0,0,0.7)] ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#FFE699] via-[#E7B94F] to-[#8A6320] ring-4 ring-[#E7B94F]/35'
                          : inv.completed
                          ? 'bg-gradient-to-b from-[#6EE7B7] via-[#10B981] to-[#065F46]'
                          : 'bg-gradient-to-b from-[#E7B94F] via-[#B48836] to-[#6E501D]'
                      }`}
                    >
                      <div className="w-full h-full rounded-full overflow-hidden bg-[#0b2a21] border border-[#14271f]">
                        {!thumbFailed[loc.id] ? (
                          <img
                            src={thumbSrc}
                            alt={loc.name}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setThumbFailed((prev) => ({ ...prev, [loc.id]: true }))
                            }
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#15402f] text-[#E7B94F] font-display font-bold text-lg">
                            {loc.shortName.slice(0, 2)}
                          </div>
                        )}
                      </div>

                      {/* Clue Count Mini Badge */}
                      <span
                        className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md font-mono-tabular text-[10px] font-extrabold border shadow ${
                          inv.completed
                            ? 'bg-[#065F46] border-[#6EE7B7] text-[#ECFDF5]'
                            : 'bg-[#0b2a21] border-[#E7B94F] text-[#E7B94F]'
                        }`}
                      >
                        {cluesFound}/{loc.clues.length}
                      </span>
                    </div>

                    {/* Engraved Dark-Emerald & Gold Location Nameplate */}
                    <div
                      className={`mt-1.5 px-3 py-1 rounded-lg border shadow-[0_8px_18px_rgba(0,0,0,0.72)] text-center transition-colors ${
                        isSelected
                          ? 'bg-[#072018] border-[#FFD56B] text-[#FFF4CC]'
                          : 'bg-[#0b2a21]/95 border-[#c9a24b]/80 text-[#f4ebd0] group-hover:border-[#FFD56B]'
                      }`}
                    >
                      <p className="font-display text-xs lg:text-sm font-bold whitespace-nowrap leading-tight">
                        {loc.name}
                      </p>
                      <p className="font-mono-tabular text-[10px] text-[#E7B94F] font-semibold leading-tight">
                        {inv.completed ? 'Selesai' : isNextTodo ? 'Sedia Disiasat' : meta.sectorTag}
                      </p>
                    </div>
                  </button>

                  {/* Quick Hover/Selected "Siasat" Button directly below active marker */}
                  {isSelected && (
                    <button
                      type="button"
                      onClick={() => handleOpenLocation(loc.id)}
                      className="mt-1.5 inline-flex items-center gap-1 px-3 py-1 rounded-lg hq-brass-plaque border border-[#fff4cc]/70 text-[#202923] font-bold text-[11px] shadow-lg hover:brightness-105 transition-transform hover:scale-105 whitespace-nowrap"
                    >
                      <span>{inv.completed ? 'Semak Lokasi' : 'Siasat Zon'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Bottom Map Legend Bar */}
            <div className="pointer-events-none absolute bottom-2.5 inset-x-4 z-20 flex items-center justify-between gap-3 text-[11px] font-mono-tabular text-[#f4ebd0]/90">
              <span className="px-2.5 py-1 rounded bg-[#071c15]/85 border border-[#8a6a2f]/60">
                DATARAN JAM BESTARI · ZON {activePinMeta.gridRef}
              </span>
              <span className="px-2.5 py-1 rounded bg-[#071c15]/85 border border-[#8a6a2f]/60">
                KLIK PENANDA LOKASI UNTUK TELITI FAIL · KLIK DUA KALI UNTUK SIASAT
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE OF MAP: Pinned Parchment Document — "MISI SETERUSNYA" */}
        <aside
          aria-label="Misi Seterusnya"
          className="lg:col-span-4 hq-parchment-pinned relative rounded-2xl border-2 border-[#8a6a2f]/85 p-5 sm:p-6 text-[#202923] flex flex-col justify-between gap-4"
        >
          {/* Realistic 3D Brass & Crimson Pushpin */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center"
          >
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#e06a4d] via-[#b43c23] to-[#691c0d] border-2 border-[#f7d88c] shadow-[0_6px_12px_rgba(0,0,0,0.55)]" />
            <span className="w-2 h-1.5 -mt-0.5 rounded-b-full bg-[#3a2515]/75" />
          </div>

          <div className="space-y-3.5 pt-1">
            {/* Pinned Document Header */}
            <div className="flex items-center justify-between gap-2 border-b-2 border-[#8a6a2f]/35 pb-2.5">
              <div>
                <p className="font-mono-tabular text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#8a6a2f]">
                  {activeMission.shortTag} · {activeMission.status}
                </p>
                <h3 className="font-display text-2xl font-bold text-[#0b2a21] leading-tight">
                  MISI SETERUSNYA
                </h3>
              </div>

              {inspectedInv.completed && unlockedLevel === 1 ? (
                <span className="hq-brass-plaque inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#8a6a2f] text-[#202923] font-mono-tabular text-[10px] font-extrabold tracking-wider shadow-sm shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  SAH
                </span>
              ) : (
                <span className="font-mono-tabular text-[10px] font-bold uppercase tracking-widest text-[#8c331d] border border-[#8c331d]/60 bg-[#f8ece6] px-2 py-0.5 rounded-sm shrink-0">
                  AKTIF
                </span>
              )}
            </div>

            {/* Beautiful Location / Mission Illustration */}
            <div className="relative rounded-xl overflow-hidden border-2 border-[#8a6a2f]/70 bg-[#15402f] shadow-[0_8px_20px_rgba(32,41,35,0.22)] aspect-[16/9]">
              <img
                src={dossierPreviewImage}
                alt={`Ilustrasi ${inspectedLocation.name}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#0b2a21]/85 via-transparent to-transparent"
              />
              <div className="absolute bottom-2 inset-x-3 flex items-center justify-between gap-2 text-[#f4ebd0]">
                <span className="font-display text-sm font-bold truncate">
                  {unlockedLevel === 1 ? inspectedLocation.name : activeMission.title}
                </span>
                <span className="font-mono-tabular text-[11px] font-bold text-[#E7B94F] shrink-0">
                  {activePinMeta.gridRef} · {inspectedCluesFound}/{inspectedLocation.clues.length} Bukti
                </span>
              </div>
            </div>

            {/* Actual Next Available Phase Title & Description */}
            <div key={`${activeMission.level}-${inspectedLocation.id}`} className="peta-dossier-switch space-y-2">
              <h4 className="font-display text-xl font-bold text-[#0b2a21] leading-snug">
                {activeMission.title}
              </h4>
              <p className="text-sm text-[#2a3830] leading-relaxed">
                {activeMission.desc}
              </p>
            </div>

            {/* Compact Location Quick Switcher + Evidence Seal Progress */}
            <div className="rounded-xl bg-[#e7dcc1]/90 border border-[#8a6a2f]/45 p-3 space-y-2.5">
              <div className="grid grid-cols-4 gap-1" role="tablist" aria-label="Pilih lokasi peta">
                {LOCATIONS.map((loc) => {
                  const isTabSelected = selectedLocId === loc.id;
                  const isTabDone = state.investigations[loc.id].completed;
                  const tabLabel = loc.id === 'perpustakaan' ? 'Pustaka' : loc.shortName;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      role="tab"
                      aria-selected={isTabSelected}
                      aria-label={loc.name}
                      title={loc.name}
                      onClick={() => handleSelectLocation(loc.id, false)}
                      className={`px-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${
                        isTabSelected
                          ? 'bg-[#0b2a21] text-[#E7B94F] border border-[#c9a24b]'
                          : 'bg-[#dfd1b2] hover:bg-[#d4c39e] text-[#202923]'
                      }`}
                    >
                      <span className="whitespace-nowrap">{tabLabel}</span>
                      {isTabDone && <CheckCircle2 className="w-3 h-3 shrink-0 text-[#10b981]" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs font-mono-tabular font-bold text-[#0b2a21]">
                <span>Bukti {inspectedLocation.shortName}</span>
                <span>
                  {inspectedCluesFound}/{inspectedLocation.clues.length} ({inspectedPct}%)
                </span>
              </div>

              <ul className="space-y-1">
                {inspectedLocation.clues.map((clue, idx) => {
                  const found = inspectedInv.discoveredClueIds.includes(clue.id);
                  return (
                    <li
                      key={clue.id}
                      className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-xs border ${
                        found
                          ? 'bg-[#15402f]/12 border-[#15402f]/35 text-[#0b2a21] font-semibold'
                          : 'bg-[#f4ebd0]/70 border-[#8a6a2f]/25 text-[#5b4d38]'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        {found ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#15402f] shrink-0" />
                        ) : (
                          <Lock className="w-3 h-3 text-[#8a6a2f] shrink-0" />
                        )}
                        <span className="truncate">
                          {found ? clue.label : `Petunjuk Sulit #${idx + 1}`}
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

          {/* Primary Large Golden "BUKA MISI" CTA Button */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleOpenNextMission}
              className="relative overflow-hidden w-full inline-flex items-center justify-center gap-2.5 px-5 min-h-[52px] rounded-xl hq-brass-plaque border-2 border-[#755318] text-[#202923] font-display font-extrabold text-base sm:text-lg shadow-[0_12px_26px_rgba(138,106,47,0.42)] hover:brightness-105 hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b2a21]"
            >
              <span
                aria-hidden="true"
                className="hq-cta-sheen pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent"
              />
              <span className="relative z-10">BUKA MISI</span>
              <ArrowRight className="relative z-10 w-5 h-5" />
            </button>

            {unlockedLevel > 1 && (
              <button
                type="button"
                onClick={() => handleOpenLocation(inspectedLocation.id)}
                className="w-full min-h-[40px] rounded-lg bg-[#0b2a21] hover:bg-[#15402f] text-[#f4ebd0] border border-[#8a6a2f] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-[#E7B94F]" />
                <span>Semak Lokasi: {inspectedLocation.name}</span>
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Tactical Map List (< md) */}
      <div className="md:hidden relative z-10 space-y-3">
        <div className="relative rounded-xl overflow-hidden border border-[#c9a24b]/70 aspect-[16/9]">
          <img
            src={schoolMapImg}
            alt="Peta Sekolah Seri Bestari"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b2a21]/85 via-transparent to-transparent flex items-end p-3">
            <p className="font-mono-tabular text-xs font-bold text-[#E7B94F]">
              PILIH LOKASI PENYIASATAN DI BAWAH
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {LOCATIONS.map((loc) => {
            const inv = state.investigations[loc.id];
            const cluesFound = inv.discoveredClueIds.length;
            const meta = MAP_PIN_META[loc.id];
            const pct = Math.round((cluesFound / Math.max(1, loc.clues.length)) * 100);

            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => {
                  handleSelectLocation(loc.id, false);
                  handleOpenLocation(loc.id);
                }}
                className={`w-full text-left rounded-xl p-3.5 min-h-[44px] border flex items-center gap-3 transition-all ${
                  inv.completed
                    ? 'bg-[#15402f] border-[#E7B94F] shadow-md'
                    : 'bg-[#0b2a21]/95 border-[#8a6a2f]/80 hover:border-[#E7B94F]'
                }`}
              >
                <img
                  src={LOCATION_THUMBNAILS[loc.id]}
                  alt={loc.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-lg object-cover border border-[#c9a24b]/60 shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono-tabular text-[#E7B94F] font-bold">
                      {meta.gridRef} · {meta.sectorTag}
                    </span>
                    <span className="font-mono-tabular text-xs font-bold text-[#f4ebd0]">
                      {cluesFound}/{loc.clues.length} ({pct}%)
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#f4ebd0] truncate">
                    {loc.name}
                  </h3>
                  <p className="text-xs text-[#a8b7a6] line-clamp-1">{loc.briefing}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
