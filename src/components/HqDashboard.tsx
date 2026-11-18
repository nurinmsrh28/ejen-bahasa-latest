import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  ChevronDown,
  Download,
  FileCode2,
  FileText,
  FolderSearch,
  Lock,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserCog,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import latarAkademiImg from '../assets/images/secret_academy_school_1794825908324.jpg';
import { BADGES, LOCATIONS } from '../game/data';
import {
  getAgentRank,
  getCompletedLocationsCount,
  getEarnedBadgeIds,
  getOverallProgressPercent,
  getUnlockedPhaseLevel,
  isPhase1Complete,
  isPhase2Complete,
  isPhase3Complete,
  isPhase4Complete,
} from '../game/rules';
import type { AppScreen, AuthUser, GameState, LocationId } from '../game/types';
import { AgentIdCard } from './AgentIdCard';
import { BadgeIconSvg } from './DetectiveArt';
import { MissionStatusSection } from './MissionStatusSection';
import { PetaOperasiSection } from './PetaOperasiSection';

interface HqDashboardProps {
  state: GameState;
  authUser: AuthUser;
  onNavigatePhase: (screen: AppScreen, locationId?: LocationId) => void;
  onOpenEvidenceDrawer: () => void;
  onOpenDecisionDrawer: () => void;
  onExportJson: () => void;
  onResetGame: () => void;
  onLogout: () => void;
}

// Reuses the exact original uploaded Profesor Nurin photograph
const PROF_NURIN_PHOTO =
  '/assets/aistudio/Professor_Detective_in_the_Investigation_Office_54081002.png';

// Session-scoped snapshot key to prevent false completion celebrations on page refresh
const CELEBRATION_SNAPSHOT_PREFIX = 'ejen_hq_celebration_snapshot_v1:';
const HOLD_RESET_DURATION_MS = 3000;

interface RankProgressInfo {
  currentRank: string;
  nextRank: string | null;
  percent: number;
  label: string;
}

function getRankXpProgress(xp: number, finalReportSaved: boolean): RankProgressInfo {
  // Uses existing getAgentRank thresholds (250 / 600 / 1000 XP or finalReportSaved) without modifying rules.ts
  const currentRank = getAgentRank(xp, finalReportSaved);
  if (finalReportSaved || xp >= 1000) {
    return {
      currentRank,
      nextRank: null,
      percent: 100,
      label: `${xp} XP · Pangkat Tertinggi Tercapai`,
    };
  }
  if (xp < 250) {
    return {
      currentRank,
      nextRank: 'Ejen Penyiasat',
      percent: Math.min(100, Math.round((xp / 250) * 100)),
      label: `${xp} / 250 XP menuju Ejen Penyiasat`,
    };
  }
  if (xp < 600) {
    return {
      currentRank,
      nextRank: 'Ejen Pakar',
      percent: Math.min(100, Math.round(((xp - 250) / 350) * 100)),
      label: `${xp} / 600 XP menuju Ejen Pakar`,
    };
  }
  return {
    currentRank,
    nextRank: 'Arkitek Sekolah Impian',
    percent: Math.min(100, Math.round(((xp - 600) / 400) * 100)),
    label: `${xp} / 1000 XP menuju Arkitek Sekolah Impian`,
  };
}

const SPARKLE_PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const dist = 75 + ((i * 29) % 115);
  return {
    id: i,
    tx: `${Math.round(Math.cos(angle) * dist)}px`,
    ty: `${Math.round(Math.sin(angle) * dist - 35)}px`,
    delay: `${(i % 5) * 0.06}s`,
    dur: `${1.15 + (i % 4) * 0.18}s`,
    size: i % 3 === 0 ? 10 : 7,
  };
});

export function HqDashboard({
  state,
  authUser,
  onNavigatePhase,
  onOpenEvidenceDrawer,
  onOpenDecisionDrawer,
  onExportJson,
  onResetGame,
  onLogout,
}: HqDashboardProps) {
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);
  const [portraitFailed, setPortraitFailed] = useState(false);
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Track highlighted map location for the floating dossier panel (defaults to first uncompleted location)
  const [selectedLocId, setSelectedLocId] = useState<LocationId>(() => {
    const nextOpen = LOCATIONS.find((l) => !state.investigations[l.id].completed);
    return nextOpen ? nextOpen.id : LOCATIONS[0].id;
  });

  // Celebration sparkles & newly unlocked badges
  const [showSparkles, setShowSparkles] = useState(false);
  const [newlyEarnedIds, setNewlyEarnedIds] = useState<string[]>([]);
  const [phaseBannerMsg, setPhaseBannerMsg] = useState<string | null>(null);

  // 3-second hold-to-confirm reset state (with circular countdown ring)
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHoldingReset, setIsHoldingReset] = useState(false);
  const holdRafRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);

  // Reuses existing game state selectors & scoring calculations from src/game/rules.ts
  const completedCount = getCompletedLocationsCount(state);
  const unlockedLevel = getUnlockedPhaseLevel(state);
  const progressPercent = getOverallProgressPercent(state);
  const earnedBadges = getEarnedBadgeIds(state);
  const rank = getAgentRank(state.xp, state.finalReportSaved);
  const rankProgress = getRankXpProgress(state.xp, state.finalReportSaved);

  // Reuses existing profile and authentication data bindings
  const activeProfile = state.profile || authUser.profile;
  const displayName = activeProfile?.name || authUser.username;
  const agentRef = activeProfile?.agentId || authUser.referenceNo;

  // Preserves exact original "Arahan Profesor Nurin" instruction texts per unlockedLevel
  const nurinInstruction = useMemo(() => {
    if (unlockedLevel === 1) {
      return `Pilih mana-mana daripada 4 lokasi di Peta Operasi untuk memulakan penyiasatan (${completedCount}/4 selesai).`;
    }
    if (unlockedLevel === 2) {
      return 'Keempat-empat lokasi telah selesai disiasat! Buka Makmal Analisis Kes untuk memilih bukti terbaik.';
    }
    if (unlockedLevel === 3) {
      return 'Ayat pendapat anda sangat baik! Uji kekuatan alasan dalam Buktikan Teori Ejen.';
    }
    if (unlockedLevel === 4) {
      return 'Semua bukti dan hujah lengkap. Masuk ke Studio Arkitek untuk merancang Pelan Sekolah Impian!';
    }
    return 'Pelan Sekolah Impian telah dibina. Lengkapkan Laporan Sekolah Impian sebagai produk akhir!';
  }, [unlockedLevel, completedCount]);

  // Refined typewriter reveal animation (respects prefers-reduced-motion)
  const [typedInstruction, setTypedInstruction] = useState(nurinInstruction);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setTypedInstruction(nurinInstruction);
      return;
    }

    setTypedInstruction('');
    let idx = 0;
    const timer = window.setInterval(() => {
      idx += 1;
      setTypedInstruction(nurinInstruction.slice(0, idx));
      if (idx >= nurinInstruction.length) {
        window.clearInterval(timer);
      }
    }, 18);

    return () => window.clearInterval(timer);
  }, [nurinInstruction]);

  // Slow ambient parallax on background only (respects prefers-reduced-motion)
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) return;

    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 12;
      const ny = (e.clientY / window.innerHeight - 0.5) * 9;
      setParallaxOffset({ x: -nx, y: -ny });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Optional browser SpeechSynthesis support (Malay language fallback)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSupported(true);
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Trigger celebration sparkles & completion notice ONLY when transitioning incomplete -> complete
  useEffect(() => {
    const completedPhasesCount = [
      isPhase1Complete(state),
      isPhase2Complete(state),
      isPhase3Complete(state),
      isPhase4Complete(state),
      state.finalReportSaved,
    ].filter(Boolean).length;

    const snapshotKey = `${CELEBRATION_SNAPSHOT_PREFIX}${authUser.username}`;
    try {
      const rawPrev = window.sessionStorage.getItem(snapshotKey);
      if (rawPrev) {
        const prev = JSON.parse(rawPrev) as {
          badges: string[];
          phases: number;
        };
        const freshBadges = earnedBadges.filter((id) => !prev.badges.includes(id));
        const gainedPhase = completedPhasesCount > prev.phases;

        if (freshBadges.length > 0 || gainedPhase) {
          setNewlyEarnedIds(freshBadges);
          setPhaseBannerMsg(
            freshBadges.length > 0
              ? 'Tahniah, Ejen! Lencana baharu telah dibuka di dalam koleksi anda.'
              : 'Misi selesai! Peringkat penyiasatan seterusnya kini dibuka.'
          );

          const prefersReduced =
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (!prefersReduced) {
            setShowSparkles(true);
          }

          window.sessionStorage.setItem(
            snapshotKey,
            JSON.stringify({ badges: earnedBadges, phases: completedPhasesCount })
          );

          const hideTimer = window.setTimeout(() => {
            setShowSparkles(false);
            setPhaseBannerMsg(null);
          }, 3600);
          return () => window.clearTimeout(hideTimer);
        }
      }
      window.sessionStorage.setItem(
        snapshotKey,
        JSON.stringify({ badges: earnedBadges, phases: completedPhasesCount })
      );
    } catch {
      // Ignore sessionStorage access errors gracefully
    }
  }, [authUser.username, earnedBadges, state]);

  // Escape key closes Digital Agent ID modal
  useEffect(() => {
    if (!idModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIdModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [idModalOpen]);

  // Cleanup hold-to-reset RAF on unmount
  useEffect(() => {
    return () => {
      if (holdRafRef.current !== null) {
        window.cancelAnimationFrame(holdRafRef.current);
      }
    };
  }, []);

  const handleToggleVoiceBrief = () => {
    if (!speechSupported) return;
    const synth = window.speechSynthesis;
    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(nurinInstruction);
    const voices = synth.getVoices();
    const malayVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith('ms')) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('id'));
    if (malayVoice) utterance.voice = malayVoice;
    utterance.lang = malayVoice?.lang || 'ms-MY';
    utterance.rate = 0.96;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    synth.speak(utterance);
  };

  // Preserves original handleContinueAdventure navigation destination logic
  const handleContinueAdventure = () => {
    if (unlockedLevel === 1) {
      const nextLoc = LOCATIONS.find((l) => !state.investigations[l.id].completed) || LOCATIONS[0];
      onNavigatePhase('phase1', nextLoc.id);
    } else if (unlockedLevel === 2) {
      onNavigatePhase('phase2');
    } else if (unlockedLevel === 3) {
      onNavigatePhase('phase3');
    } else if (unlockedLevel === 4) {
      onNavigatePhase('phase4');
    } else {
      onNavigatePhase('phase5');
    }
  };

  const cancelHoldReset = () => {
    if (holdRafRef.current !== null) {
      window.cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
    setIsHoldingReset(false);
    setHoldProgress(0);
  };

  const startHoldReset = () => {
    if (isHoldingReset) return;
    setIsHoldingReset(true);
    holdStartRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - holdStartRef.current;
      const pct = Math.min(100, (elapsed / HOLD_RESET_DURATION_MS) * 100);
      setHoldProgress(pct);
      if (elapsed >= HOLD_RESET_DURATION_MS) {
        holdRafRef.current = null;
        setIsHoldingReset(false);
        setHoldProgress(0);
        setTeacherOpen(false);
        // Calls the exact original onResetGame handler after 3s hold completion
        onResetGame();
        return;
      }
      holdRafRef.current = window.requestAnimationFrame(tick);
    };

    holdRafRef.current = window.requestAnimationFrame(tick);
  };

  // Preserves original 5-phase progression definitions & unlock checks
  const phases = [
    {
      level: 1,
      screen: 'phase1' as AppScreen,
      shortTag: 'FASA 1',
      title: 'Operasi Jejak Bukti',
      desc: 'Siasat 4 lokasi di Sekolah Seri Bestari dan kumpulkan bukti persekitaran.',
      status: isPhase1Complete(state)
        ? 'Selesai (4/4 Lokasi)'
        : `${completedCount}/4 Lokasi Selesai`,
      unlocked: true,
      done: isPhase1Complete(state),
    },
    {
      level: 2,
      screen: 'phase2' as AppScreen,
      shortTag: 'FASA 2',
      title: 'Makmal Analisis Kes',
      desc: 'Pilih 2–3 bukti utama di papan penyiasatan dan bina ayat pendapat anda.',
      status: isPhase2Complete(state)
        ? 'Selesai'
        : isPhase1Complete(state)
        ? 'Terbuka'
        : 'Terkunci · Selesaikan Fasa 1',
      unlocked: isPhase1Complete(state),
      done: isPhase2Complete(state),
    },
    {
      level: 3,
      screen: 'phase3' as AppScreen,
      shortTag: 'FASA 3',
      title: 'Buktikan Teori Ejen',
      desc: 'Kuasai cabaran alasan relevan dan tuliskan hujah sokongan bagi pendapat anda.',
      status: isPhase3Complete(state)
        ? 'Selesai'
        : isPhase2Complete(state)
        ? 'Terbuka'
        : 'Terkunci · Selesaikan Fasa 2',
      unlocked: isPhase2Complete(state),
      done: isPhase3Complete(state),
    },
    {
      level: 4,
      screen: 'phase4' as AppScreen,
      shortTag: 'CABARAN AKHIR',
      title: 'Studio Arkitek',
      desc: 'Reka Pelan Sekolah Impian dengan School Builder dan pautkan justifikasi bukti.',
      status: isPhase4Complete(state)
        ? 'Selesai'
        : isPhase3Complete(state)
        ? 'Terbuka'
        : 'Terkunci · Selesaikan Fasa 3',
      unlocked: isPhase3Complete(state),
      done: isPhase4Complete(state),
    },
    {
      level: 5,
      screen: 'phase5' as AppScreen,
      shortTag: 'PRODUK AKHIR',
      title: 'Laporan Sekolah Impian',
      desc: 'Tulis laporan pendapat 3–5 ayat, pratonton dan cetak hasil rasmi.',
      status: state.finalReportSaved
        ? 'Selesai · Laporan Disimpan'
        : isPhase4Complete(state)
        ? 'Terbuka'
        : 'Terkunci · Selesaikan Studio Arkitek',
      unlocked: isPhase4Complete(state),
      done: state.finalReportSaved,
    },
  ];

  // Circular countdown geometry for 3s hold-to-reset button
  const ringRadius = 15;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference * (1 - holdProgress / 100);
  const remainingHoldSeconds = Math.max(
    1,
    Math.ceil(((100 - holdProgress) / 100) * (HOLD_RESET_DURATION_MS / 1000))
  );

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-x-clip">
      {/* 03. BACKGROUND – CINEMATIC INVESTIGATION ENVIRONMENT (reuses latar_akademi darkened & blurred on bg layer only) */}
      <div
        aria-hidden="true"
        className="no-print fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0b2a21]"
      >
        {!bgFailed ? (
          <div
            className="w-full h-full will-change-transform transition-transform duration-700 ease-out"
            style={{
              transform: `translate3d(${parallaxOffset.x}px, ${parallaxOffset.y}px, 0) scale(1.07)`,
            }}
          >
            <img
              src={latarAkademiImg}
              alt=""
              onError={() => setBgFailed(true)}
              className="w-full h-full object-cover object-center brightness-[0.34] contrast-[1.08] blur-[3px]"
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0b2a21] via-[#15402f] to-[#202923]" />
        )}

        {/* Deep Emerald Colour Grading, Soft Vignette & Subtle Atmospheric Lighting */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 55% at 50% 16%, rgba(21, 64, 47, 0.44) 0%, rgba(11, 42, 33, 0.80) 64%, rgba(11, 30, 24, 0.94) 100%)',
          }}
        />
      </div>

      {/* Subtle Gold Sparkles (only triggered on genuine phase/badge completion) */}
      {showSparkles && (
        <div
          aria-hidden="true"
          className="no-print pointer-events-none fixed inset-x-0 top-28 z-50 flex justify-center"
        >
          <div className="relative w-1 h-1">
            {SPARKLE_PARTICLES.map((p) => (
              <span
                key={p.id}
                className="hq-sparkle-piece absolute block rounded-full bg-[#c9a24b] shadow-[0_0_8px_rgba(201,162,75,0.85)]"
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
        </div>
      )}

      {/* Main Headquarters Layout Container (CSS Focus Selector Target) */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-[calc(3.5rem+env(safe-area-inset-bottom))] space-y-9 text-[#f4ebd0]">
        {/* Genuine Mission Completion Notification Banner */}
        {phaseBannerMsg && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl bg-[#15402f] border border-[#c9a24b] px-5 py-3.5 shadow-lg flex items-center gap-3 text-base font-semibold text-[#f4ebd0]"
          >
            <Sparkles className="w-5 h-5 text-[#c9a24b] shrink-0" />
            <span>{phaseBannerMsg}</span>
          </div>
        )}

        {/* 06. HERO SECTION – MISSION COMMAND CENTRE (Dark Emerald Leather Folio + Warm Ivory Briefing Paper) */}
        <section
          aria-label="Pusat Arahan Misi Ejen"
          className="hq-stage-1 hq-leather-folio relative rounded-2xl border border-[#8a6a2f]/75 overflow-hidden"
        >
          {/* Top Engraved Brass & Emerald Classification Strip */}
          <div className="bg-[#081f18]/90 px-5 sm:px-7 py-3 border-b border-[#8a6a2f]/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm font-mono-tabular">
              <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#c9a24b]">
                <ShieldCheck className="w-4 h-4 text-[#c9a24b]" />
                {authUser.accessStatus}
              </span>
              <span aria-hidden="true" className="text-[#8a6a2f]">
                ·
              </span>
              <span className="text-[#f4ebd0] font-semibold">{authUser.organization}</span>
              <span aria-hidden="true" className="text-[#8a6a2f]">
                ·
              </span>
              <span className="text-[#a8b7a6]">
                NO. RUJUKAN: <strong className="text-[#f4ebd0]">{agentRef}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-[#202923] hover:bg-[#49221b] border border-[#8a6a2f]/70 text-xs sm:text-sm font-bold text-[#f4ebd0] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
            >
              <LogOut className="w-4 h-4 text-[#c9a24b]" />
              <span>Log Keluar</span>
            </button>
          </div>

          <div className="p-6 sm:p-8 lg:p-9 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Original Profesor Nurin Photo in Antique Brass Mentor Frame */}
            <div className="lg:col-span-4 flex flex-col items-center text-center gap-3.5">
              <div className="relative p-2 rounded-t-[6rem] rounded-b-2xl bg-gradient-to-b from-[#c9a24b] via-[#8a6a2f] to-[#57411c] shadow-[0_18px_38px_rgba(0,0,0,0.65)]">
                <div className="w-44 h-52 sm:w-52 sm:h-60 rounded-t-[5.4rem] rounded-b-xl overflow-hidden bg-[#15402f] border-2 border-[#202923]">
                  {!portraitFailed ? (
                    <img
                      src={PROF_NURIN_PHOTO}
                      alt="Profesor Nurin, Pembimbing HQ Akademi Ejen Bahasa"
                      referrerPolicy="no-referrer"
                      onError={() => setPortraitFailed(true)}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#15402f] text-[#c9a24b] px-4">
                      <span className="font-display text-3xl font-bold">PN</span>
                      <span className="text-sm text-[#f4ebd0] mt-1">Profesor Nurin</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Brass Nameplate */}
              <div className="hq-brass-plaque px-4 py-1.5 rounded border border-[#f4ebd0]/30">
                <p className="font-mono-tabular text-xs font-extrabold tracking-widest uppercase text-[#202923]">
                  PROFESOR NURIN · PEMBIMBING HQ
                </p>
              </div>

              {speechSupported && (
                <button
                  type="button"
                  onClick={handleToggleVoiceBrief}
                  className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl bg-[#15402f] hover:bg-[#1b4e3a] border border-[#8a6a2f] text-sm font-semibold text-[#f4ebd0] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-4 h-4 text-[#c9a24b]" />
                      <span>HENTI SUARA</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-[#c9a24b]" />
                      <span>DENGAR ARAHAN</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Right Column: Command Summary, Ivory Briefing Document, Progress & Actions */}
            <div className="lg:col-span-8 space-y-5">
              <div className="space-y-1.5">
                <p className="font-mono-tabular text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-[#c9a24b]">
                  FAIL KES: OP-SB-2026 · {activeProfile?.codenameBadge || 'Anggota Penyiasat'} ·{' '}
                  {rank}
                </p>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#f4ebd0] leading-tight">
                  SELAMAT KEMBALI, EJEN!
                </h1>
                <p className="text-base text-[#a8b7a6] leading-relaxed">
                  Anggota Aktif: <strong className="text-[#f4ebd0]">{displayName}</strong>
                  {activeProfile?.className ? ` · Kelas ${activeProfile.className}` : ''} —
                  Kemajuan operasi kini pada tahap{' '}
                  <strong className="text-[#c9a24b] font-mono-tabular">{progressPercent}%</strong>.
                </p>
              </div>

              {/* Classified Warm Ivory Briefing Paper Sheet: "Arahan Profesor Nurin" */}
              <div className="hq-ivory-paper relative rounded-xl border border-[#8a6a2f]/60 p-4 sm:p-5 text-[#202923]">
                <div className="flex items-center justify-between gap-2 border-b border-[#8a6a2f]/30 pb-2 mb-2.5">
                  <span className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#8a6a2f]">
                    Arahan Profesor Nurin
                  </span>
                  <span className="font-mono-tabular text-[11px] font-bold uppercase tracking-widest text-[#8a6a2f] border border-[#8a6a2f]/50 px-2 py-0.5 rounded-sm">
                    SULIT · HQ
                  </span>
                </div>
                <p className="text-base sm:text-lg font-medium text-[#202923] leading-relaxed min-h-[3.2rem]">
                  {typedInstruction}
                  {typedInstruction.length < nurinInstruction.length && (
                    <span
                      aria-hidden="true"
                      className="inline-block w-2 h-4 ml-1 bg-[#8a6a2f] align-middle animate-pulse"
                    />
                  )}
                </p>
              </div>

              {/* Operation & Rank XP Gauges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-[#071e17]/90 border border-[#8a6a2f]/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-mono-tabular">
                    <span className="text-[#a8b7a6]">Kemajuan Keseluruhan Operasi</span>
                    <span className="font-bold text-[#c9a24b]">{progressPercent}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-[#202923] border border-[#8a6a2f]/40 overflow-hidden">
                    <div
                      className="h-full bg-[#c9a24b] transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-[#071e17]/90 border border-[#8a6a2f]/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-mono-tabular">
                    <span className="text-[#a8b7a6] truncate pr-2">{rankProgress.label}</span>
                    <span className="font-bold text-[#c9a24b] shrink-0">
                      {rankProgress.percent}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-[#202923] border border-[#8a6a2f]/40 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#8a6a2f] via-[#c9a24b] to-[#f4ebd0] transition-all duration-300"
                      style={{ width: `${rankProgress.percent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Primary CTA + Compact Tactile Secondary Controls */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleContinueAdventure}
                  className="hq-brass-plaque inline-flex items-center justify-center gap-2.5 px-7 min-h-[52px] rounded-xl text-[#202923] font-display font-bold text-base sm:text-lg border border-[#f4ebd0]/50 shadow-[0_12px_28px_rgba(201,162,75,0.34)] transition-transform duration-150 hover:-translate-y-0.5 hover:brightness-105 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4ebd0]"
                >
                  <span>SAMBUNG PENGEMBARAAN</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigatePhase('profile')}
                  className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl bg-[#15402f] hover:bg-[#1b4e3a] border border-[#8a6a2f]/75 text-sm font-semibold text-[#f4ebd0] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
                >
                  <UserCog className="w-4 h-4 text-[#c9a24b]" />
                  <span>
                    {activeProfile?.agentId ? 'Kemaskini Identiti Ejen' : 'Daftar Identiti Ejen'}
                  </span>
                </button>

                {activeProfile?.agentId && (
                  <button
                    type="button"
                    onClick={() => setIdModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl bg-[#15402f] hover:bg-[#1b4e3a] border border-[#8a6a2f]/75 text-sm font-semibold text-[#f4ebd0] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
                  >
                    <BadgeCheck className="w-4 h-4 text-[#c9a24b]" />
                    <span>Kad Identiti Digital</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenEvidenceDrawer}
                  className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl bg-[#202923] hover:bg-[#2a362e] border border-[#8a6a2f]/60 text-sm font-semibold text-[#f4ebd0] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
                >
                  <FolderSearch className="w-4 h-4 text-[#c9a24b]" />
                  <span>Fail Bukti Ejen</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenDecisionDrawer}
                  className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl bg-[#202923] hover:bg-[#2a362e] border border-[#8a6a2f]/60 text-sm font-semibold text-[#f4ebd0] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
                >
                  <FileText className="w-4 h-4 text-[#c9a24b]" />
                  <span>Kad Keputusan Ejen</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 07. SCHOOL INVESTIGATION MAP – LIVE TACTICAL RADAR TABLE & CLASSIFIED CASE FILE */}
        <PetaOperasiSection
          state={state}
          completedCount={completedCount}
          selectedLocId={selectedLocId}
          onSelectLocId={setSelectedLocId}
          onNavigatePhase={onNavigatePhase}
        />

        {/* 08. OPERATION PROGRESSION – ANIMATED DETECTIVE TIMELINE & FIVE PHASE CARDS */}
        <MissionStatusSection
          phases={phases}
          unlockedLevel={unlockedLevel}
          xp={state.xp}
          soundEnabled={state.soundEnabled}
          onNavigatePhase={onNavigatePhase}
        />

        {/* 09. AGENT ACHIEVEMENTS – DARK VELVET MEDAL PRESENTATION COLLECTION */}
        <section
          aria-label="Lencana Ejen"
          className="hq-stage-3 hq-velvet-tray relative rounded-2xl border border-[#8a6a2f]/75 p-5 sm:p-7 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#8a6a2f]/40 pb-4">
            <div>
              <p className="font-mono-tabular text-xs font-bold uppercase tracking-[0.18em] text-[#c9a24b]">
                KOTAK PINGAT KEHORMATAN AKADEMI
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#f4ebd0]">
                LENCANA EJEN
              </h2>
            </div>
            <span className="inline-flex items-center gap-2 font-mono-tabular text-sm sm:text-base font-bold text-[#c9a24b]">
              <Award className="w-5 h-5" />
              {earnedBadges.length} / {BADGES.length} Diperoleh
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {BADGES.map((badge) => {
              const earned = earnedBadges.includes(badge.id);
              const isNew = newlyEarnedIds.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`relative overflow-hidden rounded-xl p-4 border flex flex-col items-center text-center gap-3 ${
                    earned
                      ? 'bg-[#15402f]/90 border-[#c9a24b] shadow-[0_12px_28px_rgba(0,0,0,0.5)]'
                      : 'bg-[#081b15]/90 border-[#8a6a2f]/35'
                  } ${isNew ? 'hq-badge-pop' : ''}`}
                >
                  {/* Gentle Metallic Reflection Glint on Earned Medals */}
                  {earned && (
                    <div
                      aria-hidden="true"
                      className="hq-medal-glint pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#f4ebd0]/25 to-transparent"
                    />
                  )}

                  {isNew && (
                    <span className="inline-flex items-center gap-1 font-mono-tabular text-[11px] font-bold uppercase tracking-wider text-[#c9a24b]">
                      <Sparkles className="w-3.5 h-3.5" />
                      BAHARU
                    </span>
                  )}

                  {/* Brass or Bronze Medal Frame */}
                  <div
                    className={`relative rounded-full p-2.5 ${
                      earned
                        ? 'bg-gradient-to-b from-[#d8b566] via-[#c9a24b] to-[#8a6a2f] shadow-[0_6px_18px_rgba(201,162,75,0.35)]'
                        : 'bg-[#202923] border-2 border-[#8a6a2f]/45 opacity-60 grayscale'
                    }`}
                  >
                    <div className="rounded-full bg-[#0b2a21] p-1">
                      <BadgeIconSvg badgeId={badge.id} earned={earned} className="w-14 h-14" />
                    </div>
                    {!earned && (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#202923] border border-[#8a6a2f] flex items-center justify-center text-[#a8b7a6]"
                      >
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Engraved Plaque Title + Requirement */}
                  <div className="space-y-1.5 w-full">
                    <div
                      className={`px-2 py-1 rounded ${
                        earned ? 'hq-brass-plaque text-[#202923]' : 'bg-[#202923] text-[#a8b7a6]'
                      }`}
                    >
                      <p className="font-display text-sm font-bold leading-tight">{badge.name}</p>
                    </div>
                    <p
                      className={`text-sm leading-snug ${
                        earned ? 'text-[#f4ebd0]' : 'text-[#a8b7a6]'
                      }`}
                    >
                      {badge.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 11. TEACHER AND DATA MANAGEMENT – COLLAPSIBLE RUANG GURU WITH 3S CIRCULAR HOLD-TO-RESET */}
        <section
          aria-label="Ruang Guru dan Pengurusan Data"
          className="hq-stage-4 rounded-2xl bg-[#202923]/92 border border-[#8a6a2f]/55 shadow-[0_16px_38px_rgba(2,10,8,0.55)] overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setTeacherOpen((prev) => !prev)}
            aria-expanded={teacherOpen}
            className="w-full px-5 sm:px-6 py-4 min-h-[56px] flex items-center justify-between gap-4 text-left hover:bg-[#15402f]/45 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
          >
            <div>
              <p className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#c9a24b]">
                FAIL REKOD & ARKIB KES
              </p>
              <h2 className="font-display text-xl font-bold text-[#f4ebd0]">
                RUANG GURU
              </h2>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#c9a24b] shrink-0">
              <span>{teacherOpen ? 'Tutup' : 'Buka'}</span>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${teacherOpen ? 'rotate-180' : ''}`}
              />
            </span>
          </button>

          {teacherOpen && (
            <div className="px-5 sm:px-6 pb-6 pt-3 border-t border-[#8a6a2f]/35 space-y-5 bg-[#0b2a21]/85">
              <p className="text-base text-[#f4ebd0] leading-relaxed">
                Kemajuan murid disimpan secara automatik dalam storan setempat pelayar. Gunakan
                kawalan di bawah untuk mengeksport rekod, memuat turun fail kendiri, atau
                menetapkan semula operasi.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <button
                  type="button"
                  onClick={onExportJson}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 min-h-[48px] rounded-xl bg-[#15402f] hover:bg-[#1b4e3a] border border-[#8a6a2f]/75 text-[#f4ebd0] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
                >
                  <Download className="w-4 h-4 text-[#c9a24b]" />
                  <span>Eksport Rekod Murid (JSON)</span>
                </button>

                <a
                  href="/EJEN_BAHASA.html"
                  download="EJEN_BAHASA.html"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 min-h-[48px] rounded-xl bg-[#15402f] hover:bg-[#1b4e3a] text-[#f4ebd0] border border-[#8a6a2f]/75 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
                >
                  <FileCode2 className="w-4 h-4 text-[#c9a24b]" />
                  <span>Muat Turun Fail Kendiri (EJEN_BAHASA.html)</span>
                </a>

                {/* 3-Second Press-and-Hold Safeguard with Circular Countdown Ring */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onPointerDown={startHoldReset}
                    onPointerUp={cancelHoldReset}
                    onPointerLeave={cancelHoldReset}
                    onPointerCancel={cancelHoldReset}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                        e.preventDefault();
                        startHoldReset();
                      }
                    }}
                    onKeyUp={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        cancelHoldReset();
                      }
                    }}
                    aria-label="Tekan dan tahan selama 3 saat untuk menetapkan semula operasi"
                    className="w-full inline-flex items-center justify-center gap-3 px-4 min-h-[52px] rounded-xl bg-[#49231d] hover:bg-[#5c2b23] text-[#f4ebd0] border border-[#c9a24b]/60 text-sm font-bold select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4ebd0]"
                  >
                    {/* Visible Circular Countdown Progress Ring */}
                    <span className="relative inline-flex items-center justify-center w-9 h-9 shrink-0">
                      <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                        <circle
                          cx="18"
                          cy="18"
                          r={ringRadius}
                          fill="none"
                          stroke="rgba(244, 235, 208, 0.2)"
                          strokeWidth="3"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r={ringRadius}
                          fill="none"
                          stroke="#c9a24b"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringDashOffset}
                        />
                      </svg>
                      {isHoldingReset ? (
                        <span className="absolute font-mono-tabular text-xs font-extrabold text-[#f4ebd0]">
                          {remainingHoldSeconds}
                        </span>
                      ) : (
                        <RotateCcw className="absolute w-3.5 h-3.5 text-[#c9a24b]" />
                      )}
                    </span>

                    <span>
                      {isHoldingReset
                        ? `Menetapkan semula (${remainingHoldSeconds}s)...`
                        : 'Tetapkan Semula Operasi (Tahan 3s)'}
                    </span>
                  </button>
                  <p className="text-xs text-[#a8b7a6] leading-snug">
                    Tekan dan tahan butang selama 3 saat untuk memadam semua bukti dan memulakan
                    operasi semula. Lepaskan butang lebih awal untuk membatalkan.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 10. DIGITAL AGENT IDENTITY CARD MODAL (Interactive Holographic + Tilt Card) */}
        {idModalOpen && activeProfile && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Kad Identiti Rasmi Ejen"
            className="fixed inset-0 z-50 bg-[#051510]/82 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="w-full max-w-4xl space-y-3">
              <div className="no-print flex justify-end">
                <button
                  type="button"
                  onClick={() => setIdModalOpen(false)}
                  aria-label="Tutup Kad Identiti"
                  className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-[#0b2a21] border border-[#8a6a2f] text-sm font-semibold text-[#f4ebd0] shadow-lg hover:bg-[#15402f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
                >
                  <X className="w-4 h-4 text-[#c9a24b]" />
                  <span>Tutup</span>
                </button>
              </div>
              <AgentIdCard profile={activeProfile} rankLabel={rank} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
