import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
  Lock,
  ShieldCheck,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { LOCATIONS } from '../game/data';
import { gameAudio } from '../game/audio';
import type { AppScreen, LocationId } from '../game/types';

export interface MissionPhaseItem {
  level: number;
  screen: AppScreen;
  shortTag: string;
  title: string;
  desc: string;
  status: string;
  unlocked: boolean;
  done: boolean;
}

interface MissionStatusSectionProps {
  phases: MissionPhaseItem[];
  unlockedLevel: number;
  xp: number;
  soundEnabled: boolean;
  onNavigatePhase: (screen: AppScreen, locationId?: LocationId) => void;
}

const GRAND_SPARKLES = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  const dist = 56 + ((i * 27) % 82);
  return {
    id: i,
    tx: `${Math.round(Math.cos(angle) * dist)}px`,
    ty: `${Math.round(Math.sin(angle) * dist - 16)}px`,
    delay: `${(i % 5) * 0.07}s`,
    dur: `${1.15 + (i % 4) * 0.22}s`,
    size: i % 2 === 0 ? 7 : 5,
  };
});

export function MissionStatusSection({
  phases,
  unlockedLevel,
  xp,
  soundEnabled,
  onNavigatePhase,
}: MissionStatusSectionProps) {
  const [spotlightByLevel, setSpotlightByLevel] = useState<
    Record<number, { x: number; y: number }>
  >({});
  const [newlyUnlockedLevel, setNewlyUnlockedLevel] = useState<number | null>(null);
  const [missionToast, setMissionToast] = useState<string | null>(null);
  const [showGrandParticles, setShowGrandParticles] = useState(false);

  const prevDoneCountRef = useRef<number>(phases.filter((p) => p.done).length);
  const prevUnlockedRef = useRef<number>(unlockedLevel);

  const completedPhasesCount = phases.filter((p) => p.done).length;
  const allFiveDone = completedPhasesCount === phases.length;
  const trackProgressPercent = Math.min(100, Math.max(0, (completedPhasesCount / 4) * 100));

  // Detect live phase completion or unlock transitions & trigger celebratory feedback
  useEffect(() => {
    const prevDone = prevDoneCountRef.current;
    const prevUnlocked = prevUnlockedRef.current;

    if (completedPhasesCount > prevDone || unlockedLevel > prevUnlocked) {
      if (unlockedLevel > prevUnlocked) {
        setNewlyUnlockedLevel(unlockedLevel);
      }
      const newlyUnlockedPhase = phases.find((p) => p.level === unlockedLevel);
      setMissionToast(
        allFiveDone
          ? 'Kesemua 5 Fasa Selesai! Status Ejen Tertinggi dibuka.'
          : newlyUnlockedPhase
          ? `Fasa Baharu Dibuka: ${newlyUnlockedPhase.title}`
          : 'Kemajuan misi dikemas kini!'
      );
      if (soundEnabled) {
        gameAudio.playSuccess();
      }
      if (allFiveDone) {
        setShowGrandParticles(true);
      }

      const timer = window.setTimeout(() => {
        setNewlyUnlockedLevel(null);
        setMissionToast(null);
        setShowGrandParticles(false);
      }, 3600);

      prevDoneCountRef.current = completedPhasesCount;
      prevUnlockedRef.current = unlockedLevel;
      return () => window.clearTimeout(timer);
    }

    prevDoneCountRef.current = completedPhasesCount;
    prevUnlockedRef.current = unlockedLevel;
  }, [allFiveDone, completedPhasesCount, phases, soundEnabled, unlockedLevel]);

  const handleCardMove = (level: number, e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setSpotlightByLevel((prev) => ({ ...prev, [level]: { x, y } }));
  };

  const handleActionClick = (p: MissionPhaseItem) => {
    if (soundEnabled) {
      gameAudio.playClick();
    }
    onNavigatePhase(p.screen, p.level === 1 ? LOCATIONS[0].id : undefined);
  };

  const handleReplayGrandCelebration = () => {
    if (soundEnabled) {
      gameAudio.playSuccess();
    }
    setShowGrandParticles(false);
    window.setTimeout(() => setShowGrandParticles(true), 20);
  };

  return (
    <section
      aria-label="Status Penyelesaian Misi"
      className="hq-stage-2 hq-leather-folio relative rounded-2xl border border-[#8a6a2f]/75 p-5 sm:p-7 space-y-6 overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#8a6a2f]/40 pb-4">
        <div className="space-y-1">
          <p className="font-mono-tabular text-xs font-bold uppercase tracking-[0.18em] text-[#c9a24b] flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#E7B94F]" />
            RANTAIAN PENYIASATAN BERPERINGKAT
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#f4ebd0]">
            STATUS PENYELESAIAN MISI
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#071c15]/90 border border-[#8a6a2f]/60 font-mono-tabular text-xs sm:text-sm font-semibold text-[#a8b7a6]">
            <span>Fasa Aktif Semasa:</span>
            <strong className="text-[#E7B94F]">Tahap {unlockedLevel}/5</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#15402f] border border-[#c9a24b]/60 font-mono-tabular text-xs sm:text-sm font-bold text-[#f4ebd0]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#52c98e]" />
            {completedPhasesCount}/5 Selesai
          </span>
        </div>
      </div>

      {/* Live Unlock / Completion Micro-Notification */}
      {missionToast && (
        <div
          role="status"
          aria-live="polite"
          className="p1-toast-enter rounded-xl bg-[#15402f] border border-[#E7B94F] px-4 py-2.5 flex items-center gap-2.5 text-sm font-bold text-[#f4ebd0] shadow-lg"
        >
          <Unlock className="w-4 h-4 text-[#E7B94F] shrink-0" />
          <span>{missionToast}</span>
        </div>
      )}

      {/* Grand 5/5 Completion Celebration Sequence */}
      {allFiveDone && (
        <div
          role="status"
          aria-live="polite"
          className="relative overflow-hidden rounded-2xl border-2 border-[#E7B94F] bg-gradient-to-r from-[#081f18] via-[#15402f] to-[#081f18] p-5 sm:p-6 shadow-[0_18px_42px_rgba(201,162,75,0.28)]"
        >
          {showGrandParticles && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-14 top-1/2 -translate-y-1/2 z-10"
            >
              {GRAND_SPARKLES.map((sp) => (
                <span
                  key={sp.id}
                  className="hq-sparkle-piece absolute block rounded-full bg-[#E7B94F] shadow-[0_0_8px_rgba(231,185,79,0.9)]"
                  style={
                    {
                      width: `${sp.size}px`,
                      height: `${sp.size}px`,
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

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="relative shrink-0">
                <span
                  aria-hidden="true"
                  className="hq-node-pulse absolute inset-[-5px] rounded-full bg-[#E7B94F]/20"
                />
                <button
                  type="button"
                  onClick={handleReplayGrandCelebration}
                  title="Mainkan semula kilauan kejayaan"
                  className="relative w-14 h-14 rounded-full hq-brass-plaque border-2 border-[#f4ebd0]/80 flex items-center justify-center text-[#202923] shadow-xl hover:scale-105 transition-transform"
                >
                  <Award className="w-7 h-7" />
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#E7B94F] text-[#0b2a21] font-mono-tabular text-xs font-extrabold tracking-wider uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    TAHNIAH, DETEKTIF!
                  </span>
                  <span className="font-mono-tabular text-xs font-bold text-[#c9a24b]">
                    GANJARAN TERKUMPUL: {xp} XP · 5/5 FASA SELESAI
                  </span>
                </div>
                <p className="font-display text-base sm:text-xl font-bold text-[#f4ebd0]">
                  ANDA TELAH BERJAYA MENYELESAIKAN KESELURUHAN MISI SEKOLAH SERI BESTARI.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleActionClick(phases[4])}
              className="hq-brass-plaque min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[#202923] font-bold text-sm border border-[#f4ebd0]/60 shadow-md hover:brightness-105 transition-transform hover:-translate-y-0.5 whitespace-nowrap shrink-0"
            >
              <span>Lihat Laporan Akhir</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          DESKTOP HORIZONTAL DETECTIVE TIMELINE & 5 MISSION CARDS (md+)
         ===================================================================== */}
      <div className="hidden md:block relative pt-3">
        {/* Glowing Golden Timeline Track + Travelling Light Particles */}
        <div
          aria-hidden="true"
          className="absolute left-[10%] right-[10%] top-[1.85rem] h-1.5 rounded-full bg-[#091c15] border border-[#8a6a2f]/45 overflow-hidden shadow-inner"
        >
          <div
            className="relative h-full bg-gradient-to-r from-[#8a6a2f] via-[#c9a24b] to-[#E7B94F] transition-all duration-700 shadow-[0_0_12px_rgba(231,185,79,0.65)]"
            style={{ width: `${trackProgressPercent}%` }}
          >
            {trackProgressPercent > 0 && (
              <span className="misi-track-particle absolute top-1/2 -translate-y-1/2 w-5 h-1.5 rounded-full bg-[#fff5d1] shadow-[0_0_10px_#E7B94F]" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3.5 lg:gap-4 relative z-10 items-stretch">
          {phases.map((p) => {
            const isActiveCurrent = p.unlocked && !p.done;
            const isLocked = !p.unlocked;
            const justUnlocked = newlyUnlockedLevel === p.level;
            const spot = spotlightByLevel[p.level] || { x: 50, y: 30 };

            return (
              <div key={p.level} className="flex flex-col items-center text-center gap-3.5 h-full">
                {/* Timeline Medallion Node */}
                <div className="relative">
                  {p.done && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-[-4px] rounded-full bg-[#E7B94F]/25 blur-[2px]"
                    />
                  )}
                  <div
                    className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      p.done
                        ? 'bg-gradient-to-b from-[#E7B94F] to-[#a78034] border-[#f4ebd0] text-[#202923] shadow-[0_0_20px_rgba(231,185,79,0.55)]'
                        : isActiveCurrent
                        ? 'bg-[#15402f] border-[#E7B94F] text-[#E7B94F] hq-node-pulse shadow-[0_0_22px_rgba(231,185,79,0.45)]'
                        : 'bg-[#081a13] border-[#8a6a2f]/40 text-[#7d8e82]'
                    }`}
                  >
                    {p.done ? (
                      <CheckCircle2 className="w-5 h-5 misi-check-pop" />
                    ) : isActiveCurrent ? (
                      <Compass className="w-5 h-5 misi-compass-spin" />
                    ) : (
                      <Lock className="w-4 h-4 misi-padlock-sway" />
                    )}
                  </div>
                </div>

                {/* Mission Card */}
                <div
                  onPointerMove={(e) => handleCardMove(p.level, e)}
                  style={
                    {
                      '--spot-x': `${spot.x}%`,
                      '--spot-y': `${spot.y}%`,
                    } as React.CSSProperties
                  }
                  className={`group relative w-full flex-1 rounded-xl p-4 border flex flex-col justify-between gap-3.5 text-left overflow-hidden transition-all duration-200 ${
                    justUnlocked
                      ? 'bg-gradient-to-b from-[#174a36] to-[#0d2d21] border-2 border-[#E7B94F] misi-unlock-burst'
                      : isActiveCurrent
                      ? 'bg-gradient-to-b from-[#1a4c38] via-[#143d2c] to-[#0c2b1f] border-2 border-[#E7B94F] md:-translate-y-1.5 misi-active-glow hover:-translate-y-2'
                      : p.done
                      ? 'bg-gradient-to-b from-[#133a2b] to-[#0c271d] border-[#c9a24b]/75 shadow-[inset_0_1px_0_rgba(244,235,208,0.12),0_10px_22px_rgba(2,10,8,0.45)] hover:-translate-y-1 hover:border-[#E7B94F]'
                      : 'bg-gradient-to-b from-[#071913] to-[#05110d] misi-classified-texture border-[#8a6a2f]/40 shadow-[inset_0_0_24px_rgba(0,0,0,0.55),0_0_16px_rgba(201,162,75,0.08)]'
                  }`}
                >
                  {/* Interactive Hover Spotlight on Unlocked/Completed Cards */}
                  {!isLocked && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{
                        background: isActiveCurrent
                          ? 'radial-gradient(circle 140px at var(--spot-x, 50%) var(--spot-y, 30%), rgba(231,185,79,0.22), transparent 72%)'
                          : 'radial-gradient(circle 120px at var(--spot-x, 50%) var(--spot-y, 30%), rgba(201,162,75,0.14), transparent 72%)',
                      }}
                    />
                  )}

                  {/* Subtle Metallic Shine on Completed Cards */}
                  {p.done && (
                    <span
                      aria-hidden="true"
                      className="hq-medal-glint pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#f4ebd0]/14 to-transparent"
                    />
                  )}

                  {/* Top Content: Tag + Badge + Title + Description */}
                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`font-mono-tabular text-[11px] font-bold tracking-wider ${
                          isLocked ? 'text-[#c9a24b]/75' : 'text-[#c9a24b]'
                        }`}
                      >
                        {p.shortTag}
                      </span>

                      {p.done && (
                        <span className="hq-brass-plaque inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono-tabular text-[9px] font-extrabold tracking-wider text-[#202923] shrink-0 shadow-sm">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          VERIFIED
                        </span>
                      )}

                      {isActiveCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E7B94F] text-[#0b2a21] font-mono-tabular text-[9px] font-extrabold tracking-wider shadow-sm shrink-0">
                          <Sparkles className="w-2.5 h-2.5" />
                          MISI AKTIF
                        </span>
                      )}

                      {isLocked && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#8a6a2f]/50 bg-[#0b2219] text-[#c9a24b]/85 font-mono-tabular text-[9px] font-bold tracking-wider shrink-0">
                          RAHSIA / TERKUNCI
                        </span>
                      )}
                    </div>

                    <h3
                      className={`font-display text-base lg:text-[17px] font-bold leading-snug ${
                        isLocked ? 'text-[#d9d0b8]' : 'text-[#f4ebd0]'
                      }`}
                    >
                      {p.title}
                    </h3>

                    <p
                      className={`text-xs sm:text-[13px] leading-relaxed ${
                        isLocked ? 'text-[#899b90]' : 'text-[#b7c7bc]'
                      }`}
                    >
                      {p.desc}
                    </p>
                  </div>

                  {/* Bottom Status & Action */}
                  <div className="relative z-10 space-y-2.5 pt-2 border-t border-[#8a6a2f]/25">
                    <p
                      className={`text-xs font-bold leading-snug ${
                        p.done
                          ? 'text-[#52c98e]'
                          : isActiveCurrent
                          ? 'text-[#E7B94F]'
                          : 'text-[#899b90]'
                      }`}
                    >
                      {p.status}
                    </p>

                    {p.unlocked ? (
                      <button
                        type="button"
                        onClick={() => handleActionClick(p)}
                        className={`w-full px-3 min-h-[44px] rounded-xl text-sm font-bold inline-flex items-center justify-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4ebd0] ${
                          isActiveCurrent
                            ? 'hq-brass-plaque text-[#202923] border border-[#fff2c6]/60 shadow-[0_8px_20px_rgba(201,162,75,0.35)] hover:brightness-105 hover:-translate-y-0.5'
                            : 'bg-[#0a251c] hover:bg-[#174634] text-[#f4ebd0] border border-[#8a6a2f]/80 hover:border-[#E7B94F]'
                        }`}
                      >
                        <span>{p.done ? 'Semak' : 'Buka Misi'}</span>
                        {isActiveCurrent && <ArrowRight className="w-4 h-4" />}
                      </button>
                    ) : (
                      <div className="w-full min-h-[44px] rounded-xl bg-[#0b1f18] border border-[#8a6a2f]/40 flex items-center justify-center gap-1.5 text-xs font-bold text-[#a8b7a6]">
                        <Lock className="w-3.5 h-3.5 text-[#c9a24b]/80 misi-padlock-sway" />
                        <span>Terkunci</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          MOBILE VERTICAL TIMELINE (< md)
         ===================================================================== */}
      <div className="md:hidden relative pl-4 space-y-4">
        <div
          aria-hidden="true"
          className="absolute left-[1.6rem] top-5 bottom-5 w-0.5 bg-gradient-to-b from-[#E7B94F] via-[#c9a24b]/65 to-[#8a6a2f]/25"
        />
        {phases.map((p) => {
          const isActiveCurrent = p.unlocked && !p.done;
          const isLocked = !p.unlocked;
          return (
            <div key={p.level} className="relative flex items-start gap-3.5">
              <div
                className={`relative z-10 mt-3 w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 ${
                  p.done
                    ? 'bg-[#c9a24b] border-[#f4ebd0] text-[#202923] shadow-[0_0_14px_rgba(231,185,79,0.5)]'
                    : isActiveCurrent
                    ? 'bg-[#15402f] border-[#E7B94F] text-[#E7B94F] hq-node-pulse'
                    : 'bg-[#091c15] border-[#8a6a2f]/45 text-[#899b90]'
                }`}
              >
                {p.done ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isActiveCurrent ? (
                  <Compass className="w-4 h-4 misi-compass-spin" />
                ) : (
                  <Lock className="w-3.5 h-3.5 misi-padlock-sway" />
                )}
              </div>

              <div
                className={`flex-1 rounded-xl p-4 border transition-all ${
                  isActiveCurrent
                    ? 'bg-gradient-to-b from-[#1a4c38] to-[#0e2d21] border-2 border-[#E7B94F] shadow-[0_10px_24px_rgba(231,185,79,0.22)]'
                    : p.done
                    ? 'bg-[#133a2b]/95 border-[#c9a24b]/75'
                    : 'bg-[#071913] misi-classified-texture border-[#8a6a2f]/40'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <p className="font-mono-tabular text-xs font-bold text-[#c9a24b]">{p.shortTag}</p>
                  {p.done && (
                    <span className="hq-brass-plaque inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono-tabular text-[10px] font-extrabold text-[#202923]">
                      <ShieldCheck className="w-3 h-3" />
                      VERIFIED
                    </span>
                  )}
                  {isActiveCurrent && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E7B94F] text-[#0b2a21] font-mono-tabular text-[10px] font-extrabold">
                      MISI AKTIF
                    </span>
                  )}
                  {isLocked && (
                    <span className="px-2 py-0.5 rounded border border-[#8a6a2f]/50 bg-[#0b2219] text-[#c9a24b]/85 font-mono-tabular text-[10px] font-bold">
                      RAHSIA / TERKUNCI
                    </span>
                  )}
                </div>

                <h3 className="font-display text-lg font-bold text-[#f4ebd0]">{p.title}</h3>
                <p className="text-sm text-[#b7c7bc] mt-1 leading-relaxed">{p.desc}</p>

                <div className="mt-3 pt-2.5 border-t border-[#8a6a2f]/25 flex items-center justify-between gap-3">
                  <p
                    className={`text-xs font-bold ${
                      p.done
                        ? 'text-[#52c98e]'
                        : isActiveCurrent
                        ? 'text-[#E7B94F]'
                        : 'text-[#899b90]'
                    }`}
                  >
                    {p.status}
                  </p>

                  {p.unlocked ? (
                    <button
                      type="button"
                      onClick={() => handleActionClick(p)}
                      className={`px-4 min-h-[44px] rounded-xl text-sm font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                        isActiveCurrent
                          ? 'hq-brass-plaque text-[#202923] shadow-md'
                          : 'bg-[#0b2a21] text-[#f4ebd0] border border-[#8a6a2f]'
                      }`}
                    >
                      <span>{p.done ? 'Semak' : 'Buka Misi'}</span>
                      {isActiveCurrent && <ArrowRight className="w-4 h-4" />}
                    </button>
                  ) : (
                    <span
                      aria-label="Fasa terkunci"
                      className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#0b1f18] border border-[#8a6a2f]/40 text-[#a8b7a6] shrink-0"
                    >
                      <Lock className="w-4 h-4 misi-padlock-sway" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
